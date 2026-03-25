import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl

    // ── Always pass through: static assets, Next internals, auth API ─────────
    // (these are already excluded by the matcher, but be explicit for clarity)

    // ── Decode JWT from cookie — zero DB interaction, fully edge-safe ─────────
    const token = await getToken({
        req,
        secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
    })

    const isLoggedIn = !!token
    const role = (token?.role as string) || ""
    const setupCompleted = token?.setupCompleted as boolean | undefined
    const tenantStatus = (token?.tenantStatus as string) || "ACTIVE"
    const subscriptionEnd = token?.subscriptionEnd
        ? new Date(token.subscriptionEnd as string)
        : null
    const planModules = (token?.planModules as string[]) || []
    const tier = (token?.subscriptionTier as string) || "STANDARD"

    // ── Host-based tenant resolution ──────────────────────────────────────────
    const hostname = req.headers.get("host") || ""
    const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || "localhost:3000"
    let tenantSlug: string | null = null

    if (hostname.endsWith(`.${baseDomain}`)) {
        const slug = hostname.replace(`.${baseDomain}`, "")
        if (!["super-admin", "super-login", "admin", "www", "api"].includes(slug)) {
            tenantSlug = slug
        }
    } else if (hostname !== baseDomain && !hostname.startsWith("localhost")) {
        tenantSlug = "CUSTOM_DOMAIN_HINT"
    }

    // ── Super-login lockdown ───────────────────────────────────────────────────
    const isDev = process.env.NODE_ENV === "development"
    if (pathname === "/super-login") {
        const accessKey = req.nextUrl.searchParams.get("access")
        if (accessKey !== "secure" && !isDev) {
            return NextResponse.redirect(new URL("/", req.nextUrl))
        }
        return NextResponse.next()
    }

    // ── Super-admin routes ────────────────────────────────────────────────────
    if (pathname.startsWith("/super-admin")) {
        if (!isLoggedIn) {
            return NextResponse.redirect(new URL("/super-login?access=secure", req.nextUrl))
        }
        if (role !== "GLOBAL_SUPER_ADMIN" && role !== "SUPER_ADMIN") {
            return NextResponse.redirect(new URL("/super-login?access=secure", req.nextUrl))
        }
        // Explicitly pass through — includes RSC fetches (_rsc=) and Server Action POSTs
        return NextResponse.next()
    }

    // ── Public auth routes ─────────────────────────────────────────────────────
    if (pathname.startsWith("/login") || pathname.startsWith("/api/auth")) {
        if (isLoggedIn) {
            return NextResponse.redirect(new URL("/dashboard", req.nextUrl))
        }
        return NextResponse.next()
    }

    // ── Setup wizard enforcement ───────────────────────────────────────────────
    if (
        isLoggedIn &&
        !setupCompleted &&
        role === "ADMIN" &&
        !pathname.startsWith("/setup") &&
        !pathname.startsWith("/super")
    ) {
        return NextResponse.redirect(new URL("/setup", req.nextUrl))
    }

    // ── Protected tenant routes (/dashboard, /admin) ───────────────────────────
    if (pathname.startsWith("/dashboard") || pathname.startsWith("/admin")) {
        if (!isLoggedIn) {
            const loginUrl = new URL("/login", req.nextUrl)
            if (tenantSlug) loginUrl.searchParams.set("tenant", tenantSlug)
            return NextResponse.redirect(loginUrl)
        }

        // Subscription validity
        if (
            tenantStatus === "SUSPENDED" ||
            (subscriptionEnd && subscriptionEnd < new Date())
        ) {
            if (
                pathname.startsWith("/admin") ||
                (pathname.startsWith("/dashboard") && !pathname.includes("error=suspended"))
            ) {
                return NextResponse.redirect(new URL("/dashboard?error=suspended", req.nextUrl))
            }
        }

        // Feature-gate helper
        const checkModule = (mod: string) => {
            if (planModules.length > 0) return planModules.includes(mod)
            const tierMap: Record<string, string[]> = {
                STANDARD: ["PROJECTS"],
                PROFESSIONAL: ["PROJECTS", "FINANCE", "CRM"],
                ENTERPRISE: ["PROJECTS", "FINANCE", "CRM", "HR", "GANTT", "ZATCA", "FILE_UPLOAD"],
            }
            return (tierMap[tier] || ["PROJECTS"]).includes(mod)
        }

        // RBAC — role
        if (pathname.startsWith("/admin/hr") && !["ADMIN", "HR", "MANAGER"].includes(role)) {
            return NextResponse.redirect(new URL("/dashboard", req.nextUrl))
        }
        if (pathname.startsWith("/admin/finance") && !["ADMIN", "FINANCE", "ACCOUNTANT", "CEO"].includes(role)) {
            return NextResponse.redirect(new URL("/dashboard", req.nextUrl))
        }
        if (pathname.startsWith("/admin/settings") && role !== "ADMIN") {
            return NextResponse.redirect(new URL("/dashboard", req.nextUrl))
        }

        // RBAC — module gates
        if (pathname.startsWith("/admin/hr") && !checkModule("HR")) {
            return NextResponse.redirect(new URL("/dashboard?error=upgrade", req.nextUrl))
        }
        if (pathname.startsWith("/admin/finance")) {
            if (!checkModule("FINANCE"))
                return NextResponse.redirect(new URL("/dashboard?error=upgrade", req.nextUrl))
            if (pathname.includes("/zatca") && !checkModule("ZATCA"))
                return NextResponse.redirect(new URL("/dashboard?error=upgrade", req.nextUrl))
        }
        if (pathname.includes("/gantt") && !checkModule("GANTT")) {
            return NextResponse.redirect(new URL("/dashboard?error=upgrade", req.nextUrl))
        }
        if (pathname.startsWith("/admin/crm") && !checkModule("CRM")) {
            return NextResponse.redirect(new URL("/dashboard?error=upgrade", req.nextUrl))
        }
    }

    // ── Attach tenant hint header and pass through ────────────────────────────
    const response = NextResponse.next()
    if (tenantSlug) {
        response.headers.set("x-tenant-slug", tenantSlug)
    }
    return response
}

export const config = {
    // Exclude static files, images, and the auth API from middleware processing.
    // NOTE: Do NOT exclude _next/data or _rsc paths — those must pass through
    // so the auth check applies to RSC re-renders and prefetches.
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
