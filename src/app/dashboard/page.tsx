import { auth } from "@/auth"
import { db } from "@/lib/db"
import { checkPermission } from "@/lib/rbac"

import { AdminDashboard } from "@/components/dashboard/admin-dashboard"
import { EngineerDashboard } from "@/components/dashboard/engineer-dashboard"
import { HRDashboard } from "@/components/dashboard/hr-dashboard"
import { AccountantDashboard } from "@/components/dashboard/accountant-dashboard"

export default async function DashboardPage() {
    const session = await auth()
    const user = session?.user as any

    if (!user) return <div className="p-8 text-center text-slate-500 font-bold">Session expired. Please log in.</div>

    // 1. Check module permissions for dashboard scoping
    const canViewAnalytics = await checkPermission('ANALYTICS', 'read')
    const canViewHR = await checkPermission('HR', 'read')
    const canViewFinance = await checkPermission('FINANCE', 'read')

    const isAdmin = canViewAnalytics
    const isHR = !isAdmin && canViewHR
    const isAccountant = !isAdmin && !isHR && canViewFinance
    const isEngineer = !isAdmin && !isHR && !isAccountant

    // ----- [FETCH DATA SCOPES] -----

    // Scope A: Admin Master View Fetch
    if (isAdmin) {
        const [projects, engineers, hrData, invoices, reports, expenses, companyProfile, recentUploads] = await Promise.all([
            (db as any).project.findMany({ select: { id: true, code: true, name: true, status: true, completionPercent: true, startDate: true, totalDuration: true, contractValue: true } }),
            (db as any).user.findMany({ where: { role: 'SITE_ENGINEER' } }),
            (db as any).employeeProfile.findMany({ select: { idExpiry: true, passportExpiry: true, user: { select: { role: true } } } }),
            (db as any).invoice.findMany({ select: { totalAmount: true, status: true } }),
            (db as any).dailyReport.count(),
            (db as any).expense.findMany({ select: { totalAmount: true } }),
            (db as any).companyProfile.findUnique({ where: { id: "SINGLETON" } }).catch(() => null),
            (db as any).drawingRevision.findMany({
                include: { drawing: { include: { project: { select: { name: true } } } }, uploadedBy: { select: { name: true } } },
                orderBy: { createdAt: 'desc' },
                take: 15
            })
        ]);

        const totalReceivables = invoices.filter((i: any) => i.status !== 'PAID').reduce((sum: number, inv: any) => sum + (inv.totalAmount || 0), 0);
        const totalPaid = invoices.filter((i: any) => i.status === 'PAID').reduce((sum: number, inv: any) => sum + (inv.totalAmount || 0), 0);
        const totalContractValue = projects.reduce((sum: number, p: any) => sum + (p.contractValue || 0), 0);
        const totalExpenses = expenses.reduce((sum: number, e: any) => sum + (e.totalAmount || 0), 0);

        return <AdminDashboard
            projects={projects}
            engineers={engineers}
            hrData={hrData}
            financeSummary={{ totalReceivables, activeInvoices: invoices.filter((i: any) => i.status !== 'PAID').length, totalPaid, totalContractValue, totalExpenses }}
            supervisionSummary={{ reportsCount: reports }}
            companyProfile={companyProfile}
            recentUploads={recentUploads}
            user={user}
        />
    }

    // Scope B: HR View Fetch
    if (isHR) {
        const [employees, recentRequests] = await Promise.all([
            (db as any).employeeProfile.findMany({
                include: { user: { select: { name: true } } },
                where: { OR: [{ idExpiry: { not: null } }, { passportExpiry: { not: null } }] }
            }),
            (db as any).leaveRequest.findMany({
                include: { user: { select: { name: true } } },
                orderBy: { createdAt: 'desc' },
                take: 20
            }) // Expand request unions as needed
        ]);

        return <HRDashboard employees={employees} recentRequests={recentRequests} user={user} />
    }

    // Scope C: Accountant View Fetch
    if (isAccountant) {
        const [pendingInvoices, projectsHealth, expenses] = await Promise.all([
            (db as any).invoice.findMany({
                where: { status: { not: 'PAID' } },
                include: { project: { select: { name: true } } },
                orderBy: { date: 'asc' }
            }),
            (db as any).project.findMany({
                where: { status: 'ACTIVE' },
                select: { id: true, code: true, name: true, contractValue: true, invoices: { select: { baseAmount: true } } }
            }),
            (db as any).expense.findMany({
                orderBy: { date: 'desc' },
                take: 100
            })
        ]);

        return <AccountantDashboard
            pendingInvoices={pendingInvoices}
            projectsHealth={projectsHealth}
            expenses={expenses}
            user={user}
        />
    }

    // Scope D: Engineer/PM View Fetch
    if (isEngineer) {
        const [myProjects, myTasks, myIRs, myNCRs, companyProfile] = await Promise.all([
            (db as any).project.findMany({
                where: { OR: [{ engineers: { some: { id: user.id } } }, { leadEngineerId: user.id }] },
                select: { id: true, code: true, name: true, completionPercent: true, startDate: true, endDate: true, createdAt: true, totalDuration: true }
            }),
            (db as any).task.findMany({
                where: { assignees: { some: { id: user.id } }, progress: { lt: 100 } },
                include: { project: { select: { name: true, brand: true } }, assignees: true },
                orderBy: { end: 'asc' }
            }),
            (db as any).inspectionRequest.findMany({
                where: { createdById: user.id, status: 'PENDING' }
            }),
            (db as any).ncr.findMany({
                where: { createdById: user.id, status: 'PENDING' }
            }),
            (db as any).companyProfile.findUnique({ where: { id: "SINGLETON" } }).catch(() => null)
        ]);

        const recentUploads = await (db as any).drawingRevision.findMany({
            where: { drawing: { projectId: { in: myProjects.map((p: any) => p.id) } } },
            include: { drawing: { include: { project: { select: { name: true } } } }, uploadedBy: { select: { name: true } } },
            orderBy: { createdAt: 'desc' },
            take: 15
        });

        return <EngineerDashboard
            myProjects={myProjects}
            myTasks={myTasks}
            pendingIRs={myIRs}
            pendingNCRs={myNCRs}
            companyProfile={companyProfile}
            recentUploads={recentUploads}
            user={user}
        />
    }

    return null;
}
