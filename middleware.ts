import NextAuth from "next-auth"
import { authConfig } from "@/auth.config"
import { NextResponse } from "next/server"

const { auth } = NextAuth(authConfig)

export default auth((req) => {
    const { pathname } = req.nextUrl
    const user = req.auth?.user as any
    const isLoggedIn = !!req.auth
    const role = (user?.role as string) || ""
    const email = (user?.email as string) || ""
    const setupCompleted = user?.setupCompleted as boolean | undefined
    const tenantStatus = (user?.tenantStatus as string) || "ACTIVE"
    const subscriptionEnd = user?.subscriptionEnd
        ? new Date(user.subscriptionEnd as string)
        : null
    const planModules = (user?.planModules as string[]) || []
    const tier = (user?.subscriptionTier as string) || "STANDARD"

    // Debug: log what the middleware actually sees
    console.log("MIDDLEWARE TOKEN:", JSON.stringify({ isLoggedIn, role, email, pathname }))

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
        // HARDCODED BYPASS: if the token carries the super admin email or role, let them through
        if (
            email === "super@rearch.sa" ||
            role === "GLOBAL_SUPER_ADMIN" ||
            role === "SUPER_ADMIN"
        ) {
            return NextResponse.next()
        }
        // Not authenticated or wrong role — bounce to super-login
        return NextResponse.redirect(new URL("/super-login?access=secure", req.nextUrl))
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

        // RBAC — role checks
        const isSuperRole = role === "GLOBAL_SUPER_ADMIN" || role === "SUPER_ADMIN"
        if (pathname.startsWith("/admin/hr") && !["ADMIN", "HR", "MANAGER"].includes(role) && !isSuperRole) {
            return NextResponse.redirect(new URL("/dashboard", req.nextUrl))
        }
        if (pathname.startsWith("/admin/finance") && !["ADMIN", "FINANCE", "ACCOUNTANT", "CEO"].includes(role) && !isSuperRole) {
            return NextResponse.redirect(new URL("/dashboard", req.nextUrl))
        }
        if (pathname.startsWith("/admin/settings") && role !== "ADMIN" && !isSuperRole) {
            return NextResponse.redirect(new URL("/dashboard", req.nextUrl))
        }

        // RBAC — module gates (ADMIN and super roles bypass these)
        const bypassModuleGates = role === "ADMIN" || isSuperRole
        if (!bypassModuleGates) {
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
    }

    // ── Pass through with tenant hint header ──────────────────────────────────
    const response = NextResponse.next()
    if (tenantSlug) {
        response.headers.set("x-tenant-slug", tenantSlug)
    }
    return response
})

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
