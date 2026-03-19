import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
    const isLoggedIn = !!req.auth
    const { pathname } = req.nextUrl
    const user = req.auth?.user as any
    const role = user?.role
    const setupCompleted = user?.setupCompleted

    // --- PHASE 9: Host-Based Tenant Resolution ---
    // This supports both subdomains (fts.rearch.sa) and custom domains (engineer.com)
    const hostname = req.headers.get("host") || ""
    const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || "localhost:3000"

    let tenantSlug = null

    if (hostname.endsWith(`.${baseDomain}`)) {
        // 1. Subdomain Resolution (e.g., fts.localhost:3000)
        const slug = hostname.replace(`.${baseDomain}`, "")
        // EXCLUDE SYSTEM RESERVED SLUGS
        if (!['super-admin', 'super-login', 'admin', 'www', 'api'].includes(slug)) {
            tenantSlug = slug
        }
    } else if (hostname !== baseDomain && !hostname.startsWith('localhost')) {
        // 2. Custom Domain Resolution (e.g., my-company.com)
        tenantSlug = "CUSTOM_DOMAIN_HINT"
    }

    // --- PHASE 12: Super-Login Lockdown & Dev Whitelist ---
    const isDev = process.env.NODE_ENV === 'development'

    // Strict ?access=secure check for super-login
    if (pathname === '/super-login') {
        const accessKey = req.nextUrl.searchParams.get('access')
        // Exact match check (ignores trailing chars if handled by get, but we'll be explicit)
        if (accessKey !== 'secure' && !isDev) {
            return NextResponse.redirect(new URL('/', req.nextUrl))
        }
    }

    // Public Routes
    if (pathname.startsWith('/login') || pathname.startsWith('/api/auth')) {
        if (isLoggedIn) {
            return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
        }
        return NextResponse.next()
    }

    // Setup Wizard Enforcement
    if (isLoggedIn && !setupCompleted && role === 'ADMIN' && !pathname.startsWith('/setup') && !pathname.startsWith('/super')) {
        return NextResponse.redirect(new URL('/setup', req.nextUrl))
    }

    // Protected Routes
    if (pathname.startsWith('/dashboard') || pathname.startsWith('/admin')) {
        if (!isLoggedIn) {
            // Include tenant slug in redirect if present
            const loginUrl = new URL('/login', req.nextUrl)
            if (tenantSlug) loginUrl.searchParams.set('tenant', tenantSlug)
            return NextResponse.redirect(loginUrl)
        }

        // RBAC Logic
        if (pathname.startsWith('/admin/hr') && !['ADMIN', 'HR', 'MANAGER'].includes(role)) {
            return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
        }

        if (pathname.startsWith('/admin/finance') && !['ADMIN', 'FINANCE', 'ACCOUNTANT', 'CEO'].includes(role)) {
            return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
        }

        if (pathname.startsWith('/admin/settings') && role !== 'ADMIN') {
            return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
        }

        // --- PHASE 11: Subscription Validity Check ---
        const tenantStatus = user?.tenantStatus || 'ACTIVE'
        const subscriptionEnd = user?.subscriptionEnd ? new Date(user.subscriptionEnd) : null

        if (tenantStatus === 'SUSPENDED' || (subscriptionEnd && subscriptionEnd < new Date())) {
            // Block /admin completely and /dashboard unless it's showing the suspension error
            if (pathname.startsWith('/admin') || (pathname.startsWith('/dashboard') && !pathname.includes('error=suspended'))) {
                return NextResponse.redirect(new URL('/dashboard?error=suspended', req.nextUrl))
            }
        }

        // --- PHASE 10: Subscription Feature Gating (Dynamic) ---
        const planModules = user?.planModules || []
        const tier = user?.subscriptionTier || 'STANDARD'

        const checkModule = (mod: string) => {
            if (planModules && planModules.length > 0) return planModules.includes(mod)
            // Fallback for legacy tiers until data is migrated
            const tierMap: Record<string, string[]> = {
                'STANDARD': ['PROJECTS'],
                'PROFESSIONAL': ['PROJECTS', 'FINANCE', 'CRM'],
                'ENTERPRISE': ['PROJECTS', 'FINANCE', 'CRM', 'HR', 'GANTT', 'ZATCA', 'FILE_UPLOAD']
            }
            return (tierMap[tier] || ['PROJECTS']).includes(mod)
        }

        // 1. HR Gate
        if (pathname.startsWith('/admin/hr') && !checkModule('HR')) {
            return NextResponse.redirect(new URL('/dashboard?error=upgrade', req.nextUrl))
        }

        // 2. Finance & ZATCA Gate
        if (pathname.startsWith('/admin/finance')) {
            if (!checkModule('FINANCE')) {
                return NextResponse.redirect(new URL('/dashboard?error=upgrade', req.nextUrl))
            }
            if (pathname.includes('/zatca') && !checkModule('ZATCA')) {
                return NextResponse.redirect(new URL('/dashboard?error=upgrade', req.nextUrl))
            }
        }

        // 3. Project-Specific Extensions (Gantt)
        if (pathname.includes('/gantt') && !checkModule('GANTT')) {
            return NextResponse.redirect(new URL('/dashboard?error=upgrade', req.nextUrl))
        }

        // 4. CRM / Client management
        if (pathname.startsWith('/admin/crm') && !checkModule('CRM')) {
            return NextResponse.redirect(new URL('/dashboard?error=upgrade', req.nextUrl))
        }

        // --- PHASE 7: Super Admin Hardening ---
        if (pathname.startsWith('/super-admin')) {
            if (role !== 'GLOBAL_SUPER_ADMIN' && role !== 'SUPER_ADMIN') {
                return NextResponse.redirect(new URL('/super-login?access=secure', req.nextUrl))
            }
        }
    }

    // Unauthenticated Super Admin Access
    if (pathname.startsWith('/super-admin') && !isLoggedIn) {
        return NextResponse.redirect(new URL('/super-login?access=secure', req.nextUrl))
    }

    // In a more advanced setup, we would rewrite the URL here to include /[tenant]
    // but for now, we rely on the session-based tenantId for data isolation.
    // However, we can set a header to make it easier for the app to know the "intended" tenant.
    const response = NextResponse.next()
    if (tenantSlug) {
        response.headers.set("x-tenant-slug", tenantSlug)
    }

    return response
})

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
