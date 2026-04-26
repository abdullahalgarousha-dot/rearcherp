import NextAuth from "next-auth"
import { authConfig } from "@/auth.config"
import { NextResponse } from "next/server"

const { auth } = NextAuth(authConfig)

export default auth((req) => {
    const { pathname } = req.nextUrl
    const user = req.auth?.user as {
        role?: string;
        tenantStatus?: string;
        subscriptionEnd?: string | null;
        planModules?: string[];
        subscriptionTier?: string;
        setupCompleted?: boolean;
        tenantSlug?: string | null;
    } | null
    const isLoggedIn = !!req.auth
    const role             = user?.role            || ""
    const tenantStatus     = user?.tenantStatus    || "ACTIVE"
    const subscriptionEnd  = user?.subscriptionEnd
        ? new Date(user.subscriptionEnd)
        : null
    const planModules      = user?.planModules     || []
    const tier             = user?.subscriptionTier || "STANDARD"
    const setupCompleted   = user?.setupCompleted
    // tenantSlug minted at login and stored in the JWT (see auth.ts + auth.config.ts)
    const userTenantSlug   = user?.tenantSlug      ?? null

    // TARGET 1 (part A): Determine super roles EARLY — needed for isolation bypass below
    const isGlobalSuper = role === "GLOBAL_SUPER_ADMIN"
    const isSuperRole   = isGlobalSuper || role === "SUPER_ADMIN"
    const isAdmin       = role === "ADMIN" || isSuperRole

    // ── Host-based tenant resolution ──────────────────────────────────────────
    const hostname   = req.headers.get("host") || ""
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

    // ── TARGET 1: TENANT ISOLATION CHECK ─────────────────────────────────────
    // If a subdomain slug is present and a user IS logged in, the user's own
    // tenantSlug (minted at login) MUST match the slug they are trying to access.
    // GLOBAL_SUPER_ADMIN operates with tenantId='system' and is the only bypass.
    if (
        tenantSlug &&
        tenantSlug !== "CUSTOM_DOMAIN_HINT" &&
        isLoggedIn &&
        !isGlobalSuper      // GLOBAL_SUPER_ADMIN is the only cross-tenant role
    ) {
        if (!userTenantSlug || userTenantSlug !== tenantSlug) {
            // Authenticated user belongs to a DIFFERENT tenant OR has no slug — hard stop.
            console.warn(
                `[Middleware] Tenant isolation violation: user slug="${userTenantSlug}" vs requested slug="${tenantSlug}" — redirecting to /unauthorized`
            )
            return NextResponse.redirect(new URL("/unauthorized", req.nextUrl))
        }
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
    // TARGET 1 (part B): ONLY GLOBAL_SUPER_ADMIN may access /super-admin.
    // Hardcoded email backdoor removed. SUPER_ADMIN is a tenant-level role
    // and must NOT access the global SaaS operator panel.
    if (pathname.startsWith("/super-admin")) {
        if (isGlobalSuper) {
            return NextResponse.next()
        }
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
        !isSuperRole &&
        !pathname.startsWith("/setup") &&
        !pathname.startsWith("/super") &&
        !pathname.startsWith("/unauthorized")
    ) {
        if (role === "ADMIN") {
            return NextResponse.redirect(new URL("/setup", req.nextUrl))
        } else {
            // Ordinary employees cannot access the system until the admin completes setup
            return NextResponse.redirect(new URL("/unauthorized?error=setup_pending", req.nextUrl))
        }
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
                STANDARD:     ["PROJECTS"],
                PROFESSIONAL: ["PROJECTS", "FINANCE", "CRM"],
                ENTERPRISE:   ["PROJECTS", "FINANCE", "CRM", "HR", "GANTT", "ZATCA", "FILE_UPLOAD"],
            }
            return (tierMap[tier] || ["PROJECTS"]).includes(mod)
        }

        // RBAC — role checks
        if (pathname.startsWith("/admin/hr") &&
            !isAdmin && !["HR", "HR_MANAGER", "MANAGER"].includes(role)) {
            return NextResponse.redirect(new URL("/dashboard", req.nextUrl))
        }
        if (pathname.startsWith("/admin/finance") &&
            !isAdmin && !["FINANCE", "ACCOUNTANT", "CEO"].includes(role)) {
            return NextResponse.redirect(new URL("/dashboard", req.nextUrl))
        }
        if (pathname.startsWith("/admin/settings") && !isAdmin) {
            return NextResponse.redirect(new URL("/dashboard", req.nextUrl))
        }
        if (pathname.startsWith("/admin/roles") && !isAdmin) {
            return NextResponse.redirect(new URL("/dashboard", req.nextUrl))
        }
        if (pathname.startsWith("/admin/users") && !isAdmin) {
            return NextResponse.redirect(new URL("/dashboard", req.nextUrl))
        }
        if (pathname.startsWith("/admin/supervision") &&
            !isAdmin && !["PROJECT_MANAGER", "PM", "SITE_ENGINEER"].includes(role)) {
            return NextResponse.redirect(new URL("/dashboard", req.nextUrl))
        }
        if (pathname.startsWith("/admin/crm") &&
            !isAdmin && !["PROJECT_MANAGER", "PM"].includes(role)) {
            return NextResponse.redirect(new URL("/dashboard", req.nextUrl))
        }

        // NOTE: Module-level gates (GANTT, ZATCA, etc.) are now UNLOCKED for all tiers per TO-PO rebranding.
        // Subscription limits now only apply to Resource counts (Users/Branches) and Custom Domains.
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
