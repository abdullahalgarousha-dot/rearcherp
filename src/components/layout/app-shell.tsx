import { auth } from "@/auth"
import { checkPermission } from "@/lib/rbac"
import { redirect } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { MobileSidebar } from "@/components/layout/mobile-sidebar"
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

    // Check Permissions for Menu Items (Double-Gated with Plane Features)
    const isGlobalAdmin = (session.user as any).role === 'GLOBAL_SUPER_ADMIN'
    const canViewHR = (await checkPermission('HR', 'read') && await checkFeatureGate(tenantId, 'HR')) || isGlobalAdmin
    const canViewRoles = await checkPermission('ROLES', 'read') || isGlobalAdmin
    const canViewFinance = (await checkPermission('FINANCE', 'read') && await checkFeatureGate(tenantId, 'FINANCE')) || isGlobalAdmin
    const canViewSupervision = await checkPermission('SUPERVISION', 'read') || isGlobalAdmin
    const canViewProjects = (await checkPermission('PROJECTS', 'read') && await checkFeatureGate(tenantId, 'PROJECTS')) || isGlobalAdmin
    const canViewSettings = await checkPermission('SETTINGS', 'read')
    const canViewLogs = await checkPermission('LOGS', 'read')
    const canViewCRM = isGlobalAdmin || await checkFeatureGate(tenantId, 'CRM') || await checkPermission('PROJECTS', 'read')

    const isAdmin = canViewHR || canViewRoles || canViewSettings

    const hrManagement = {
        label: "HR & Employee Portal",
        href: "#", // Parent item
        icon: "Briefcase",
        order: 1,
        children: [
            {
                label: "My Portal",
                href: "/dashboard/employee",
                icon: "UserCircle",
            },
            {
                label: "My Requests",
                href: "/dashboard/requests",
                icon: "FileText",
            }
        ]
    }

    if (canViewHR) {
        hrManagement.children.push({
            label: "Staff Directory",
            href: "/admin/hr",
            icon: "Users",
        })

        hrManagement.children.push({
            label: "HR Inbox",
            href: "/admin/hr/requests",
            icon: "Inbox",
        })

        hrManagement.children.push({
            label: "Attendance Record",
            href: "/admin/hr/attendance",
            icon: "CalendarDays",
        })

        hrManagement.children.push({
            label: "Announcements",
            href: "/admin/hr/events",
            icon: "Megaphone",
        })
    }

    if (canViewLogs) {
        hrManagement.children.push({
            label: "System Audit Logs",
            href: "/admin/hr/logs",
            icon: "Activity",
        })
    }

    if (canViewRoles) {
        hrManagement.children.push({
            label: "Access Control",
            href: "/admin/users",
            icon: "ShieldAlert",
        })
    }

    const menuLinks: any = [
        { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard", order: 0 },
        hrManagement
    ].sort((a: any, b: any) => a.order - b.order)

    if (canViewSupervision) {
        menuLinks.push({ label: 'Supervision', href: '/admin/supervision', icon: 'HardHat', order: 3 })
    }

    if (canViewProjects) {
        menuLinks.push({ label: 'Projects', href: '/admin/projects', icon: 'Briefcase', order: 2 })
    }

    if (canViewProjects && canViewCRM) {
        menuLinks.push({ label: 'Clients', href: '/admin/crm', icon: 'UserSquare2', order: 2.5 })
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

    // Brands - still hardcoded for now or link to projects?
    const currentUser = session?.user as any
    if (currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN' || currentUser?.role === 'GLOBAL_SUPER_ADMIN') {
        if (!menuLinks.find((l: any) => l.label === 'Brands')) {
            menuLinks.push({ label: 'Brands', href: '/admin/brands', icon: 'Building2', order: 4 })
        }
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
                <MobileSidebar menuLinks={menuLinks} settings={settings} user={session.user} />
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
