import { auth } from "@/auth"
import { db } from "@/lib/db"
import { hasPermission } from "@/lib/rbac"

import { AdminDashboard } from "@/components/dashboard/admin-dashboard"
import { EngineerDashboard } from "@/components/dashboard/engineer-dashboard"
import { HRDashboard } from "@/components/dashboard/hr-dashboard"
import { AccountantDashboard } from "@/components/dashboard/accountant-dashboard"

export default async function DashboardPage() {
    const session = await auth()
    const user = session?.user as any

    if (!user) return <div className="p-8 text-center text-slate-500 font-bold">Session expired. Please log in.</div>

    const tenantId = user.tenantId as string

    // ── Resolve granular scopes from the JWT permission matrix ──────────────
    // hasPermission reads directly from session.user.permissions — no DB hit,
    // no legacy role-string fallback. GLOBAL_SUPER_ADMIN always gets max scope.
    const [projectViewScope, hrViewScope, canViewFinance, canViewAnalytics] = await Promise.all([
        hasPermission('projects', 'view'),   // 'ALL' | 'ASSIGNED' | 'NONE'
        hasPermission('hr', 'view'),         // 'ALL_BRANCHES' | 'ASSIGNED_BRANCH' | 'NONE'
        hasPermission('finance', 'masterVisible'),  // boolean
        hasPermission('system', 'viewAnalytics'),   // boolean
    ])

    // ── Dashboard mode ───────────────────────────────────────────────────────
    // Driven purely by what the matrix says — no 'ADMIN' string check.
    // A user who can view ALL projects (project manager, director, etc.) gets
    // the same admin-level overview as someone with full analytics access.
    const showAdminDash = (canViewAnalytics as boolean) || projectViewScope === 'ALL'
    const showHRDash    = !showAdminDash && hrViewScope !== 'NONE'
    const showAcctDash  = !showAdminDash && !showHRDash && (canViewFinance as boolean)
    // showEngineerDash = everything else (only own assignments visible)

    // ── Project WHERE clause: respects 'ALL' vs 'ASSIGNED' scope ────────────
    // For 'ALL': tenant-wide (or cross-tenant for GSA).
    // For 'ASSIGNED' or 'NONE': only projects the user is explicitly on.
    const tenantScope = tenantId ? { tenantId } : {}
    const projectWhere =
        projectViewScope === 'ALL'
            ? tenantScope
            : { ...tenantScope, OR: [{ engineers: { some: { id: user.id } } }, { leadEngineerId: user.id }] }

    // ── Scope A: Admin / Project-Director Master View ────────────────────────
    if (showAdminDash) {
        const [projects, engineers, hrData, invoices, reports, expenses, companyProfile, recentUploads] = await Promise.all([
            (db as any).project.findMany({
                where: projectWhere,
                select: { id: true, code: true, name: true, status: true, completionPercent: true, startDate: true, totalDuration: true, contractValue: true }
            }),
            (db as any).user.findMany({
                where: { ...tenantScope, role: 'SITE_ENGINEER' }
            }),
            (db as any).employeeProfile.findMany({
                where: tenantId ? { user: { tenantId } } : {},
                select: { idExpiry: true, passportExpiry: true, user: { select: { role: true } } }
            }),
            (db as any).invoice.findMany({
                where: tenantScope,
                select: { totalAmount: true, status: true }
            }),
            (db as any).dailyReport.count({ where: tenantScope }),
            (db as any).expense.findMany({
                where: tenantScope,
                select: { totalAmount: true }
            }),
            (db as any).companyProfile.findUnique({ where: { id: "SINGLETON" } }).catch(() => null),
            (db as any).drawingRevision.findMany({
                where: tenantId ? { drawing: { project: { tenantId } } } : {},
                include: { drawing: { include: { project: { select: { name: true } } } }, uploadedBy: { select: { name: true } } },
                orderBy: { createdAt: 'desc' },
                take: 15
            })
        ])

        const totalReceivables = invoices.filter((i: any) => i.status !== 'PAID').reduce((sum: number, inv: any) => sum + (inv.totalAmount || 0), 0)
        const totalPaid = invoices.filter((i: any) => i.status === 'PAID').reduce((sum: number, inv: any) => sum + (inv.totalAmount || 0), 0)
        const totalContractValue = projects.reduce((sum: number, p: any) => sum + (p.contractValue || 0), 0)
        const totalExpenses = expenses.reduce((sum: number, e: any) => sum + (e.totalAmount || 0), 0)

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

    // ── Scope B: HR View ─────────────────────────────────────────────────────
    if (showHRDash) {
        const hrFilter = hrViewScope === 'ALL_BRANCHES'
            ? (tenantId ? { user: { tenantId } } : {})
            : { user: { tenantId, profile: { directManagerId: user.id } } }

        const [employees, recentRequests] = await Promise.all([
            (db as any).employeeProfile.findMany({
                where: { ...hrFilter, OR: [{ idExpiry: { not: null } }, { passportExpiry: { not: null } }] },
                include: { user: { select: { name: true } } },
            }),
            (db as any).leaveRequest.findMany({
                where: tenantId ? { user: { tenantId } } : {},
                include: { user: { select: { name: true } } },
                orderBy: { createdAt: 'desc' },
                take: 20
            })
        ])

        return <HRDashboard employees={employees} recentRequests={recentRequests} user={user} />
    }

    // ── Scope C: Accountant View ─────────────────────────────────────────────
    if (showAcctDash) {
        const [pendingInvoices, projectsHealth, expenses] = await Promise.all([
            (db as any).invoice.findMany({
                where: { ...tenantScope, status: { not: 'PAID' } },
                include: { project: { select: { name: true } } },
                orderBy: { date: 'asc' }
            }),
            (db as any).project.findMany({
                where: { ...tenantScope, status: 'ACTIVE' },
                select: { id: true, code: true, name: true, contractValue: true, invoices: { select: { baseAmount: true } } }
            }),
            (db as any).expense.findMany({
                where: tenantScope,
                orderBy: { date: 'desc' },
                take: 100
            })
        ])

        return <AccountantDashboard
            pendingInvoices={pendingInvoices}
            projectsHealth={projectsHealth}
            expenses={expenses}
            user={user}
        />
    }

    // ── Scope D: Engineer / PM (assigned-only) view ──────────────────────────
    const [myProjects, myTasks, myIRs, myNCRs, companyProfile] = await Promise.all([
        (db as any).project.findMany({
            where: projectWhere,  // already has the assignment filter when scope = 'ASSIGNED'
            select: { id: true, code: true, name: true, completionPercent: true, startDate: true, createdAt: true, totalDuration: true }
        }),
        (db as any).task.findMany({
            where: { assignees: { some: { id: user.id } }, progress: { lt: 100 } },
            include: { project: { select: { name: true, brand: true } }, assignees: true },
            orderBy: { end: 'asc' }
        }),
        (db as any).inspectionRequest.findMany({
            where: { createdById: user.id, status: 'PENDING' }
        }),
        (db as any).nCR.findMany({
            where: { createdById: user.id, status: 'PENDING' }
        }),
        (db as any).companyProfile.findUnique({ where: { id: "SINGLETON" } }).catch(() => null)
    ])

    const recentUploads = await (db as any).drawingRevision.findMany({
        where: { drawing: { projectId: { in: myProjects.map((p: any) => p.id) } } },
        include: { drawing: { include: { project: { select: { name: true } } } }, uploadedBy: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 15
    })

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
