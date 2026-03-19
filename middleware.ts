import NextAuth from "next-auth"
import { authConfig } from "@/auth.config"
import { NextResponse } from "next/server"

// Use the edge-compatible authConfig — no Prisma, no bcrypt
const { auth } = NextAuth(authConfig)

export default auth((req) => {
    const isLoggedIn = !!req.auth
    const { pathname } = req.nextUrl
    const user = req.auth?.user as any
    const role = user?.role
    const setupCompleted = user?.setupCompleted

    // Host-Based Tenant Resolution
    const hostname = req.headers.get("host") || ""
    const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || "localhost:3000"

    let tenantSlug = null

    if (hostname.endsWith(`.${baseDomain}`)) {
        const slug = hostname.replace(`.${baseDomain}`, "")
        if (!['super-admin', 'super-login', 'admin', 'www', 'api'].includes(slug)) {
            tenantSlug = slug
        }
    } else if (hostname !== baseDomain && !hostname.startsWith('localhost')) {
        tenantSlug = "CUSTOM_DOMAIN_HINT"
    }

    // Super-Login Lockdown
    const isDev = process.env.NODE_ENV === 'development'
    if (pathname === '/super-login') {
        const accessKey = req.nextUrl.searchParams.get('access')
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
            const loginUrl = new URL('/login', req.nextUrl)
            if (tenantSlug) loginUrl.searchParams.set('tenant', tenantSlug)
            return NextResponse.redirect(loginUrl)
        }

        // RBAC
        if (pathname.startsWith('/admin/hr') && !['ADMIN', 'HR', 'MANAGER'].includes(role)) {
            return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
        }
        if (pathname.startsWith('/admin/finance') && !['ADMIN', 'FINANCE', 'ACCOUNTANT', 'CEO'].includes(role)) {
            return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
        }
        if (pathname.startsWith('/admin/settings') && role !== 'ADMIN') {
            return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
        }

        // Subscription Validity
        const tenantStatus = user?.tenantStatus || 'ACTIVE'
        const subscriptionEnd = user?.subscriptionEnd ? new Date(user.subscriptionEnd) : null
        if (tenantStatus === 'SUSPENDED' || (subscriptionEnd && subscriptionEnd < new Date())) {
            if (pathname.startsWith('/admin') || (pathname.startsWith('/dashboard') && !pathname.includes('error=suspended'))) {
                return NextResponse.redirect(new URL('/dashboard?error=suspended', req.nextUrl))
            }
        }

        // Feature Gating
        const planModules = user?.planModules || []
        const tier = user?.subscriptionTier || 'STANDARD'
        const checkModule = (mod: string) => {
            if (planModules && planModules.length > 0) return planModules.includes(mod)
            const tierMap: Record<string, string[]> = {
                'STANDARD': ['PROJECTS'],
                'PROFESSIONAL': ['PROJECTS', 'FINANCE', 'CRM'],
                'ENTERPRISE': ['PROJECTS', 'FINANCE', 'CRM', 'HR', 'GANTT', 'ZATCA', 'FILE_UPLOAD']
            }
            return (tierMap[tier] || ['PROJECTS']).includes(mod)
        }

        if (pathname.startsWith('/admin/hr') && !checkModule('HR')) {
            return NextResponse.redirect(new URL('/dashboard?error=upgrade', req.nextUrl))
        }
        if (pathname.startsWith('/admin/finance')) {
            if (!checkModule('FINANCE')) return NextResponse.redirect(new URL('/dashboard?error=upgrade', req.nextUrl))
            if (pathname.includes('/zatca') && !checkModule('ZATCA')) return NextResponse.redirect(new URL('/dashboard?error=upgrade', req.nextUrl))
        }
        if (pathname.includes('/gantt') && !checkModule('GANTT')) {
            return NextResponse.redirect(new URL('/dashboard?error=upgrade', req.nextUrl))
        }
        if (pathname.startsWith('/admin/crm') && !checkModule('CRM')) {
            return NextResponse.redirect(new URL('/dashboard?error=upgrade', req.nextUrl))
        }

        // Super Admin Hardening
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

    const response = NextResponse.next()
    if (tenantSlug) {
        response.headers.set("x-tenant-slug", tenantSlug)
    }
    return response
})

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
