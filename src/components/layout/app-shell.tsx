import { auth } from "@/auth"
import type { PermissionMatrix } from "@/lib/rbac"
import { redirect } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { MobileSidebar } from "@/components/layout/mobile-sidebar"
import { NotificationBell } from "@/components/layout/notification-bell"
import { db } from "@/lib/db"
import { getSystemSettings } from "@/app/actions/settings"
import { checkFeatureGate } from "@/lib/feature-gate"

export async function AppShell({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await auth()

    if (!session) {
        redirect('/login')
    }
    const settings = await getSystemSettings()
    const tenantId = (session.user as any).tenantId

    // ── Role tiers ────────────────────────────────────────────────────────────
    const userRole = (session.user as any).role as string
    // Only the SaaS operator gets unconditional access to everything.
    const isGlobalSuperAdmin = userRole === 'GLOBAL_SUPER_ADMIN'
    // Legacy admin roles created before the permissions matrix existed.
    // They inherit full visibility but are still subject to plan feature gates.
    const isLegacyAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(userRole)

    // ── Permissions matrix (JWT-carried, set at login) ────────────────────────
    // Read directly from the session to avoid redundant auth() calls inside
    // checkPermission(), which can silently fall through to a failing DB query
    // when the JWT permissions field is present but the RolePermission row is not.
    const rawPerms = (session.user as any).permissions
    const perms: PermissionMatrix | null =
        rawPerms == null ? null :
        typeof rawPerms === 'object' ? rawPerms as PermissionMatrix :
        typeof rawPerms === 'string' ? (() => { try { return JSON.parse(rawPerms) } catch { return null } })() :
        null

    // ── Visibility gates ──────────────────────────────────────────────────────
    // Pattern: GLOBAL_SUPER_ADMIN → always true
    //          legacy admin roles → always true (full visibility, subject to plan)
    //          everyone else      → read from the JWT permissions matrix
    const canViewRoles = isGlobalSuperAdmin || isLegacyAdmin ||
        perms?.system?.manageRoles === true

    const canViewFinance = isGlobalSuperAdmin || isLegacyAdmin ||
        (perms?.finance?.masterVisible === true &&
         await checkFeatureGate(tenantId, 'FINANCE'))

    const canViewSupervision = isGlobalSuperAdmin || isLegacyAdmin ||
        (perms?.supervision?.view !== 'NONE' && perms?.supervision?.view != null)

    const canViewProjects = isGlobalSuperAdmin || isLegacyAdmin ||
        ((perms?.projects?.view !== 'NONE' && perms?.projects?.view != null) &&
         await checkFeatureGate(tenantId, 'PROJECTS'))

    const canViewSettings = isGlobalSuperAdmin || isLegacyAdmin ||
        perms?.system?.manageSettings === true

    const canViewCRM =
        (isGlobalSuperAdmin || isLegacyAdmin || await checkFeatureGate(tenantId, 'CRM')) &&
        (isGlobalSuperAdmin || isLegacyAdmin || (perms?.projects?.view !== 'NONE' && perms?.projects?.view != null))

    // Brands: admin-level concept — GSA, legacy admins, or users who can manage settings
    const canViewBrands = isGlobalSuperAdmin || isLegacyAdmin ||
        perms?.system?.manageSettings === true

    const menuLinks: any = [
        { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard", order: 0 },
        { label: "HR Hub", href: "/admin/hr", icon: "Users", order: 1 },
    ].sort((a: any, b: any) => a.order - b.order)

    if (canViewSupervision) {
        menuLinks.push({ label: 'Supervision', href: '/admin/supervision', icon: 'HardHat', order: 3 })
    }

    if (canViewProjects) {
        menuLinks.push({ label: 'Projects', href: '/admin/projects', icon: 'Briefcase', order: 2 })
        menuLinks.push({ label: 'Task Board', href: '/admin/tasks', icon: 'FolderKanban', order: 2.2 })
    }

    if (canViewProjects && canViewCRM) {
        menuLinks.push({ label: 'Clients', href: '/admin/crm', icon: 'UserSquare2', order: 2.5 })
        menuLinks.push({ label: 'Sales', href: '/admin/crm/leads', icon: 'TrendingUp', order: 2.6 })
    }

    if (canViewRoles) {
        menuLinks.push({
            label: "Roles",
            href: "/admin/roles", // Fixed Path to new dynamic roles
            icon: "Shield",
            order: 999
        })
    }

    if (canViewFinance) {
        menuLinks.push({
            label: "Finance Hub",
            href: "/admin/finance",
            icon: "Wallet",
            order: 5,
        })
    }

    if (canViewSettings) {
        menuLinks.push({ label: 'Settings', href: '/admin/settings/general', icon: 'Settings', order: 100 })
    }

    if (canViewBrands) {
        menuLinks.push({ label: 'Brands', href: '/admin/brands', icon: 'Building2', order: 4 })
    }

    return (
        <div className="min-h-screen bg-background font-sans flex flex-col md:flex-row-reverse overflow-hidden">
            {/* Desktop Sidebar (Fixed Right) - Hidden on Mobile */}
            <div className="hidden md:block fixed right-0 top-0 h-screen w-64 z-50">
                <Sidebar menuLinks={menuLinks} settings={settings} user={session.user} />
            </div>

            {/* Mobile Header - Visible on Mobile Only */}
            <div className="md:hidden flex items-center justify-between p-4 bg-primary text-white sticky top-0 z-50 shadow-md">
                <h1 className="font-bold text-lg">{settings.companyNameEn || 'Dashboard'}</h1>
                <div className="flex items-center gap-2">
                    <NotificationBell />
                    <MobileSidebar menuLinks={menuLinks} settings={settings} user={session.user} />
                </div>
            </div>

            {/* Main Content (Scrollable) */}
            <main className="flex-1 md:mr-64 min-h-screen transition-all duration-300 ease-in-out bg-slate-50/50 dark:bg-slate-900/50 overflow-y-auto h-screen">
                <div className="p-4 md:p-8 max-w-[1600px] mx-auto">
                    {children}
                </div>
            </main>
        </div>
    )
}
