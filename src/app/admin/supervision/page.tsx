import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { BackButton } from "@/components/ui/back-button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    AlertTriangle,
    ClipboardCheck,
    FileText,
    Truck,
    Calendar,
    Plus,
    Building2,
    CheckCircle2,
    Clock,
    ArrowUpRight,
    Eye,
    Shield,
    BarChart3,
    Users,
    TrendingUp,
} from "lucide-react"
import Link from "next/link"
import { format, startOfWeek, endOfWeek } from "date-fns"
import { NewNCRDialog } from "@/components/supervision/new-ncr-dialog"
import { NewIRDialog } from "@/components/supervision/new-ir-dialog"
import { approveDailyReport } from "@/app/admin/supervision/actions"
import { NCRDetailsDialog } from "@/components/supervision/ncr-details-dialog"
import { IRDetailsDialog } from "@/components/supervision/ir-details-dialog"
import { DSRApproveButton } from "@/components/supervision/dsr-approve-button"
import { SupervisionCharts } from "./supervision-charts"
import { subMonths, startOfMonth, endOfMonth, isWithinInterval } from "date-fns"

import { checkFeatureGate } from "@/lib/feature-gate"

export default async function SupervisionDashboard() {
    const session = await auth()
    const userRole = (session?.user as any)?.role
    const tenantId = (session?.user as any)?.tenantId

    if (!['ADMIN', 'PM', 'HR', 'SITE_ENGINEER', 'GLOBAL_SUPER_ADMIN'].includes(userRole)) {
        redirect('/dashboard')
    }

    const hasSupervision = await checkFeatureGate(tenantId, 'PROJECTS')
    if (!hasSupervision && userRole !== 'SUPER_ADMIN' && userRole !== 'GLOBAL_SUPER_ADMIN') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-12 text-center space-y-6">
                <div className="h-20 w-20 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center">
                    <Shield className="h-10 w-10" />
                </div>
                <div className="space-y-2">
                    <h2 className="text-3xl font-black text-white">Supervision Workspace Locked</h2>
                    <p className="text-slate-400 max-w-md mx-auto">
                        Your current subscription tier (Standard) does not include the Advanced Field Supervision module.
                        Upgrade to **Professional** to track NCRs, IRs, and Site Photos.
                    </p>
                </div>
                <Button className="bg-emerald-600 hover:bg-emerald-500 rounded-xl px-8 font-bold">
                    Upgrade Subscription
                </Button>
            </div>
        )
    }

    const [projects, contractors, allNCRs, allReports, allIRs] = await Promise.all([
        db.project.findMany({ orderBy: { name: 'asc' } }),
        db.contractor.findMany({ orderBy: { companyName: 'asc' } }),
        db.nCR.findMany({
            select: {
                id: true,
                status: true,
                officeRef: true,
                severity: true,
                description: true,
                createdAt: true,
                project: { select: { name: true } },
                contractor: { select: { companyName: true } }
            },
            orderBy: { createdAt: 'desc' }
        }),
        db.dailyReport.findMany({
            select: {
                id: true,
                date: true,
                status: true,
                officeRef: true,
                totalManpower: true,
                weather: true,
                projectId: true,
                project: { select: { id: true, name: true } },
                createdBy: { select: { name: true } },
                approvedBy: { select: { name: true } }
            },
            orderBy: { date: 'desc' }
        }),
        db.inspectionRequest.findMany({
            select: {
                id: true,
                date: true,
                status: true,
                officeRef: true,
                type: true,
                project: { select: { name: true } }
            },
            orderBy: { date: 'desc' }
        })
    ])

    const pendingNCRs = allNCRs.filter((n: any) => n.status === 'OPEN' || n.status === 'PENDING').length
    const pendingReports = allReports.filter((r: any) => r.status === 'DRAFT' || r.status === 'PENDING').length
    const pendingIRs = allIRs.filter((i: any) => i.status === 'PENDING').length

    // --- CHART DATA AGGREGATION ---
    const last6Months = Array.from({ length: 6 }, (_, i) => {
        const d = subMonths(new Date(), i)
        return {
            start: startOfMonth(d),
            end: endOfMonth(d),
            name: format(d, 'MMM')
        }
    }).reverse()

    const ncrTrends = last6Months.map(m => ({
        name: m.name,
        open: allNCRs.filter(n => {
            const date = new Date(n.createdAt)
            return isWithinInterval(date, { start: m.start, end: m.end }) && (n.status === 'OPEN' || n.status === 'PENDING')
        }).length,
        closed: allNCRs.filter(n => {
            const date = new Date(n.createdAt)
            return isWithinInterval(date, { start: m.start, end: m.end }) && n.status === 'CLOSED'
        }).length
    }))

    const irVolume = last6Months.map(m => ({
        name: m.name,
        count: allIRs.filter(ir => {
            const date = new Date(ir.date)
            return isWithinInterval(date, { start: m.start, end: m.end })
        }).length
    }))

    const manpowerData = projects.slice(0, 5).map(p => {
        const latestReport = allReports.find(r => r.projectId === p.id)
        return {
            name: p.name.split(' ')[0], // Short name
            value: Number(latestReport?.totalManpower) || 0
        }
    }).filter(p => p.value > 0)

    // --- WEEKLY DIGEST (This Week) ---
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 6 as const })
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 6 as const })
    const thisWeekReports = allReports.filter(r => {
        const d = new Date(r.date)
        return d >= weekStart && d <= weekEnd
    })
    const weekManpower = thisWeekReports.reduce((s, r) => s + (Number(r.totalManpower) || 0), 0)
    const weekAvgProgress = thisWeekReports.length > 0
        ? Math.round(thisWeekReports.reduce((s, r) => s + ((r as any).currentCompletion || 0), 0) / thisWeekReports.length)
        : 0
    const weekNCRs = allNCRs.filter(n => {
        const d = new Date(n.createdAt)
        return d >= weekStart && d <= weekEnd
    }).length

    return (
        <div className="space-y-6 rtl:text-right pb-20 min-h-screen bg-slate-50/50">
            {/* Command Center Header */}
            <div className="relative overflow-hidden rounded-[3rem] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 md:p-12 text-white shadow-2xl mb-8 border border-white/5">
                <div className="absolute top-0 right-0 p-12 opacity-10 rotate-12">
                    <Shield className="h-48 w-48" />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="space-y-4 text-center md:text-right">
                        <div className="flex items-center gap-3 justify-center md:justify-start">
                            <Badge className="bg-emerald-500 text-white border-none px-3 py-1 text-[10px] font-black uppercase tracking-widest animate-pulse">Live Operations</Badge>
                            <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Site Supervision Control</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-none">الإشراف الميداني</h1>
                        <p className="text-slate-400 text-lg max-w-xl font-medium leading-relaxed">
                            لوحة التحكم المركزية لإشراف المواقع، متابعة تقارير عدم المطابقة، فحص الموارد، وإدارة التدفق الميداني.
                        </p>
                    </div>
                    <div className="flex flex-wrap justify-center gap-4">
                        <NewNCRDialog projects={projects} contractors={contractors} />
                        <NewIRDialog projects={projects} contractors={contractors} />
                        <Button asChild className="h-14 px-8 rounded-2xl bg-white text-slate-900 hover:bg-slate-100 font-black shadow-xl shadow-white/5 border-none transition-all active:scale-95">
                            <Link href="/admin/supervision/dsr/new">
                                <Plus className="mr-2 h-5 w-5" />
                                تقرير يومي جديد
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>

            <Tabs defaultValue="overview" className="space-y-8">
                <div className="sticky top-2 z-30 bg-white/60 backdrop-blur-2xl p-2 rounded-[2rem] border border-white/40 shadow-xl shadow-slate-200/50">
                    <TabsList className="bg-transparent border-none p-0 w-full justify-start gap-2">
                        <TabsTrigger value="overview" className="flex-1 md:flex-none rounded-2xl px-6 h-12 data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-lg text-slate-500 font-black uppercase tracking-widest text-[10px] transition-all">Command Hub</TabsTrigger>
                        <TabsTrigger value="ncrs" className="flex-1 md:flex-none rounded-2xl px-6 h-12 data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=active]:shadow-lg text-slate-500 font-black uppercase tracking-widest text-[10px] transition-all">NCR ({allNCRs.length})</TabsTrigger>
                        <TabsTrigger value="irs" className="flex-1 md:flex-none rounded-2xl px-6 h-12 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg text-slate-500 font-black uppercase tracking-widest text-[10px] transition-all">IR ({allIRs.length})</TabsTrigger>
                        <TabsTrigger value="dsr" className="flex-1 md:flex-none rounded-2xl px-6 h-12 data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg text-slate-500 font-black uppercase tracking-widest text-[10px] transition-all">DSR ({allReports.length})</TabsTrigger>
                        <TabsTrigger value="reports" className="flex-1 md:flex-none rounded-2xl px-6 h-12 data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg text-slate-500 font-black uppercase tracking-widest text-[10px] transition-all">Reports</TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="overview" className="space-y-8">
                    {/* ── Weekly Digest Banner ── */}
                    <div className="rounded-[2rem] bg-gradient-to-r from-indigo-600 to-indigo-700 p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-indigo-500/20">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-white/15 flex items-center justify-center flex-shrink-0">
                                <BarChart3 className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <p className="text-white font-black text-lg leading-tight">This Week's Digest</p>
                                <p className="text-indigo-200 text-xs font-bold">
                                    {format(weekStart, 'dd MMM')} – {format(weekEnd, 'dd MMM yyyy')} · {thisWeekReports.length} reports filed
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-6 flex-wrap justify-center">
                            <div className="text-center">
                                <p className="text-3xl font-black text-white">{weekManpower}</p>
                                <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Total Manpower</p>
                            </div>
                            <div className="h-10 w-px bg-white/20 hidden md:block" />
                            <div className="text-center">
                                <p className="text-3xl font-black text-white">{weekManpower * 8}</p>
                                <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Est. Man-Hours</p>
                            </div>
                            <div className="h-10 w-px bg-white/20 hidden md:block" />
                            <div className="text-center">
                                <p className="text-3xl font-black text-white">{weekAvgProgress}%</p>
                                <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Avg Progress</p>
                            </div>
                            <div className="h-10 w-px bg-white/20 hidden md:block" />
                            <div className="text-center">
                                <p className={`text-3xl font-black ${weekNCRs > 0 ? 'text-red-300' : 'text-emerald-300'}`}>{weekNCRs}</p>
                                <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">New NCRs</p>
                            </div>
                        </div>
                        <Link href="/admin/supervision/reports">
                            <button className="bg-white/20 hover:bg-white/30 text-white font-black text-xs uppercase tracking-widest px-5 py-2.5 rounded-xl transition-all flex items-center gap-2">
                                Full Report <ArrowUpRight className="h-3.5 w-3.5" />
                            </button>
                        </Link>
                    </div>

                    {/* Executive Analytics Section */}
                    <SupervisionCharts
                        ncrTrends={ncrTrends}
                        irVolume={irVolume}
                        manpowerData={manpowerData}
                    />

                    {/* Dynamic Stats Cards */}
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                        <Card className="rounded-[2.5rem] border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white overflow-hidden group hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-center">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Active Sites</p>
                                    <div className="h-10 w-10 rounded-2xl bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-500 group-hover:rotate-12 transition-all duration-500">
                                        <Building2 className="h-5 w-5 text-emerald-600 group-hover:text-white" />
                                    </div>
                                </div>
                                <div className="text-4xl font-black text-slate-900 mt-2">
                                    {projects.filter((p: any) => (p.serviceType === 'SUPERVISION' || p.serviceType === 'BOTH') && p.supervisionStatus === 'ACTIVE').length}
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-2 text-[10px] font-black text-emerald-600 bg-emerald-50 w-fit px-2 py-1 rounded-full uppercase tracking-tighter">
                                    <CheckCircle2 className="h-3 w-3" />
                                    All Sites Operational
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="rounded-[2.5rem] border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white overflow-hidden group hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-center">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">DSR Compliance</p>
                                    <div className="h-10 w-10 rounded-2xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-500 group-hover:rotate-12 transition-all duration-500">
                                        <FileText className="h-5 w-5 text-blue-600 group-hover:text-white" />
                                    </div>
                                </div>
                                <div className="text-4xl font-black text-slate-900 mt-2">
                                    {Math.round((allReports.filter((r: any) => new Date(r.date).toDateString() === new Date().toDateString()).length / projects.length) * 100) || 0}%
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-xs font-bold text-slate-500">Submission rate for today</p>
                            </CardContent>
                        </Card>

                        <Card className="rounded-[2.5rem] border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white overflow-hidden group hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-center">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Critical NCRs</p>
                                    <div className="h-10 w-10 rounded-2xl bg-red-50 flex items-center justify-center group-hover:bg-red-500 group-hover:rotate-12 transition-all duration-500">
                                        <AlertTriangle className="h-5 w-5 text-red-600 group-hover:text-white" />
                                    </div>
                                </div>
                                <div className="text-4xl font-black text-slate-900 mt-2">{pendingNCRs}</div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-2 text-[10px] font-black text-red-600 bg-red-50 w-fit px-2 py-1 rounded-full uppercase tracking-tighter">
                                    Action Required
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="rounded-[2.5rem] border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white overflow-hidden group hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-center">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Field Workforce</p>
                                    <div className="h-10 w-10 rounded-2xl bg-amber-50 flex items-center justify-center group-hover:bg-amber-500 group-hover:rotate-12 transition-all duration-500">
                                        <Truck className="h-5 w-5 text-amber-600 group-hover:text-white" />
                                    </div>
                                </div>
                                <div className="text-4xl font-black text-slate-900 mt-2">
                                    {allReports.reduce((acc, curr) => acc + (Number(curr.totalManpower) || 0), 0).toLocaleString()}
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-xs font-bold text-slate-500">Total reported manpower</p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid gap-8 md:grid-cols-12">
                        {/* Live Site Feed - Modern Waterfall List */}
                        <div className="md:col-span-8 space-y-6">
                            <div className="flex justify-between items-end px-4">
                                <div className="space-y-1">
                                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">Timeline النشاط الميداني</h3>
                                    <p className="text-slate-500 text-sm font-medium">Real-time updates from all construction sites</p>
                                </div>
                                <Button variant="ghost" className="text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5">View Full Log</Button>
                            </div>

                            <div className="grid gap-4">
                                {[...allReports, ...allNCRs, ...allIRs]
                                    .sort((a: any, b: any) => {
                                        const dateA = new Date(a.createdAt || a.date).getTime();
                                        const dateB = new Date(b.createdAt || b.date).getTime();
                                        return dateB - dateA;
                                    })
                                    .slice(0, 8)
                                    .map((item: any) => {
                                        const isNCR = 'severity' in item;
                                        const isIR = 'type' in item;
                                        const itemDate = new Date(item.createdAt || item.date);

                                        return (
                                            <Card key={item.id} className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden group hover:shadow-xl transition-all duration-500 border border-slate-100 hover:border-slate-200">
                                                <div className="flex">
                                                    <div className={`w-2 ${isNCR ? 'bg-red-500' : isIR ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                                                    <CardContent className="p-6 flex flex-col md:flex-row items-start md:items-center gap-6 flex-1">
                                                        <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${isNCR ? 'bg-red-50 text-red-600' : isIR ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                            {isNCR ? <AlertTriangle className="h-6 w-6" /> : isIR ? <ClipboardCheck className="h-6 w-6" /> : <FileText className="h-6 w-6" />}
                                                        </div>
                                                        <div className="flex-1 space-y-1">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{item.project.name}</span>
                                                                <Badge variant="outline" className="text-[9px] font-black uppercase border-slate-100 bg-slate-50 text-slate-500">
                                                                    {isNCR ? 'NCR Issued' : isIR ? `IR: ${item.type}` : 'Daily Report'}
                                                                </Badge>
                                                                {isNCR && item.severity === 'CRITICAL' && <Badge className="bg-red-600 text-white border-none text-[8px] font-black animate-pulse">Critical</Badge>}
                                                            </div>
                                                            <h4 className="text-lg font-black text-slate-800 line-clamp-1">
                                                                {isNCR ? item.description : isIR ? item.description : `Site Monthly/Daily Report`}
                                                            </h4>
                                                            <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                                                                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {format(itemDate, 'h:mm a')}</span>
                                                                <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> {item.createdBy?.name || 'Site System'}</span>
                                                                {item.officeRef && <span className="font-mono text-slate-300">#{item.officeRef}</span>}
                                                            </div>
                                                        </div>
                                                        <Button asChild size="icon" variant="secondary" className="rounded-2xl h-12 w-12 hover:bg-slate-900 hover:text-white transition-all">
                                                            <Link href={`/admin/supervision/${isNCR ? 'ncr' : isIR ? 'ir' : 'dsr/' + item.projectId}/${item.id}`}>
                                                                <ArrowUpRight className="h-5 w-5" />
                                                            </Link>
                                                        </Button>
                                                    </CardContent>
                                                </div>
                                            </Card>
                                        )
                                    })}
                            </div>
                        </div>

                        {/* Side Sidebar: Site Health & Weather */}
                        <div className="md:col-span-4 space-y-8">

                            {/* Active Site Pins */}
                            <Card className="rounded-[2.5rem] border-none shadow-xl bg-white p-8 space-y-6">
                                <div className="space-y-1">
                                    <h3 className="text-lg font-black text-slate-900">Active Execution Sites</h3>
                                    <p className="text-slate-500 text-xs font-medium">Global Site Health Summary</p>
                                </div>
                                <div className="space-y-3">
                                    {projects.filter((p: any) => (p.serviceType === 'SUPERVISION' || p.serviceType === 'BOTH') && p.supervisionStatus === 'ACTIVE').map((p: any) => (
                                        <div key={p.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between group hover:bg-emerald-50 hover:border-emerald-100 transition-all cursor-pointer">
                                            <div className="flex items-center gap-4">
                                                <div className="h-3 w-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                                                <div className="space-y-0.5">
                                                    <p className="text-sm font-black text-slate-800 group-hover:text-emerald-900">{p.name}</p>
                                                    <p className="text-[10px] font-bold text-slate-400">{p.code}</p>
                                                </div>
                                            </div>
                                            <Badge className="bg-white border-slate-200 text-slate-400 group-hover:bg-emerald-500 group-hover:text-white border-none group-hover:shadow-lg group-hover:shadow-emerald-500/20 text-[8px] font-black">Online</Badge>
                                        </div>
                                    ))}
                                </div>
                                <Button className="w-full h-12 rounded-2xl bg-slate-100 text-slate-900 hover:bg-slate-200 font-bold border-none transition-all">View Interactive Map</Button>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="ncrs">
                    <Card className="border-white/20 shadow-sm bg-white/60 backdrop-blur-xl p-1">
                        <div className="rounded-xl border border-slate-100 bg-white/50 overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-50/80">
                                    <TableRow className="hover:bg-slate-50/80 border-b border-slate-100">
                                        <TableHead className="w-[120px] text-right font-black text-slate-700">Ref Code</TableHead>
                                        <TableHead className="text-right font-bold text-slate-600">Project</TableHead>
                                        <TableHead className="text-right font-bold text-slate-600">Contractor</TableHead>
                                        <TableHead className="text-right font-bold text-slate-600">Subject</TableHead>
                                        <TableHead className="text-center font-bold text-slate-600">Rev</TableHead>
                                        <TableHead className="text-center font-bold text-slate-600">Severity</TableHead>
                                        <TableHead className="text-center font-bold text-slate-600">Status</TableHead>
                                        <TableHead className="text-center font-bold text-slate-600">Date</TableHead>
                                        <TableHead className="text-left font-bold text-slate-600">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {allNCRs.map((ncr: any) => (
                                        <TableRow key={ncr.id} className="hover:bg-blue-50/30 border-b border-slate-50 transition-colors">
                                            <TableCell className="font-bold text-slate-800 font-mono tracking-tight">{ncr.officeRef || ncr.id.slice(0, 8)}</TableCell>
                                            <TableCell className="font-medium">{ncr.project.name}</TableCell>
                                            <TableCell className="font-medium text-slate-600">{ncr.contractor?.companyName || "-"}</TableCell>
                                            <TableCell className="max-w-[250px] truncate text-slate-600" title={ncr.description}>{ncr.description}</TableCell>
                                            <TableCell className="text-center font-mono font-bold text-slate-700">{ncr.revision}</TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="outline" className={`
                                                    ${ncr.severity === 'CRITICAL' ? 'border-red-200 text-red-700 bg-red-50' :
                                                        ncr.severity === 'HIGH' ? 'border-orange-200 text-orange-700 bg-orange-50' : 'border-slate-200 text-slate-600 bg-slate-50'}
                                                `}>
                                                    {ncr.severity}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge className={`border-0
                                                    ${ncr.status === 'PENDING' || ncr.status === 'OPEN' ? 'bg-orange-100 text-orange-700 hover:bg-orange-100' :
                                                        ncr.status === 'APPROVED' || ncr.status === 'CLOSED' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' :
                                                            'bg-red-100 text-red-700 hover:bg-red-100'}
                                                `}>
                                                    {ncr.status === 'CLOSED' ? 'APPROVED' : ncr.status}
                                                    {/* Display CLOSED as APPROVED if that's the desired semantic, or keep CLOSED. User said APPROVED color for Success. CLOSED usually means resolved/approved in NCR context. */}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-center text-xs font-medium text-slate-500">{format(new Date(ncr.createdAt), 'dd/MM/yyyy')}</TableCell>
                                            <TableCell className="text-left">
                                                <Button asChild variant="ghost" size="sm" className="h-8 rounded-lg text-primary hover:bg-primary hover:text-white">
                                                    <Link href={`/admin/supervision/ncr/${ncr.id}`}>
                                                        التفاصيل <ArrowUpRight className="ml-2 h-3 w-3" />
                                                    </Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {allNCRs.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={9} className="h-48 text-center bg-slate-50/30">
                                                <div className="flex flex-col items-center justify-center space-y-3 opacity-40">
                                                    <AlertTriangle className="h-10 w-10 text-slate-400" />
                                                    <p className="text-sm font-bold text-slate-500">لا توجد تقارير عدم مطابقة حالياً</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>
                </TabsContent>

                <TabsContent value="irs">
                    <Card className="border-white/20 shadow-sm bg-white/60 backdrop-blur-xl p-1">
                        <div className="rounded-xl border border-slate-100 bg-white/50 overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-50/80">
                                    <TableRow className="hover:bg-slate-50/80 border-b border-slate-100">
                                        <TableHead className="w-[120px] text-right font-black text-slate-700">Ref Code</TableHead>
                                        <TableHead className="text-right font-bold text-slate-600">Project</TableHead>
                                        <TableHead className="text-right font-bold text-slate-600">Type</TableHead>
                                        <TableHead className="text-right font-bold text-slate-600">Subject</TableHead>
                                        <TableHead className="text-center font-bold text-slate-600">Rev</TableHead>
                                        <TableHead className="text-center font-bold text-slate-600">Status</TableHead>
                                        <TableHead className="text-center font-bold text-slate-600">Date</TableHead>
                                        <TableHead className="text-left font-bold text-slate-600">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {allIRs.map((ir: any) => (
                                        <TableRow key={ir.id} className="hover:bg-blue-50/30 border-b border-slate-50 transition-colors">
                                            <TableCell className="font-bold text-slate-800 font-mono tracking-tight">{ir.officeRef || '-'}</TableCell>
                                            <TableCell className="font-medium">{ir.project.name}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="bg-white border-slate-200 text-slate-600">{ir.type}</Badge>
                                            </TableCell>
                                            <TableCell className="max-w-[250px] truncate text-slate-600" title={ir.description}>{ir.description}</TableCell>
                                            <TableCell className="text-center font-mono font-bold text-slate-700">{ir.revision}</TableCell>
                                            <TableCell className="text-center">
                                                <Badge className={`border-0
                                                    ${ir.status === 'PENDING' ? 'bg-orange-100 text-orange-700 hover:bg-orange-100' :
                                                        ir.status === 'APPROVED' || ir.status === 'APPROVED_WITH_COMMENTS' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' :
                                                            'bg-red-100 text-red-700 hover:bg-red-100'}
                                                `}>
                                                    {ir.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-center text-xs font-medium text-slate-500">{format(new Date(ir.date), 'dd/MM/yyyy')}</TableCell>
                                            <TableCell className="text-left">
                                                <Button asChild variant="ghost" size="sm" className="h-8 rounded-lg text-primary hover:bg-primary hover:text-white">
                                                    <Link href={`/admin/supervision/ir/${ir.id}`}>
                                                        التفاصيل <ArrowUpRight className="ml-2 h-3 w-3" />
                                                    </Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {allIRs.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={8} className="h-48 text-center bg-slate-50/30">
                                                <div className="flex flex-col items-center justify-center space-y-3 opacity-40">
                                                    <ClipboardCheck className="h-10 w-10 text-slate-400" />
                                                    <p className="text-sm font-bold text-slate-500">لا توجد طلبات فحص حالياً</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>
                </TabsContent>

                <TabsContent value="dsr">
                    <Card className="border-white/20 shadow-sm bg-white/60 backdrop-blur-xl p-1">
                        <div className="rounded-xl border border-slate-100 bg-white/50 overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-50/80">
                                    <TableRow className="hover:bg-slate-50/80 border-b border-slate-100">
                                        <TableHead className="w-[120px] text-right font-black text-slate-700">Date</TableHead>
                                        <TableHead className="text-right font-bold text-slate-600">Project</TableHead>
                                        <TableHead className="text-right font-bold text-slate-600">Weather</TableHead>
                                        <TableHead className="text-center font-bold text-slate-600">Staff</TableHead>
                                        <TableHead className="text-center font-bold text-slate-600">Status</TableHead>
                                        <TableHead className="text-center font-bold text-slate-600">Created By</TableHead>
                                        <TableHead className="text-left font-bold text-slate-600">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {allReports.map((report: any) => (
                                        <TableRow key={report.id} className="hover:bg-blue-50/30 border-b border-slate-50 transition-colors">
                                            <TableCell className="font-bold text-slate-800">{format(new Date(report.date), 'dd MMM yyyy')}</TableCell>
                                            <TableCell className="font-medium">{report.project.name}</TableCell>
                                            <TableCell className="text-xs text-slate-500">{report.weather}</TableCell>
                                            <TableCell className="text-center font-mono font-bold text-slate-700">{report.totalManpower ?? '-'}</TableCell>
                                            <TableCell className="text-center">
                                                <Badge className={`border-0
                                                    ${report.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : 'bg-orange-100 text-orange-700 hover:bg-orange-100'}
                                                `}>
                                                    {report.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-center text-xs font-medium text-slate-500">{report.createdBy.name}</TableCell>
                                            <TableCell className="text-left flex items-center gap-2">
                                                <Button asChild variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-slate-100 text-slate-500">
                                                    <Link href={`/admin/supervision/dsr/${report.projectId}/${report.id}`}>
                                                        <Eye className="h-4 w-4" />
                                                    </Link>
                                                </Button>

                                                {/* Approve Button for Admin/PM */}
                                                <DSRApproveButton
                                                    reportId={report.id}
                                                    userRole={userRole}
                                                    status={report.status}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {allReports.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-48 text-center bg-slate-50/30">
                                                <div className="flex flex-col items-center justify-center space-y-3 opacity-40">
                                                    <FileText className="h-10 w-10 text-slate-400" />
                                                    <p className="text-sm font-bold text-slate-500">لا توجد تقارير يومية حتى الآن</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>
                </TabsContent>
                {/* ── Reports Tab ─────────────────────────────────────────── */}
                <TabsContent value="reports" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Link href="/admin/supervision/reports?mode=weekly" className="group">
                            <div className="rounded-[2rem] bg-white border border-slate-100 shadow-sm p-7 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                                <div className="h-12 w-12 rounded-2xl bg-indigo-100 flex items-center justify-center mb-5 group-hover:bg-indigo-600 transition-all">
                                    <BarChart3 className="h-6 w-6 text-indigo-600 group-hover:text-white transition-all" />
                                </div>
                                <h3 className="font-black text-slate-900 text-lg">Weekly Report</h3>
                                <p className="text-slate-500 text-sm mt-1 mb-4">Auto-generated summary of this week's field activity, manpower, and NCR status.</p>
                                <div className="flex items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {weekManpower} workers</span>
                                    <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> {thisWeekReports.length} DSRs</span>
                                </div>
                            </div>
                        </Link>

                        <Link href="/admin/supervision/reports?mode=monthly" className="group">
                            <div className="rounded-[2rem] bg-white border border-slate-100 shadow-sm p-7 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                                <div className="h-12 w-12 rounded-2xl bg-emerald-100 flex items-center justify-center mb-5 group-hover:bg-emerald-600 transition-all">
                                    <Calendar className="h-6 w-6 text-emerald-600 group-hover:text-white transition-all" />
                                </div>
                                <h3 className="font-black text-slate-900 text-lg">Monthly Report</h3>
                                <p className="text-slate-500 text-sm mt-1 mb-4">Full month summary with project breakdown, NCR trends, and productivity metrics.</p>
                                <div className="flex items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> {allReports.length} total DSRs</span>
                                    <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> {pendingNCRs} open NCRs</span>
                                </div>
                            </div>
                        </Link>

                        <div className="rounded-[2rem] bg-slate-50 border border-dashed border-slate-200 p-7 flex flex-col items-center justify-center text-center opacity-60">
                            <TrendingUp className="h-10 w-10 text-slate-300 mb-3" />
                            <h3 className="font-black text-slate-500 text-base">Custom Report</h3>
                            <p className="text-slate-400 text-sm mt-1">Coming soon — custom date range reports.</p>
                        </div>
                    </div>

                    {/* Quick Stats for This Week */}
                    <div className="rounded-[2rem] bg-white border border-slate-100 shadow-sm p-7">
                        <h3 className="font-black text-slate-900 mb-5 flex items-center gap-2">
                            <span className="h-1.5 w-6 rounded-full bg-indigo-500 inline-block" />
                            This Week at a Glance
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                { label: 'Reports Filed', value: thisWeekReports.length, color: 'text-blue-600', bg: 'bg-blue-50' },
                                { label: 'Total Manpower', value: weekManpower, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                                { label: 'Est. Man-Hours', value: weekManpower * 8, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                                { label: 'New NCRs', value: weekNCRs, color: weekNCRs > 0 ? 'text-red-600' : 'text-emerald-600', bg: weekNCRs > 0 ? 'bg-red-50' : 'bg-emerald-50' },
                            ].map(({ label, value, color, bg }) => (
                                <div key={label} className={`rounded-2xl ${bg} p-4`}>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</p>
                                    <p className={`text-3xl font-black ${color}`}>{value.toLocaleString()}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </TabsContent>

            </Tabs>
        </div>
    )
}

