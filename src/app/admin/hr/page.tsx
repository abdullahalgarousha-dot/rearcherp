import { auth } from "@/auth"
import { db } from "@/lib/db"
import { getUserExpiryAlerts, getTotalPayroll, EGP_TO_SAR_RATE } from "@/lib/hr-logic"
import { HRDashboardView } from "./client-view"
import { redirect } from "next/navigation"
import { checkPermission } from "@/lib/rbac"

export default async function HRDashboard() {
    const session = await auth()
    const canAccessHR = await checkPermission('HR', 'read')

    if (!canAccessHR) {
        redirect("/dashboard/employee")
    }

    // Fetch Exchange Rate
    const rateSetting = await (db as any).systemSetting.findUnique({
        where: { key: "EGP_TO_SAR_RATE" }
    })
    const exchangeRate = rateSetting ? parseFloat(rateSetting.value) : EGP_TO_SAR_RATE

    // Fetch All Staff
    const staff = await (db as any).user.findMany({
        orderBy: { name: 'asc' },
        include: {
            leaveRequests: { where: { status: 'PENDING' } },
            profile: {
                include: {
                    hrStats: true,
                    assignedBranch: true
                }
            }
        }
    })

    const pendingLeaves = await (db as any).leaveRequest.count({
        where: { status: 'PENDING' }
    })

    const roles = await (db as any).role.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' }
    })

    const branches = await (db as any).branch.findMany({
        orderBy: { nameEn: 'asc' }
    })

    // Process Financials
    const financials = getTotalPayroll(staff, exchangeRate)

    // Process Alerts
    const allAlerts = staff.flatMap((user: any) => {
        const alerts = getUserExpiryAlerts(user)
        const userLite = { id: user.id, name: user.name }
        return alerts.map((alert: any) => ({ ...alert, user: userLite }))
    }).sort((a: any, b: any) => a.daysRemaining - b.daysRemaining)

    const adminData = {
        totalStaff: staff.length,
        jeddahStaff: staff.filter((u: any) => u.profile?.assignedBranch?.nameEn?.includes('Jeddah') || u.profile?.legacyBranch === 'Jeddah').length,
        cairoStaff: staff.filter((u: any) => u.profile?.assignedBranch?.nameEn?.includes('Cairo') || u.profile?.legacyBranch === 'Cairo').length,
        pendingLeaves,
        financials,
        alerts: {
            critical: allAlerts.filter((a: any) => a.status === 'EXPIRED'),
            warning: allAlerts.filter((a: any) => a.status === 'WARNING')
        },
        staff: staff.map((u: any) => ({
            ...u,
            branch: u.profile?.assignedBranch?.nameEn || u.profile?.legacyBranch || "Unassigned"
        })),
        managers: staff.filter((s: any) => s.profile?.id).map((s: any) => ({ id: s.profile.id, name: s.name }))
    }

    return (
        <HRDashboardView
            totalStaff={adminData.totalStaff}
            jeddahStaff={adminData.jeddahStaff}
            cairoStaff={adminData.cairoStaff}
            pendingLeaves={adminData.pendingLeaves}
            financials={adminData.financials}
            alerts={adminData.alerts}
            staff={adminData.staff}
            roles={roles}
            managers={adminData.managers}
            branches={branches}
        />
    )
}
