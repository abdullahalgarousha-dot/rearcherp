import { auth } from "@/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { addDays, startOfMonth, endOfMonth } from "date-fns"
import { getUserExpiryAlerts, getTotalPayroll, EGP_TO_SAR_RATE } from "@/lib/hr-logic"
import { HRDashboardView } from "./client-view"
import { HRMasterDashboard } from "./hr-dashboard-client"
import { RequestActionCenter } from "./request-dialogs"
import { HRInboxClient } from "./hr-inbox-client"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Users, UserCircle, FileText, CalendarDays, Inbox,
    Activity, ShieldAlert, CheckCircle2, Building2, Briefcase,
    Clock, AlertTriangle, CreditCard, Star,
    CalendarCheck, LayoutDashboard, TrendingDown
} from "lucide-react"
import { cn } from "@/lib/utils"

export const dynamic = 'force-dynamic'

const ADMIN_ROLES = ['GLOBAL_SUPER_ADMIN', 'SUPER_ADMIN', 'ADMIN']
const HR_ROLES = [...ADMIN_ROLES, 'HR_MANAGER']
const ADMIN_ONLY_TABS = ['dashboard', 'directory', 'inbox', 'audit']


function fmt(n: number) {
    return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
        : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K`
        : n.toLocaleString()
}

export default async function HRHubPage({
    searchParams
}: {
    searchParams: Promise<{ tab?: string }>
}) {
    const session = await auth()
    if (!session) redirect('/login')

    const user = session.user as any
    const userRole = user.role as string
    const tenantId = user.tenantId as string
    const isGlobalSuperAdmin = userRole === 'GLOBAL_SUPER_ADMIN'
    const isAdmin = ADMIN_ROLES.includes(userRole)
    const tenantFilter = isGlobalSuperAdmin ? {} : { tenantId }

    const { tab } = await searchParams

    // Default: admins land on the master dashboard; employees on their portal
    const currentTab = tab || (isAdmin ? 'dashboard' : 'portal')

    // Non-admins cannot access admin-only tabs
    if (!isAdmin && ADMIN_ONLY_TABS.includes(currentTab)) {
        redirect('/admin/hr?tab=portal')
    }

    // ── Tab definitions ───────────────────────────────────────────────────────
    const allTabs = [
        { id: 'dashboard', label: 'Master Dashboard', icon: LayoutDashboard, adminOnly: true },
        { id: 'portal',    label: 'My Dashboard',     icon: UserCircle,      adminOnly: false },
        { id: 'attendance',label: 'Attendance',        icon: CalendarDays,    adminOnly: false },
        { id: 'directory', label: 'Staff Directory',   icon: Users,           adminOnly: true  },
        { id: 'inbox',     label: 'HR Inbox',          icon: Inbox,           adminOnly: true  },
        { id: 'audit',     label: 'System & Audit',    icon: Activity,        adminOnly: true  },
    ]
    const visibleTabs = allTabs.filter(t => !t.adminOnly || isAdmin)

    // ── Per-tab data fetching ─────────────────────────────────────────────────

    // MASTER DASHBOARD (admin)
    let dashData: any = null
    if (currentTab === 'dashboard' && isAdmin) {
        const now = new Date()
        const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0)
        const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999)

        const now2 = new Date()
        const monthStart = new Date(now2.getFullYear(), now2.getMonth(), 1)
        const monthEnd = new Date(now2.getFullYear(), now2.getMonth() + 1, 0, 23, 59, 59)

        const [
            totalStaff,
            onLeaveToday,
            pendingLeaves,
            pendingLoans,
            branches,
            recentLeaves,
            employmentStats,
            payrollData,
        ] = await Promise.all([
            (db as any).user.count({ where: { ...tenantFilter, profile: { isNot: null } } }),
            (db as any).leaveRequest.count({
                where: {
                    ...tenantFilter,
                    status: 'APPROVED',
                    startDate: { lte: todayEnd },
                    endDate: { gte: todayStart }
                }
            }),
            (db as any).leaveRequest.count({ where: { ...tenantFilter, status: { in: ['PENDING_MANAGER', 'PENDING_HR', 'PENDING_ATTACHMENT'] } } }),
            (db as any).loanRequest.count({ where: { ...tenantFilter, status: { in: ['PENDING_MANAGER', 'PENDING_HR', 'PENDING_FINANCE', 'PENDING_GM'] } } }),
            (db as any).branch.findMany({
                where: tenantFilter,
                include: {
                    employees: {
                        include: { user: { select: { id: true, name: true, email: true } } }
                    }
                },
                orderBy: { nameEn: 'asc' }
            }),
            (db as any).leaveRequest.findMany({
                where: tenantFilter,
                include: { user: { select: { id: true, name: true } } },
                orderBy: { createdAt: 'desc' },
                take: 8
            }),
            (db as any).employeeProfile.groupBy({
                by: ['employmentType'],
                where: tenantFilter,
                _count: { _all: true }
            }),
            (db as any).employeeProfile.findMany({
                where: { ...tenantFilter, totalSalary: { gt: 0 } },
                orderBy: { totalSalary: 'desc' },
                take: 6,
                include: {
                    user: { select: { name: true } },
                    salarySlips: {
                        where: { month: { gte: monthStart, lte: monthEnd } },
                        take: 1,
                        select: { status: true }
                    }
                }
            }),
        ])

        // Expiry alerts: fetch employees with any document expired or expiring within 60 days
        const alertCutoff = addDays(now, 60)
        const usersWithExpiryIssues = await (db as any).user.findMany({
            where: {
                ...tenantFilter,
                profile: {
                    is: {
                        OR: [
                            { passportExpiry: { not: null, lte: alertCutoff } },
                            { idExpiry: { not: null, lte: alertCutoff } },
                            { insuranceExpiry: { not: null, lte: alertCutoff } },
                        ]
                    }
                }
            },
            include: { profile: true },
        })
        const expiryAlerts = usersWithExpiryIssues
            .flatMap((u: any) => getUserExpiryAlerts(u).map((a: any) => ({ ...a, user: { id: u.id, name: u.name } })))
            .sort((a: any, b: any) => a.daysRemaining - b.daysRemaining)

        // KPI Leaderboard — top 5 evaluated employees this month
        const kpiMonth = now.getMonth() + 1
        const kpiYear  = now.getFullYear()
        const kpiLeaderboardFilter: any = { month: kpiMonth, year: kpiYear }
        if (!isGlobalSuperAdmin) kpiLeaderboardFilter.tenantId = tenantId

        // Guard against stale Prisma singleton (e.g. hot-reload before `prisma generate` is picked up)
        const kpiModel = (db as any).kpiEvaluation ?? (db as any).kPIEvaluation ?? null
        const [kpiLeaderboard, kpiRiskStaff] = kpiModel
            ? await Promise.all([
                kpiModel.findMany({
                    where: kpiLeaderboardFilter,
                    orderBy: { totalScore: 'desc' },
                    take: 5,
                    include: {
                        user: {
                            include: { profile: { select: { position: true, department: true, photo: true } } },
                        },
                    },
                }),
                kpiModel.findMany({
                    where: { ...kpiLeaderboardFilter, totalScore: { lt: 50 } },
                    orderBy: { totalScore: 'asc' },
                    take: 10,
                    include: { user: true },
                }),
            ])
            : [[], []]

        // Currency-normalised grand payroll: sum (totalSalary × branch.exchangeRateToBase) across all branches
        const grandPayrollSAR = (branches as any[]).reduce((acc: number, branch: any) => {
            const rate = branch.exchangeRateToBase ?? 1.0
            const branchPayroll = (branch.employees as any[]).reduce(
                (s: number, emp: any) => s + (emp.totalSalary || 0), 0
            )
            return acc + branchPayroll * rate
        }, 0)
        const branchPayrolls = (branches as any[]).map((branch: any) => ({
            id:         branch.id,
            name:       branch.nameEn,
            currency:   branch.currencyCode ?? 'SAR',
            rate:       branch.exchangeRateToBase ?? 1.0,
            localTotal: (branch.employees as any[]).reduce((s: number, e: any) => s + (e.totalSalary || 0), 0),
        }))

        // Count unassigned (no branch)
        const assignedProfileIds = branches.flatMap((b: any) => b.employees.map((e: any) => e.id))
        const unassignedCount = await (db as any).employeeProfile.count({
            where: {
                ...tenantFilter,
                id: { notIn: assignedProfileIds.length > 0 ? assignedProfileIds : ['__none__'] }
            }
        })

        dashData = {
            totalStaff, onLeaveToday, pendingLeaves, pendingLoans,
            branches, recentLeaves, unassignedCount,
            employmentStats, payrollData, expiryAlerts,
            kpiLeaderboard, kpiRiskStaff,
            grandPayrollSAR, branchPayrolls,
        }
    }

    // MY PORTAL (current user)
    let portalData: any = null
    if (currentTab === 'portal') {
        const now = new Date()
        const portalMonthStart = startOfMonth(now)
        const portalMonthEnd   = endOfMonth(now)
        const kpiMonth = now.getMonth() + 1
        const kpiYear  = now.getFullYear()

        const [profileRow, currentKPI, kpiHistory, monthlyTimeLogs, completedTasksThisMonth] = await Promise.all([
            (db as any).user.findUnique({
                where: { id: user.id },
                include: {
                    profile: {
                        include: {
                            assignedBranch: true,
                            hrStats: true,
                            activeLoans: { where: { status: 'ACTIVE' }, orderBy: { createdAt: 'desc' } },
                            documentRequests: { orderBy: { createdAt: 'desc' }, take: 30 },
                        }
                    },
                    leaveRequests: { orderBy: { createdAt: 'desc' }, take: 30 },
                    permissionRequests: { orderBy: { createdAt: 'desc' }, take: 30 },
                    disciplinaryActions: { orderBy: { date: 'desc' }, take: 20 },
                }
            }),
            (db as any).kpiEvaluation.findUnique({
                where: { userId_month_year: { userId: user.id, month: kpiMonth, year: kpiYear } },
            }).catch(() => null),
            (db as any).kpiEvaluation.findMany({
                where: { userId: user.id },
                orderBy: [{ year: 'desc' }, { month: 'desc' }],
                take: 12,
            }).catch(() => []),
            (db as any).timeLog.findMany({
                where: { userId: user.id, date: { gte: portalMonthStart, lte: portalMonthEnd } },
                include: { project: { select: { id: true, name: true } } },
            }).catch(() => []),
            (db as any).employeeTask.count({
                where: {
                    assigneeId: user.id,
                    status: 'COMPLETED',
                    actualCompletionDate: { gte: portalMonthStart, lte: portalMonthEnd },
                },
            }).catch(() => 0),
        ])

        let loanRequests: any[] = []
        if (profileRow?.profile?.id) {
            loanRequests = await (db as any).loanRequest.findMany({
                where: { profileId: profileRow.profile.id },
                orderBy: { createdAt: 'desc' },
                take: 20
            })
        }

        // Monthly summary derived data
        const hoursLoggedThisMonth = (monthlyTimeLogs as any[]).reduce((s: number, l: any) => s + (l.hoursLogged || 0), 0)
        const uniqueProjectIds = new Set((monthlyTimeLogs as any[]).filter((l: any) => l.projectId).map((l: any) => l.projectId))

        portalData = {
            ...profileRow,
            loanRequests,
            kpiData: {
                current:    currentKPI,
                history:    kpiHistory,
                month:      kpiMonth,
                year:       kpiYear,
                monthlySummary: {
                    hoursLogged:      Math.round(hoursLoggedThisMonth * 10) / 10,
                    tasksCompleted:   completedTasksThisMonth,
                    projectsWorkedOn: uniqueProjectIds.size,
                },
            },
        }
    }

    // STAFF DIRECTORY (admin)
    let adminData: any = null
    if (currentTab === 'directory' && isAdmin) {
        const rateSetting = await (db as any).systemSetting.findUnique({ where: { key: "EGP_TO_SAR_RATE" } })
        const exchangeRate = rateSetting ? parseFloat(rateSetting.value) : EGP_TO_SAR_RATE

        // RBAC scope: if admin has accessScope=BRANCH, only show own-branch employees
        const adminProfile = isGlobalSuperAdmin ? null : await (db as any).employeeProfile.findUnique({
            where: { userId: user.id },
            select: { branchId: true },
        })
        const adminAccessScope = (user as any).accessScope ?? 'ALL'
        const isBranchScoped = !isGlobalSuperAdmin && adminAccessScope === 'BRANCH' && adminProfile?.branchId
        const staffScopeFilter = isBranchScoped
            ? { ...tenantFilter, profile: { branchId: adminProfile!.branchId } }
            : tenantFilter

        const [staff, pendingLeaves, roles, branches, departmentLookups] = await Promise.all([
            (db as any).user.findMany({
                where: staffScopeFilter, orderBy: { name: 'asc' },
                include: {
                    leaveRequests: { where: { status: 'PENDING' } },
                    profile: { include: { hrStats: true, assignedBranch: true } }
                }
            }),
            (db as any).leaveRequest.count({ where: { status: { in: ['PENDING_MANAGER', 'PENDING_HR', 'PENDING_ATTACHMENT'] } } }),
            (db as any).role.findMany({ where: tenantFilter, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
            (db as any).branch.findMany({ where: tenantFilter, orderBy: { nameEn: 'asc' } }),
            (db as any).systemLookup.findMany({
                where: { ...tenantFilter, category: 'ENGINEERING_DISCIPLINE', isActive: true },
                orderBy: { labelEn: 'asc' },
                select: { id: true, value: true, labelEn: true, labelAr: true }
            })
        ])

        const staffWithBranch = staff.map((u: any) => ({
            ...u, branch: u.profile?.assignedBranch?.nameEn || u.profile?.legacyBranch || "Unassigned"
        }))
        const branchStats = branches.map((b: any) => ({
            id: b.id, name: b.nameEn || b.nameAr || 'Branch',
            count: staffWithBranch.filter((u: any) => u.branch === b.nameEn || u.branch === b.nameAr).length
        }))
        const financials = getTotalPayroll(staff, exchangeRate)
        const allAlerts = staff.flatMap((u: any) => getUserExpiryAlerts(u).map((a: any) => ({ ...a, user: { id: u.id, name: u.name } }))).sort((a: any, b: any) => a.daysRemaining - b.daysRemaining)

        adminData = {
            totalStaff: staff.length, branchStats, pendingLeaves, financials,
            alerts: { critical: allAlerts.filter((a: any) => a.status === 'EXPIRED'), warning: allAlerts.filter((a: any) => a.status === 'WARNING') },
            staff: staffWithBranch,
            managers: staff.filter((s: any) => s.profile?.id).map((s: any) => ({ id: s.profile.id, name: s.name })),
            roles, branches, departmentLookups
        }
    }

    // HR INBOX (admin) — all 4 request models with correct pending statuses
    let inboxData: any = null
    if (currentTab === 'inbox' && isAdmin) {
        // RBAC scope: branch-scoped admins only see their branch's inbox
        const inboxAdminProfile = isGlobalSuperAdmin ? null : await (db as any).employeeProfile.findUnique({
            where: { userId: user.id }, select: { branchId: true },
        })
        const inboxAccessScope = (user as any).accessScope ?? 'ALL'
        const inboxBranchScoped = !isGlobalSuperAdmin && inboxAccessScope === 'BRANCH' && inboxAdminProfile?.branchId
        const inboxUserFilter = inboxBranchScoped
            ? { ...tenantFilter, user: { profile: { branchId: inboxAdminProfile!.branchId } } }
            : tenantFilter

        const LEAVE_PENDING   = { status: { in: ['PENDING_MANAGER', 'PENDING_HR', 'PENDING_ATTACHMENT'] } }
        const PERM_PENDING    = { status: { in: ['PENDING_MANAGER', 'PENDING_HR'] } }
        const LOAN_PENDING    = { status: { in: ['PENDING_MANAGER', 'PENDING_HR', 'PENDING_FINANCE', 'PENDING_GM'] } }
        const DOC_PENDING     = { status: { in: ['PROCESSING', 'PENDING_HR'] } }

        const [
            inboxLeaves, inboxPermissions, inboxLoans, inboxDocs,
            approvedLeaves, rejectedLeaves,
        ] = await Promise.all([
            (db as any).leaveRequest.findMany({
                where: { ...inboxUserFilter, ...LEAVE_PENDING },
                include: { user: { select: { id: true, name: true, email: true } } },
                orderBy: { createdAt: 'desc' }, take: 50
            }),
            (db as any).permissionRequest.findMany({
                where: { ...inboxUserFilter, ...PERM_PENDING },
                include: { user: { select: { id: true, name: true } } },
                orderBy: { createdAt: 'desc' }, take: 50
            }),
            (db as any).loanRequest.findMany({
                where: { ...tenantFilter, ...LOAN_PENDING },
                include: { profile: { include: { user: { select: { id: true, name: true } } } } },
                orderBy: { createdAt: 'desc' }, take: 50
            }),
            (db as any).documentRequest.findMany({
                where: { ...tenantFilter, ...DOC_PENDING },
                include: { profile: { include: { user: { select: { id: true, name: true } } } } },
                orderBy: { createdAt: 'desc' }, take: 50
            }),
            (db as any).leaveRequest.count({ where: { ...inboxUserFilter, status: 'APPROVED' } }),
            (db as any).leaveRequest.count({ where: { ...inboxUserFilter, status: 'REJECTED' } }),
        ])

        const totalPending = inboxLeaves.length + inboxPermissions.length + inboxLoans.length + inboxDocs.length
        inboxData = {
            totalPending,
            stats: {
                leaves: inboxLeaves.length,
                loans: inboxLoans.length,
                docsAndPerms: inboxDocs.length + inboxPermissions.length,
            },
            inboxLeaves, inboxPermissions, inboxLoans, inboxDocs,
            approvedLeaves, rejectedLeaves,
        }
    }

    return (
        <div className="space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-slate-200 pb-8">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-xl bg-slate-900 flex items-center justify-center shadow-lg">
                            <Users className="h-6 w-6 text-white" />
                        </div>
                        <h1 className="text-4xl font-black tracking-tight text-slate-900">HR HUB</h1>
                    </div>
                    <p className="text-slate-500 font-medium text-lg">Employee Portal & Human Resources Management.</p>
                </div>
                {isAdmin && (
                    <Badge className="bg-slate-900 text-white border-none px-4 py-2 text-xs font-black uppercase tracking-widest rounded-xl">
                        Admin View
                    </Badge>
                )}
            </div>

            {/* Tab Navigation */}
            <div className="sticky top-0 z-30 bg-white border-b border-slate-200 py-3 -mx-4 px-4">
                <div className="flex items-center gap-1 overflow-x-auto pb-1">
                    {visibleTabs.map((t) => {
                        const Icon = t.icon
                        const isActive = currentTab === t.id
                        return (
                            <Link key={t.id} href={`/admin/hr?tab=${t.id}`}>
                                <Button
                                    variant={isActive ? 'default' : 'ghost'}
                                    size="sm"
                                    className={cn(
                                        "rounded-lg px-4 font-black text-xs uppercase tracking-wider h-10 whitespace-nowrap gap-2",
                                        isActive ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-900"
                                    )}
                                >
                                    <Icon className="h-3.5 w-3.5" />
                                    {t.label}
                                </Button>
                            </Link>
                        )
                    })}
                </div>
            </div>

            {/* Tab Content */}
            {currentTab === 'dashboard'  && isAdmin && dashData    && <HRMasterDashboard data={dashData} />}
            {currentTab === 'portal'     && <MyPortalTab data={portalData} userName={user.name || user.email} />}
            {currentTab === 'attendance' && <PlaceholderTab title="Attendance Tracking" description="Time-tracking, clock-in/out records, and attendance sheets will appear here." icon={CalendarDays} comingSoon />}
            {currentTab === 'directory'  && isAdmin && adminData   && (
                <HRDashboardView
                    totalStaff={adminData.totalStaff} branchStats={adminData.branchStats}
                    pendingLeaves={adminData.pendingLeaves} financials={adminData.financials}
                    alerts={adminData.alerts} staff={adminData.staff} roles={adminData.roles}
                    managers={adminData.managers} branches={adminData.branches}
                    departmentLookups={adminData.departmentLookups}
                />
            )}
            {currentTab === 'inbox'      && isAdmin && inboxData   && <HRInboxClient data={inboxData} />}
            {currentTab === 'audit'      && isAdmin                && <PlaceholderTab title="System & Audit Logs" description="Full audit trail, login history, and system event logs will appear here." icon={Activity} comingSoon />}
        </div>
    )
}

// ── MY PORTAL TAB ─────────────────────────────────────────────────────────────

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function kpiGrade(score: number) {
    if (score >= 90) return { label: 'Excellent', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', bar: 'bg-emerald-500' }
    if (score >= 75) return { label: 'Good',      color: 'text-indigo-700',  bg: 'bg-indigo-50',  border: 'border-indigo-200',  bar: 'bg-indigo-500'  }
    if (score >= 50) return { label: 'Fair',       color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200',   bar: 'bg-amber-500'   }
    return                  { label: 'At Risk',    color: 'text-rose-700',    bg: 'bg-rose-50',    border: 'border-rose-200',    bar: 'bg-rose-500'    }
}

function MyPortalTab({ data, userName }: { data: any, userName: string }) {
    if (!data) return <PlaceholderTab title="Profile Unavailable" description="Your profile could not be loaded." icon={UserCircle} />

    const profile = data.profile
    const hrStats = profile?.hrStats
    const activeLoans: any[] = profile?.activeLoans || []
    const leaveRequests: any[] = data.leaveRequests || []
    const loanRequests: any[] = data.loanRequests || []
    const permissionRequests: any[] = data.permissionRequests || []
    const documentRequests: any[] = profile?.documentRequests || []
    const disciplinaryActions: any[] = data.disciplinaryActions || []
    const kpiData = data.kpiData || {}

    const annualTotal = hrStats?.annualLeaveTotal ?? 30
    const annualUsed = hrStats?.annualLeaveUsed ?? 0
    const sickTotal = hrStats?.sickLeaveTotal ?? 12
    const sickUsed = hrStats?.sickLeaveUsed ?? 0
    const emergencyTotal = hrStats?.emergencyLeaveTotal ?? 5
    const emergencyUsed = hrStats?.emergencyLeaveUsed ?? 0

    const totalLoanRemaining = activeLoans.reduce((s: number, l: any) => s + (l.remaining ?? 0), 0)
    const totalMonthlyDeduction = activeLoans.reduce((s: number, l: any) => s + (l.monthlyDeduction ?? 0), 0)

    const recentActivity = [
        ...leaveRequests.map((r: any) => ({ ...r, _kind: 'LEAVE', _label: `${r.type || 'Leave'} Request`, _date: r.createdAt })),
        ...loanRequests.map((r: any) => ({ ...r, _kind: 'LOAN', _label: `Loan — SAR ${r.amount?.toLocaleString()}`, _date: r.createdAt })),
        ...permissionRequests.map((r: any) => ({ ...r, _kind: 'PERMISSION', _label: `Permission (${r.hours}h)`, _date: r.createdAt })),
        ...documentRequests.map((r: any) => ({ ...r, _kind: 'DOCUMENT', _label: r.type?.replace(/_/g, ' '), _date: r.createdAt })),
    ].sort((a, b) => new Date(b._date).getTime() - new Date(a._date).getTime()).slice(0, 8)

    const DOC_LABEL: Record<string, string> = {
        SALARY_CERTIFICATE: 'Salary Certificate',
        EMPLOYMENT_LETTER: 'Employment Letter',
        EXPERIENCE_LETTER: 'Experience Letter',
        EXIT_REENTRY_VISA: 'Exit/Re-Entry Visa',
        NOC_LETTER: 'No Objection Letter',
        OTHER: 'Other Document',
    }

    const DOC_STATUS_STEPS = ['PROCESSING', 'APPROVED', 'COMPLETED']

    return (
        <div className="space-y-8">
            {/* Action Center — top of page */}
            <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-3">Submit a Request</h3>
                <RequestActionCenter />
            </div>

            {/* Profile Header */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <div className="flex items-start gap-5">
                    <div className="h-16 w-16 rounded-2xl bg-slate-900 flex items-center justify-center text-2xl font-black text-white flex-shrink-0 shadow-lg">
                        {(data.name || userName)?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="flex-1">
                        <h2 className="text-xl font-black text-slate-900">{data.name || userName}</h2>
                        <p className="text-slate-500 font-medium text-sm">{data.email}</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                            <Badge variant="outline" className="rounded-lg font-black text-xs uppercase border-slate-200">{data.role}</Badge>
                            {profile?.assignedBranch?.nameEn && (
                                <Badge variant="outline" className="rounded-lg font-bold text-xs border-slate-200 gap-1">
                                    <Building2 className="h-3 w-3" /> {profile.assignedBranch.nameEn}
                                </Badge>
                            )}
                            {profile?.position && (
                                <Badge variant="outline" className="rounded-lg font-bold text-xs border-slate-200 gap-1">
                                    <Briefcase className="h-3 w-3" /> {profile.position}
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Leave Balances */}
            <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-3">Leave Balances</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <LeaveBalanceCard label="Annual Leave" used={annualUsed} total={annualTotal} remaining={annualTotal - annualUsed} color="indigo" />
                    <LeaveBalanceCard label="Sick Leave" used={sickUsed} total={sickTotal} remaining={sickTotal - sickUsed} color="amber" />
                    <LeaveBalanceCard label="Emergency Leave" used={emergencyUsed} total={emergencyTotal} remaining={emergencyTotal - emergencyUsed} color="rose" />
                </div>
            </div>

            {/* Permissions & Short Leaves */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Permissions & Short Leaves</h3>
                    <Badge variant="outline" className="rounded-lg font-bold text-xs">{permissionRequests.length} requests</Badge>
                </div>
                {permissionRequests.length === 0 ? (
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl px-6 py-5 flex items-center gap-3 text-slate-400">
                        <Clock className="h-5 w-5 text-slate-300" />
                        <p className="text-sm font-medium">No permission requests submitted yet.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="divide-y divide-slate-50">
                            {permissionRequests.map((req: any) => (
                                <div key={req.id} className="flex items-center justify-between px-5 py-3.5">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                                            <Clock className="h-4 w-4 text-amber-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-slate-900">
                                                {req.hours}h on {new Date(req.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </p>
                                            {req.reason && <p className="text-[10px] text-slate-400 italic">"{req.reason}"</p>}
                                        </div>
                                    </div>
                                    <StatusPill status={req.status} />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Active Loans */}
            <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-3">Active Advances & Loans</h3>
                {activeLoans.length === 0 ? (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-6 py-5 flex items-center gap-4">
                        <CheckCircle2 className="h-6 w-6 text-emerald-500 flex-shrink-0" />
                        <div>
                            <p className="font-black text-emerald-800 text-sm">No Active Loans</p>
                            <p className="text-xs text-emerald-600 font-medium">You have no outstanding advances or salary loans.</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {activeLoans.map((loan: any) => <LoanCard key={loan.id} loan={loan} />)}
                        {activeLoans.length > 1 && (
                            <div className="bg-slate-900 rounded-2xl px-6 py-4 flex items-center justify-between text-white">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-0.5">Total Remaining</p>
                                    <p className="text-2xl font-black">SAR {fmt(totalLoanRemaining)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-0.5">Monthly Deduction</p>
                                    <p className="text-lg font-black text-amber-400">SAR {fmt(totalMonthlyDeduction)}</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Document Requests Tracker */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Document Requests</h3>
                    <Badge variant="outline" className="rounded-lg font-bold text-xs">{documentRequests.length} records</Badge>
                </div>
                {documentRequests.length === 0 ? (
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl px-6 py-5 flex items-center gap-3 text-slate-400">
                        <FileText className="h-5 w-5 text-slate-300" />
                        <p className="text-sm font-medium">No document requests yet.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="divide-y divide-slate-50">
                            {documentRequests.map((doc: any) => {
                                const stepIdx = DOC_STATUS_STEPS.indexOf(doc.status)
                                return (
                                    <div key={doc.id} className="px-5 py-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-sm font-black text-slate-900">
                                                {DOC_LABEL[doc.type] || doc.type?.replace(/_/g, ' ')}
                                            </p>
                                            <StatusPill status={doc.status} />
                                        </div>
                                        {doc.details && <p className="text-[10px] text-slate-400 italic mb-2">"{doc.details}"</p>}
                                        {/* Progress track */}
                                        <div className="flex items-center gap-1">
                                            {DOC_STATUS_STEPS.map((step, i) => (
                                                <div key={step} className="flex items-center gap-1 flex-1">
                                                    <div className={cn(
                                                        "h-1.5 flex-1 rounded-full transition-all",
                                                        i <= stepIdx ? "bg-emerald-500" : "bg-slate-100"
                                                    )} />
                                                    {i < DOC_STATUS_STEPS.length - 1 && (
                                                        <div className={cn("h-1.5 w-1.5 rounded-full", i < stepIdx ? "bg-emerald-500" : "bg-slate-200")} />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex justify-between mt-1">
                                            {DOC_STATUS_STEPS.map((step) => (
                                                <p key={step} className="text-[9px] font-bold text-slate-400 uppercase">{step}</p>
                                            ))}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Disciplinary Actions — only shown if records exist */}
            {disciplinaryActions.length > 0 && (
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="h-4 w-4 text-rose-500" />
                        <h3 className="text-sm font-black uppercase tracking-widest text-rose-500">Disciplinary Record</h3>
                    </div>
                    <div className="bg-white rounded-2xl border border-rose-100 shadow-sm overflow-hidden">
                        <div className="divide-y divide-rose-50">
                            {disciplinaryActions.map((action: any) => (
                                <div key={action.id} className="flex items-start justify-between px-5 py-4">
                                    <div className="flex items-start gap-3">
                                        <div className={cn(
                                            "h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5",
                                            action.type === 'WARNING' ? "bg-amber-100" : "bg-red-100"
                                        )}>
                                            <AlertTriangle className={cn("h-4 w-4", action.type === 'WARNING' ? "text-amber-600" : "text-red-600")} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-slate-900">
                                                {action.type === 'WARNING' ? 'Written Warning' : `Deduction — ${action.amountOrDays} ${action.amountOrDays <= 5 ? 'days' : 'SAR'}`}
                                            </p>
                                            <p className="text-[10px] text-slate-400 font-medium">
                                                {new Date(action.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </p>
                                            {action.reason && <p className="text-xs text-slate-500 italic mt-0.5">"{action.reason}"</p>}
                                        </div>
                                    </div>
                                    <Badge className={cn(
                                        "border-none font-black text-[9px] uppercase rounded-lg",
                                        action.type === 'WARNING' ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                                    )}>
                                        {action.type}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Performance & KPI ─────────────────────────────────────── */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Performance & KPI</h3>
                    <Badge variant="outline" className="rounded-lg font-bold text-xs border-slate-200">
                        {MONTH_NAMES[(kpiData.month ?? new Date().getMonth() + 1) - 1]} {kpiData.year ?? new Date().getFullYear()}
                    </Badge>
                </div>

                {/* Monthly summary strip */}
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { label: 'Hours Logged', value: kpiData.monthlySummary?.hoursLogged ?? '—', sub: 'of 176 required', color: 'indigo' },
                        { label: 'Tasks Done',    value: kpiData.monthlySummary?.tasksCompleted ?? '—', sub: 'this month', color: 'emerald' },
                        { label: 'Projects',      value: kpiData.monthlySummary?.projectsWorkedOn ?? '—', sub: 'worked on', color: 'violet' },
                    ].map(s => {
                        const c = s.color === 'indigo'
                            ? 'bg-indigo-50 border-indigo-100 text-indigo-700'
                            : s.color === 'emerald'
                                ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                                : 'bg-violet-50 border-violet-100 text-violet-700'
                        return (
                            <div key={s.label} className={cn("rounded-2xl border p-4 text-center", c)}>
                                <p className="text-3xl font-black">{s.value}</p>
                                <p className="text-[10px] font-black uppercase tracking-wide mt-1 opacity-70">{s.label}</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">{s.sub}</p>
                            </div>
                        )
                    })}
                </div>

                {/* Current month KPI score card */}
                {kpiData.current ? (() => {
                    const kpi = kpiData.current
                    const g   = kpiGrade(kpi.totalScore)
                    let bd: any = null
                    try { bd = JSON.parse(kpi.breakdown || '{}') } catch {}
                    return (
                        <div className={cn("rounded-2xl border p-5 space-y-4", g.bg, g.border)}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Composite KPI Score</p>
                                    <div className="flex items-baseline gap-2 mt-1">
                                        <span className={cn("text-5xl font-black", g.color)}>{kpi.totalScore}</span>
                                        <span className="text-lg font-bold text-slate-400">/ 100</span>
                                    </div>
                                </div>
                                <Badge className={cn("border-none text-xs font-black uppercase px-3 py-1.5 rounded-xl", g.bg, g.color)}>
                                    {g.label}
                                </Badge>
                            </div>
                            {/* Progress bar */}
                            <div className="h-2.5 bg-white/60 rounded-full overflow-hidden">
                                <div className={cn("h-full rounded-full transition-all", g.bar)} style={{ width: `${kpi.totalScore}%` }} />
                            </div>
                            {/* Component breakdown */}
                            <div className="grid grid-cols-3 gap-3 text-center">
                                <div className="bg-white/60 rounded-xl p-3">
                                    <p className="text-lg font-black text-slate-900">{kpi.taskScore}</p>
                                    <p className="text-[9px] font-black uppercase tracking-wide text-slate-500">Tasks<br/>/ 50 pts</p>
                                </div>
                                <div className="bg-white/60 rounded-xl p-3">
                                    <p className="text-lg font-black text-slate-900">{kpi.timesheetScore}</p>
                                    <p className="text-[9px] font-black uppercase tracking-wide text-slate-500">Timesheet<br/>/ 30 pts</p>
                                </div>
                                <div className="bg-white/60 rounded-xl p-3">
                                    <p className="text-lg font-black text-rose-600">−{kpi.disciplinePenalty}</p>
                                    <p className="text-[9px] font-black uppercase tracking-wide text-slate-500">Discipline<br/>penalty</p>
                                </div>
                            </div>
                            {/* How it's calculated tooltip / accordion */}
                            <details className="text-xs text-slate-500 cursor-pointer">
                                <summary className="font-black text-slate-700 list-none flex items-center gap-1 cursor-pointer">
                                    <span className="underline underline-offset-2">How is this calculated?</span>
                                </summary>
                                <div className="mt-3 space-y-2 border-t border-slate-200 pt-3">
                                    {bd?.tasks && <p><span className="font-bold text-slate-700">Tasks (max 50):</span> {bd.tasks.completed}/{bd.tasks.total} completed, {bd.tasks.overdue} overdue. {bd.tasks.note}</p>}
                                    {bd?.timesheet && <p><span className="font-bold text-slate-700">Timesheet (max 30):</span> {bd.timesheet.logged}h logged of {bd.timesheet.required}h required. {bd.timesheet.note}</p>}
                                    {bd?.discipline && <p><span className="font-bold text-slate-700">Discipline (max −20):</span> {bd.discipline.count} record(s). {bd.discipline.note}</p>}
                                </div>
                            </details>
                            {kpi.feedback && (
                                <div className="bg-white/70 rounded-xl px-4 py-3 border border-white/50">
                                    <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Manager Feedback</p>
                                    <p className="text-sm text-slate-700 italic">"{kpi.feedback}"</p>
                                </div>
                            )}
                        </div>
                    )
                })() : (
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 flex items-center gap-3 text-slate-400">
                        <ShieldAlert className="h-5 w-5 text-slate-300 flex-shrink-0" />
                        <div>
                            <p className="text-sm font-bold text-slate-600">KPI not yet calculated for this month</p>
                            <p className="text-xs text-slate-400">Your HR Admin will run the evaluation at month-end.</p>
                        </div>
                    </div>
                )}

                {/* KPI History table */}
                {(kpiData.history?.length ?? 0) > 0 && (
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">History — Last {kpiData.history.length} Months</p>
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                            <div className="divide-y divide-slate-50">
                                {kpiData.history.map((rec: any) => {
                                    const g = kpiGrade(rec.totalScore)
                                    return (
                                        <div key={rec.id} className="flex items-center justify-between px-5 py-3.5">
                                            <div className="flex items-center gap-3">
                                                <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center text-[10px] font-black flex-shrink-0", g.bg, g.color)}>
                                                    {MONTH_NAMES[rec.month - 1]?.slice(0, 3)}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-black text-slate-900">{MONTH_NAMES[rec.month - 1]} {rec.year}</p>
                                                    <p className="text-[10px] text-slate-400 font-medium">Tasks {rec.taskScore}pt · Sheet {rec.timesheetScore}pt · Disc −{rec.disciplinePenalty}pt</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                                                    <div className={cn("h-full rounded-full", g.bar)} style={{ width: `${rec.totalScore}%` }} />
                                                </div>
                                                <span className={cn("text-sm font-black w-10 text-right", g.color)}>{rec.totalScore}</span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Request History */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Request History</h3>
                    <Badge variant="outline" className="rounded-lg font-bold text-xs">{recentActivity.length} records</Badge>
                </div>
                {recentActivity.length === 0 ? (
                    <div className="bg-slate-50 rounded-2xl border border-slate-100 p-8 text-center text-slate-400">
                        <FileText className="h-8 w-8 mx-auto mb-2 text-slate-200" />
                        <p className="font-bold text-sm">No activity yet.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="divide-y divide-slate-50">
                            {recentActivity.map((item: any, i: number) => {
                                const iconMap: Record<string, { bg: string, icon: any, color: string }> = {
                                    LEAVE: { bg: 'bg-indigo-100', icon: CalendarDays, color: 'text-indigo-600' },
                                    LOAN: { bg: 'bg-violet-100', icon: CreditCard, color: 'text-violet-600' },
                                    PERMISSION: { bg: 'bg-amber-100', icon: Clock, color: 'text-amber-600' },
                                    DOCUMENT: { bg: 'bg-emerald-100', icon: FileText, color: 'text-emerald-600' },
                                }
                                const ic = iconMap[item._kind] ?? iconMap.LEAVE
                                const IconComp = ic.icon
                                return (
                                    <div key={item.id ?? i} className="flex items-center justify-between px-5 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0", ic.bg)}>
                                                <IconComp className={cn("h-4 w-4", ic.color)} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-slate-900">{item._label}</p>
                                                <p className="text-[10px] text-slate-400 font-medium">
                                                    {new Date(item._date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
                                                    {item._kind === 'LEAVE' && item.startDate && ` · ${new Date(item.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} — ${new Date(item.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`}
                                                    {item._kind === 'PERMISSION' && item.date && ` · ${new Date(item.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`}
                                                </p>
                                            </div>
                                        </div>
                                        <StatusPill status={item.status} />
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

// ── SHARED COMPONENTS ─────────────────────────────────────────────────────────


function LeaveBalanceCard({ label, used, total, remaining, color }: { label: string, used: number, total: number, remaining: number, color: 'indigo' | 'amber' | 'rose' }) {
    const pct = total > 0 ? Math.round((used / total) * 100) : 0
    const colorMap = {
        indigo: { bar: 'bg-indigo-500', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-100', badge: 'bg-indigo-100 text-indigo-700' },
        amber:  { bar: 'bg-amber-500',  bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-100',  badge: 'bg-amber-100 text-amber-700'  },
        rose:   { bar: 'bg-rose-500',   bg: 'bg-rose-50',   text: 'text-rose-700',   border: 'border-rose-100',   badge: 'bg-rose-100 text-rose-700'   },
    }
    const c = colorMap[color]

    return (
        <div className={cn("rounded-2xl border p-5", c.bg, c.border)}>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">{label}</p>
            <div className="flex items-baseline gap-2 mb-3">
                <span className={cn("text-4xl font-black", c.text)}>{remaining}</span>
                <span className="text-sm font-bold text-slate-400">/ {total} days</span>
            </div>
            <div className="h-1.5 bg-white/60 rounded-full overflow-hidden mb-2">
                <div className={cn("h-full rounded-full transition-all", c.bar)} style={{ width: `${pct}%` }} />
            </div>
            <p className="text-[10px] font-medium text-slate-500">{used} used · {remaining} remaining</p>
        </div>
    )
}

function LoanCard({ loan }: { loan: any }) {
    const pctPaid = loan.totalAmount > 0 ? Math.round((loan.paidAmount / loan.totalAmount) * 100) : 0

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-violet-100 flex items-center justify-center">
                        <CreditCard className="h-5 w-5 text-violet-600" />
                    </div>
                    <div>
                        <p className="font-black text-slate-900 text-sm">Salary Advance / Loan</p>
                        <p className="text-xs text-slate-400 font-medium">SAR {loan.monthlyDeduction?.toLocaleString()} / month deduction</p>
                    </div>
                </div>
                <Badge className="bg-violet-100 text-violet-700 border-none font-black text-xs rounded-lg uppercase">Active</Badge>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Total Amount</p>
                    <p className="font-black text-slate-900">SAR {loan.totalAmount?.toLocaleString()}</p>
                </div>
                <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Remaining</p>
                    <p className="font-black text-rose-600">SAR {loan.remaining?.toLocaleString()}</p>
                </div>
            </div>
            <div>
                <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] font-medium text-slate-400">Repayment Progress</p>
                    <p className="text-[10px] font-black text-slate-700">{pctPaid}%</p>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${pctPaid}%` }} />
                </div>
            </div>
        </div>
    )
}

function StatusPill({ status }: { status: string }) {
    const map: Record<string, string> = {
        PENDING: 'bg-amber-100 text-amber-700',
        PENDING_MANAGER: 'bg-amber-100 text-amber-700',
        PENDING_HR: 'bg-amber-100 text-amber-700',
        PENDING_ATTACHMENT: 'bg-orange-100 text-orange-700',
        APPROVED: 'bg-emerald-100 text-emerald-700',
        REJECTED: 'bg-red-100 text-red-700',
        ACTIVE: 'bg-indigo-100 text-indigo-700',
        COMPLETED: 'bg-slate-100 text-slate-600',
    }
    const label = status?.replace(/_/g, ' ') || status
    return (
        <Badge className={cn("border-none font-black text-[10px] uppercase rounded-lg whitespace-nowrap", map[status] || 'bg-slate-100 text-slate-600')}>
            {label}
        </Badge>
    )
}

function PlaceholderTab({ title, description, icon: Icon, comingSoon }: { title: string, description: string, icon: any, comingSoon?: boolean }) {
    return (
        <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="h-20 w-20 rounded-3xl bg-slate-100 flex items-center justify-center mb-6">
                <Icon className="h-10 w-10 text-slate-300" />
            </div>
            <h3 className="text-xl font-black text-slate-700 mb-2">{title}</h3>
            <p className="text-slate-400 font-medium max-w-sm leading-relaxed">{description}</p>
            {comingSoon && (
                <Badge className="mt-6 bg-indigo-100 text-indigo-700 border-none font-black text-xs uppercase tracking-widest rounded-xl px-4 py-2">
                    Coming Soon
                </Badge>
            )}
        </div>
    )
}
