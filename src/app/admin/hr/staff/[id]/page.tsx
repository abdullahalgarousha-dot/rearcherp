import { auth } from "@/auth"
import { notFound, redirect } from "next/navigation"
import { db } from "@/lib/db"
import { BackButton } from "@/components/ui/back-button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Mail, Globe, Calendar, Briefcase, MapPin, User, FileText, CreditCard, Building2, Wallet, CalendarDays, Clock, AlertTriangle, CheckCircle2, XCircle, Activity } from "lucide-react"
import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"
import { EditStaffDialog } from "@/components/hr/edit-staff-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { format } from "date-fns"
import { calculateNetSalary } from "@/lib/payroll-engine"
import { KPIHistorySection } from "@/components/hr/kpi-history-section"

export default async function StaffProfilePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const session = await auth()
    const currentUser = (session?.user as any)
    const canViewSensitive = ['GLOBAL_SUPER_ADMIN', 'SUPER_ADMIN', 'ADMIN', 'HR'].includes(currentUser?.role)
    const isOwnProfile = currentUser?.id === id

    if (!canViewSensitive && !isOwnProfile) {
        redirect('/admin/hr')
    }

    const employee = await (db as any).user.findUnique({
        where: { id },
        include: {
            profile: {
                include: {
                    assignedBranch: true,
                    hrStats: true,
                    activeLoans: { where: { status: { in: ['ACTIVE', 'SETTLED'] } }, orderBy: { createdAt: 'desc' } },
                }
            },
            leaveRequests:       { orderBy: { createdAt: 'desc' }, take: 50 },
            permissionRequests:  { orderBy: { createdAt: 'desc' }, take: 20 },
            disciplinaryActions: { orderBy: { date: 'desc' }, take: 20 },
        }
    })

    if (!employee) notFound()

    const payroll = await calculateNetSalary(id)

    // KPI history for this employee (last 12 months)
    const kpiHistory = await (db as any).kpiEvaluation.findMany({
        where: { userId: id },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        take: 12,
        include: { evaluator: { select: { name: true } } },
    }).catch(() => [])

    // KPI: Task completion rate for this employee
    const assignedTasks = await (db as any).task.findMany({
        where: { assignees: { some: { id } } },
        select: { id: true, status: true }
    })
    const totalTasks = assignedTasks.length
    const doneTasks = assignedTasks.filter((t: any) => t.status === 'DONE').length
    const inProgressTasks = assignedTasks.filter((t: any) => t.status === 'IN_PROGRESS').length
    const underReviewTasks = assignedTasks.filter((t: any) => t.status === 'UNDER_REVIEW').length
    const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0

    const allStaff = await (db as any).user.findMany({
        where: { profile: { isNot: null } },
        include: { profile: { select: { id: true } } }
    })

    const managers = allStaff.map((s: any) => ({ id: s.profile.id, name: s.name }))

    const isGlobalSuperAdmin = currentUser?.role === 'GLOBAL_SUPER_ADMIN'
    const roleFilter = isGlobalSuperAdmin ? {} : { tenantId: currentUser?.tenantId }

    const [branches, roles] = await Promise.all([
        (db as any).branch.findMany({ orderBy: { nameEn: 'asc' } }),
        (db as any).role.findMany({
            where: roleFilter,
            select: { id: true, name: true },
            orderBy: { name: 'asc' }
        }),
    ])

    // Spread profile first so that employee's core fields (like 'id', which is User ID) override profile fields
    const composedStaff = { ...employee.profile, ...employee, branchId: employee.profile?.branchId || '' }

    return (
        <div className="space-y-8 rtl:text-right pb-20">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <BackButton />
                        <h1 className="text-3xl font-black tracking-tight text-slate-900">Staff Profile | ملف الموظف</h1>
                    </div>
                </div>
                {canViewSensitive && (
                    <EditStaffDialog
                        staff={composedStaff}
                        managers={managers}
                        branches={branches}
                        roles={roles}
                        currentUserRole={currentUser?.role}
                    />
                )}
            </div>

            <div className="grid gap-8 lg:grid-cols-12">
                {/* Left Sidebar (Persistent Profile Card) */}
                <div className="lg:col-span-4 space-y-6">
                    <Card className="border-none shadow-xl bg-white sticky top-24 overflow-hidden">
                        <div className={`h-24 w-full ${employee.profile?.legacyBranch === 'Cairo' || employee.profile?.assignedBranch?.currencyCode === 'EGP' ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
                        <div className="px-6 relative">
                            <div className="h-24 w-24 rounded-full bg-white p-1 absolute -top-12 border-4 border-slate-50 shadow-sm flex items-center justify-center text-slate-400">
                                <User className="h-12 w-12" />
                            </div>
                        </div>
                        <CardContent className="pt-16 pb-8 space-y-6">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900">{employee.name}</h2>
                                <p className="text-sm text-slate-500 font-medium">{employee.role}</p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <Badge variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-slate-200">
                                    {employee.profile?.assignedBranch?.nameEn || employee.profile?.legacyBranch || "Unassigned"} Branch
                                </Badge>
                                <Badge variant="outline" className={`
                                    ${(employee.profile?.assignedBranch?.currencyCode || employee.profile?.legacyCurrency) === 'SAR' ? 'text-emerald-600 border-emerald-200 bg-emerald-50' : ''}
                                    ${(employee.profile?.assignedBranch?.currencyCode || employee.profile?.legacyCurrency) === 'EGP' ? 'text-amber-600 border-amber-200 bg-amber-50' : ''}
                                `}>
                                    {employee.profile?.assignedBranch?.currencyCode || employee.profile?.legacyCurrency || "No Currency"}
                                </Badge>
                            </div>

                            <Separator />

                            <div className="space-y-3 text-sm">
                                <div className="flex items-center gap-3 text-slate-600">
                                    <Mail className="h-4 w-4 text-slate-400" />
                                    <span className="truncate">{employee.email}</span>
                                </div>
                                {employee.googleEmail && (
                                    <div className="flex items-center gap-3 text-slate-600">
                                        <Globe className="h-4 w-4 text-slate-400" />
                                        <span className="truncate">{employee.googleEmail}</span>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right ContentTabs */}
                <div className="lg:col-span-8">
                    <Tabs defaultValue="personal" className="w-full">
                        <TabsList className="bg-white p-1 rounded-xl shadow-sm mb-6 border border-slate-100 w-full justify-start h-auto flex-wrap">
                            <TabsTrigger value="personal" className="rounded-lg py-2.5 px-4 data-[state=active]:bg-slate-900 data-[state=active]:text-white flex gap-2">
                                <User className="h-4 w-4" />
                                Personal Info
                            </TabsTrigger>
                            <TabsTrigger value="legal" className="rounded-lg py-2.5 px-4 data-[state=active]:bg-slate-900 data-[state=active]:text-white flex gap-2">
                                <FileText className="h-4 w-4" />
                                Legal Documents
                            </TabsTrigger>
                            {canViewSensitive && (
                                <TabsTrigger value="financial" className="rounded-lg py-2.5 px-4 data-[state=active]:bg-slate-900 data-[state=active]:text-white flex gap-2">
                                    <CreditCard className="h-4 w-4" />
                                    Financial & Contract
                                </TabsTrigger>
                            )}
                            <TabsTrigger value="kpi" className="rounded-lg py-2.5 px-4 data-[state=active]:bg-slate-900 data-[state=active]:text-white flex gap-2">
                                <Briefcase className="h-4 w-4" />
                                KPI & Tasks
                            </TabsTrigger>
                            {canViewSensitive && (
                                <TabsTrigger value="hr-history" className="rounded-lg py-2.5 px-4 data-[state=active]:bg-slate-900 data-[state=active]:text-white flex gap-2">
                                    <Activity className="h-4 w-4" />
                                    HR History
                                </TabsTrigger>
                            )}
                        </TabsList>

                        {/* 1. Personal Tab */}
                        <TabsContent value="personal" className="space-y-6">
                            <Card className="border-none shadow-sm bg-white">
                                <CardHeader>
                                    <CardTitle>Personal Details</CardTitle>
                                    <CardDescription>Basic information and contact details.</CardDescription>
                                </CardHeader>
                                <CardContent className="grid gap-6 md:grid-cols-2">
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground uppercase">Full Name</Label>
                                        <p className="font-medium text-slate-900">{employee.name}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground uppercase">Nationality</Label>
                                        <p className="font-medium text-slate-900">{employee.nationality || "—"}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground uppercase">Official Email</Label>
                                        <p className="font-medium text-slate-900">{employee.googleEmail || "—"}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground uppercase">System Email</Label>
                                        <p className="font-medium text-slate-900">{employee.email}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* 2. Legal Tab */}
                        <TabsContent value="legal" className="space-y-6">
                            {/* Passport */}
                            <Card className="border-none shadow-md bg-white overflow-hidden">
                                <div className="h-1 bg-slate-900"></div>
                                <CardHeader>
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <Globe className="h-4 w-4 text-slate-500" />
                                        Passport Details
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="grid gap-6 md:grid-cols-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground uppercase">Passport No.</Label>
                                        <p className="font-mono font-bold text-slate-900">{employee.profile?.passportNum || "—"}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground uppercase">Issue Date</Label>
                                        <p className="text-sm">—</p>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground uppercase">Expiry Date</Label>
                                        <p className={`text-sm font-bold ${employee.profile?.passportExpiry && new Date(employee.profile?.passportExpiry) < new Date() ? 'text-red-600' : 'text-slate-900'}`}>
                                            {employee.profile?.passportExpiry ? format(employee.profile?.passportExpiry, 'dd/MM/yyyy') : "—"}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Iqama/ID */}
                            <Card className="border-none shadow-md bg-white overflow-hidden">
                                <div className="h-1 bg-slate-900"></div>
                                <CardHeader>
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-slate-500" />
                                        Iqama / National ID
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="grid gap-6 md:grid-cols-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground uppercase">ID Number</Label>
                                        <p className="font-mono font-bold text-slate-900">{employee.profile?.idNumber || "—"}</p>
                                    </div>
                                    <div className="space-y-1 col-span-2">
                                        <Label className="text-xs text-muted-foreground uppercase">Expiry Date</Label>
                                        <p className={`text-sm font-bold ${employee.profile?.idExpiry && new Date(employee.profile?.idExpiry) < new Date() ? 'text-red-600' : 'text-slate-900'}`}>
                                            {employee.profile?.idExpiry ? format(employee.profile?.idExpiry, 'dd/MM/yyyy') : "—"}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Insurance */}
                            <Card className="border-none shadow-md bg-white overflow-hidden">
                                <div className="h-1 bg-emerald-500"></div>
                                <CardHeader>
                                    <CardTitle className="text-base flex items-center gap-2 text-emerald-700">
                                        <Building2 className="h-4 w-4" />
                                        Health Insurance
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="grid gap-6 md:grid-cols-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground uppercase">Provider</Label>
                                        <p className="font-bold text-slate-900">{employee.profile?.insuranceProvider || "—"}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground uppercase">Policy No.</Label>
                                        <p className="font-mono text-sm">{employee.profile?.insurancePolicy || "—"}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground uppercase">Expiry Date</Label>
                                        <p className={`text-sm font-bold ${employee.profile?.insuranceExpiry && new Date(employee.profile?.insuranceExpiry) < new Date() ? 'text-red-600' : 'text-slate-900'}`}>
                                            {employee.profile?.insuranceExpiry ? format(employee.profile?.insuranceExpiry, 'dd/MM/yyyy') : "—"}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* 3. Financial Tab (Protected) */}
                        {canViewSensitive && (
                            <TabsContent value="financial" className="space-y-6">
                                <Card className="border-none shadow-xl bg-gradient-to-br from-slate-900 to-slate-800 text-white">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-slate-200">
                                            <Briefcase className="h-5 w-5" />
                                            Employment Contract
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="grid gap-6 md:grid-cols-3">
                                        <div className="space-y-1">
                                            <Label className="text-xs text-slate-400 uppercase">Current Role</Label>
                                            <p className="font-bold text-xl">{employee.role}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs text-slate-400 uppercase">Hire Date</Label>
                                            <p className="font-bold text-xl">{employee.profile?.hireDate ? format(employee.profile.hireDate, 'MMM d, yyyy') : "—"}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs text-slate-400 uppercase">Assigned Branch</Label>
                                            <div className="flex items-center gap-2">
                                                <MapPin className="h-4 w-4 text-slate-400" />
                                                <span className="font-bold text-xl">{employee.profile?.assignedBranch?.nameEn || employee.profile?.legacyBranch || "Headquarters"}</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <div className="grid gap-6 md:grid-cols-1">
                                    <Card className="border-none shadow-md bg-slate-50">
                                        <CardHeader>
                                            <CardTitle className="text-sm font-bold uppercase text-muted-foreground">Basic Contract Salary</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-4xl font-black text-slate-900 tracking-tight">
                                                {(employee.profile?.basicSalary ?? 0).toLocaleString()} <span className="text-sm font-medium text-slate-400">{employee.profile?.assignedBranch?.currencyCode || "SAR"}</span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                <Card className="border-none shadow-xl bg-slate-50 overflow-hidden mt-6">
                                    <div className="h-2 bg-indigo-500"></div>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Wallet className="h-5 w-5 text-indigo-500" />
                                            Live Payroll Preview (Current Month)
                                        </CardTitle>
                                        <CardDescription>Estimated net salary based on current data.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            {/* Income Section */}
                                            <div className="space-y-4">
                                                <h3 className="text-sm font-bold uppercase text-emerald-600 border-b pb-2">Income</h3>
                                                <div className="space-y-2 text-sm">
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-500">Basic Salary</span>
                                                        <span className="font-medium">{(payroll?.income?.basic ?? 0).toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-500">Housing Allowance</span>
                                                        <span className="font-medium">{(payroll?.income?.housing ?? 0).toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-500">Transport Allowance</span>
                                                        <span className="font-medium">{(payroll?.income?.transport ?? 0).toLocaleString()}</span>
                                                    </div>
                                                    {(payroll?.income?.other ?? 0) > 0 && (
                                                        <div className="flex justify-between">
                                                            <span className="text-slate-500">Other Allowances</span>
                                                            <span className="font-medium">{(payroll?.income?.other ?? 0).toLocaleString()}</span>
                                                        </div>
                                                    )}
                                                    <div className="flex justify-between pt-2 border-t font-bold text-slate-900">
                                                        <span>Total Income</span>
                                                        <span>{(payroll?.income?.total ?? 0).toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Deductions Section */}
                                            <div className="space-y-4">
                                                <h3 className="text-sm font-bold uppercase text-rose-600 border-b pb-2">Deductions</h3>
                                                <div className="space-y-2 text-sm">
                                                    {(payroll?.deductions.gosi ?? 0) > 0 && (
                                                        <div className="flex justify-between">
                                                            <span className="text-slate-500">GOSI / Insurance</span>
                                                            <span className="font-medium text-rose-600">-{payroll!.deductions.gosi.toLocaleString()}</span>
                                                        </div>
                                                    )}
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-500">Penalties ({payroll?.meta?.penaltyCount ?? 0})</span>
                                                        <span className="font-medium text-rose-600">-{(payroll?.deductions?.penalties ?? 0).toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-500">Loan Installments ({payroll?.meta?.loanCount ?? 0})</span>
                                                        <span className="font-medium text-rose-600">-{(payroll?.deductions?.loans ?? 0).toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex justify-between pt-2 border-t font-bold text-slate-900">
                                                        <span>Total Deductions</span>
                                                        <span className="text-rose-600">-{(payroll?.deductions?.total ?? 0).toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-slate-900 text-white p-6 rounded-xl flex justify-between items-center shadow-lg">
                                            <div>
                                                <p className="text-sm text-slate-400 font-medium uppercase tracking-wider">Estimated Net Salary</p>
                                                <p className="text-xs text-rose-400 mt-1 font-bold">* Internal Estimated Payroll for cost tracking, not the official Mudad submission.</p>
                                            </div>
                                            <div className="text-3xl font-black tracking-tight">
                                                {(payroll?.netSalary ?? 0).toLocaleString()} <span className="text-lg font-medium text-indigo-400">{payroll?.meta?.currency ?? "SAR"}</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        )}

                        {/* KPI & Tasks Tab */}
                        <TabsContent value="kpi" className="space-y-6">
                            {/* Task completion (from Gantt Task model) */}
                            <Card className="border-none shadow-sm bg-white">
                                <CardHeader>
                                    <CardTitle className="text-base font-black flex items-center gap-2">
                                        <Briefcase className="h-5 w-5 text-primary" />
                                        Task Completion Rate
                                    </CardTitle>
                                    <CardDescription>All-time rate across assigned project tasks.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {totalTasks === 0 ? (
                                        <p className="text-sm text-slate-400 italic">No tasks assigned yet.</p>
                                    ) : (
                                        <div className="space-y-6">
                                            <div className="flex items-end gap-4">
                                                <div>
                                                    <p className="text-6xl font-black text-slate-900">{completionRate}%</p>
                                                    <p className="text-sm text-slate-500 font-medium mt-1">Completion Rate</p>
                                                </div>
                                                <p className="text-sm text-slate-400 mb-2">{doneTasks} of {totalTasks} tasks done</p>
                                            </div>
                                            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all" style={{ width: `${completionRate}%` }} />
                                            </div>
                                            <div className="grid grid-cols-4 gap-3">
                                                {[
                                                    { label: 'Done',         count: doneTasks,                                                    color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
                                                    { label: 'Under Review', count: underReviewTasks,                                              color: 'text-violet-700 bg-violet-50 border-violet-200'   },
                                                    { label: 'In Progress',  count: inProgressTasks,                                               color: 'text-blue-700 bg-blue-50 border-blue-200'         },
                                                    { label: 'To Do',        count: totalTasks - doneTasks - underReviewTasks - inProgressTasks,   color: 'text-slate-600 bg-slate-50 border-slate-200'       },
                                                ].map(item => (
                                                    <div key={item.label} className={`rounded-2xl border p-3 text-center ${item.color}`}>
                                                        <p className="text-2xl font-black">{item.count}</p>
                                                        <p className="text-[10px] font-bold uppercase tracking-wide mt-0.5">{item.label}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* KPI History — evaluated monthly scores */}
                            <KPIHistorySection
                                userId={id}
                                history={kpiHistory}
                                canEvaluate={canViewSensitive}
                            />
                        </TabsContent>

                        {/* ── HR HISTORY TAB ──────────────────────────────── */}
                        {canViewSensitive && (
                            <TabsContent value="hr-history" className="space-y-8">

                                {/* Leave Balance Summary */}
                                {employee.profile?.hrStats && (
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Leave Balances</p>
                                        <div className="grid grid-cols-3 gap-3">
                                            {[
                                                { label: 'Annual', used: employee.profile.hrStats.annualLeaveUsed, total: employee.profile.hrStats.annualLeaveTotal, color: 'indigo' },
                                                { label: 'Sick', used: employee.profile.hrStats.sickLeaveUsed, total: employee.profile.hrStats.sickLeaveTotal, color: 'amber' },
                                                { label: 'Emergency', used: employee.profile.hrStats.emergencyLeaveUsed, total: employee.profile.hrStats.emergencyLeaveTotal, color: 'rose' },
                                            ].map(b => {
                                                const rem = b.total - b.used
                                                const pct = b.total > 0 ? Math.round((b.used / b.total) * 100) : 0
                                                const barColor = b.color === 'indigo' ? 'bg-indigo-500' : b.color === 'amber' ? 'bg-amber-500' : 'bg-rose-500'
                                                const bgColor = b.color === 'indigo' ? 'bg-indigo-50 border-indigo-100' : b.color === 'amber' ? 'bg-amber-50 border-amber-100' : 'bg-rose-50 border-rose-100'
                                                const textColor = b.color === 'indigo' ? 'text-indigo-700' : b.color === 'amber' ? 'text-amber-700' : 'text-rose-700'
                                                return (
                                                    <div key={b.label} className={cn("rounded-2xl border p-4", bgColor)}>
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">{b.label} Leave</p>
                                                        <p className={cn("text-3xl font-black", textColor)}>{rem}<span className="text-sm font-bold text-slate-400 ml-1">/ {b.total}</span></p>
                                                        <div className="h-1.5 bg-white/60 rounded-full mt-2 overflow-hidden">
                                                            <div className={cn("h-full rounded-full", barColor)} style={{ width: `${pct}%` }} />
                                                        </div>
                                                        <p className="text-[10px] text-slate-400 mt-1">{b.used} used</p>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Disciplinary Timeline */}
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <AlertTriangle className="h-4 w-4 text-rose-500" />
                                        <p className="text-xs font-black uppercase tracking-widest text-rose-500">Disciplinary Record</p>
                                        <Badge className={cn(
                                            "ml-auto border-none text-[10px] font-black uppercase rounded-lg",
                                            employee.disciplinaryActions?.length > 0 ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-500"
                                        )}>
                                            {employee.disciplinaryActions?.length ?? 0} records
                                        </Badge>
                                    </div>
                                    {!employee.disciplinaryActions?.length ? (
                                        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-5 py-4 flex items-center gap-3">
                                            <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                                            <p className="text-sm font-bold text-emerald-700">No disciplinary actions on record.</p>
                                        </div>
                                    ) : (
                                        <div className="bg-white rounded-2xl border border-rose-100 shadow-sm overflow-hidden">
                                            <div className="divide-y divide-rose-50">
                                                {employee.disciplinaryActions.map((action: any) => (
                                                    <div key={action.id} className="flex items-start gap-4 px-5 py-4">
                                                        <div className={cn(
                                                            "h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5",
                                                            action.type === 'WARNING' ? "bg-amber-100" : "bg-red-100"
                                                        )}>
                                                            <AlertTriangle className={cn("h-4 w-4", action.type === 'WARNING' ? "text-amber-600" : "text-red-600")} />
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex items-center justify-between">
                                                                <p className="text-sm font-black text-slate-900">
                                                                    {action.type === 'WARNING' ? 'Written Warning' : `Salary Deduction — ${action.amountOrDays} ${action.amountOrDays <= 5 ? 'days' : 'SAR'}`}
                                                                </p>
                                                                <Badge className={cn(
                                                                    "border-none font-black text-[9px] uppercase rounded-lg ml-2 flex-shrink-0",
                                                                    action.type === 'WARNING' ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                                                                )}>
                                                                    {action.type}
                                                                </Badge>
                                                            </div>
                                                            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                                                                {new Date(action.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                            </p>
                                                            {action.reason && <p className="text-xs text-slate-500 italic mt-1">"{action.reason}"</p>}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Leave Request History */}
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <CalendarDays className="h-4 w-4 text-indigo-500" />
                                        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Leave History</p>
                                        <Badge variant="outline" className="ml-auto rounded-lg font-bold text-xs">
                                            {employee.leaveRequests?.length ?? 0} requests
                                        </Badge>
                                    </div>
                                    {!employee.leaveRequests?.length ? (
                                        <div className="bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm text-slate-400 font-medium">
                                            No leave requests on record.
                                        </div>
                                    ) : (
                                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                            <div className="divide-y divide-slate-50">
                                                {employee.leaveRequests.map((req: any) => (
                                                    <div key={req.id} className="flex items-center justify-between px-5 py-3.5">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-8 w-8 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                                                                <CalendarDays className="h-4 w-4 text-indigo-600" />
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-black text-slate-900">
                                                                    {req.type} Leave
                                                                </p>
                                                                <p className="text-[11px] text-slate-400 font-medium">
                                                                    {new Date(req.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                                                    {' – '}
                                                                    {new Date(req.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <HRStatusPill status={req.status} />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Permission / Short Leave History */}
                                {!!employee.permissionRequests?.length && (
                                    <div>
                                        <div className="flex items-center gap-2 mb-3">
                                            <Clock className="h-4 w-4 text-amber-500" />
                                            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Short Leaves (Permissions)</p>
                                            <Badge variant="outline" className="ml-auto rounded-lg font-bold text-xs">{employee.permissionRequests.length}</Badge>
                                        </div>
                                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                            <div className="divide-y divide-slate-50">
                                                {employee.permissionRequests.map((req: any) => (
                                                    <div key={req.id} className="flex items-center justify-between px-5 py-3.5">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-8 w-8 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                                                                <Clock className="h-4 w-4 text-amber-600" />
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-black text-slate-900">{req.hours}h Short Leave</p>
                                                                <p className="text-[11px] text-slate-400 font-medium">
                                                                    {new Date(req.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <HRStatusPill status={req.status} />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Active & Settled Loans */}
                                {!!employee.profile?.activeLoans?.length && (
                                    <div>
                                        <div className="flex items-center gap-2 mb-3">
                                            <CreditCard className="h-4 w-4 text-violet-500" />
                                            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Loans & Advances</p>
                                        </div>
                                        <div className="space-y-3">
                                            {employee.profile.activeLoans.map((loan: any) => {
                                                const pct = loan.totalAmount > 0 ? Math.round((loan.paidAmount / loan.totalAmount) * 100) : 0
                                                return (
                                                    <div key={loan.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                                                        <div className="flex items-center justify-between mb-3">
                                                            <p className="text-sm font-black text-slate-900">SAR {loan.totalAmount.toLocaleString()}</p>
                                                            <Badge className={cn(
                                                                "border-none font-black text-[9px] uppercase rounded-lg",
                                                                loan.status === 'ACTIVE' ? "bg-indigo-100 text-indigo-700" : "bg-emerald-100 text-emerald-700"
                                                            )}>
                                                                {loan.status}
                                                            </Badge>
                                                        </div>
                                                        <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                                                            <span>SAR {loan.paidAmount.toLocaleString()} paid</span>
                                                            <span className="font-black text-rose-600">SAR {loan.remaining.toLocaleString()} remaining</span>
                                                        </div>
                                                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                            <div className="h-full bg-violet-500 rounded-full" style={{ width: `${pct}%` }} />
                                                        </div>
                                                        <p className="text-[10px] text-slate-400 mt-1.5">SAR {loan.monthlyDeduction.toLocaleString()} / month · {pct}% repaid</p>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}

                            </TabsContent>
                        )}

                    </Tabs>
                </div>
            </div>
        </div>
    )
}

function HRStatusPill({ status }: { status: string }) {
    const map: Record<string, string> = {
        PENDING_MANAGER:    'bg-amber-100 text-amber-700',
        PENDING_HR:         'bg-amber-100 text-amber-700',
        PENDING_ATTACHMENT: 'bg-orange-100 text-orange-700',
        APPROVED:           'bg-emerald-100 text-emerald-700',
        REJECTED:           'bg-red-100 text-red-700',
        PROCESSING:         'bg-indigo-100 text-indigo-700',
    }
    return (
        <Badge className={cn(
            "border-none font-black text-[10px] uppercase rounded-lg whitespace-nowrap",
            map[status] || 'bg-slate-100 text-slate-600'
        )}>
            {status?.replace(/_/g, ' ')}
        </Badge>
    )
}
