import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { hasPermission } from "@/lib/rbac"
import { getFinancialStatement, getTaxReport, createInvoice, createExpense } from "./actions"
import { getSystemSettings } from "@/app/actions/settings"
import { getProjectCosts } from "./project-costs/actions"
import { getTaxReports } from "./tax-reports/actions"
import { getAllVendors } from "./vendors/actions"
import { ProjectCostsClient } from "./project-costs/client-page"
import { TaxReportsClient } from "./tax-reports/client-page"
import { TaxCalculator, FinancialChart } from "./finance-components"
import { FinanceAnalytics } from "./finance-analytics"
import { FinanceFilters } from "./finance-filters"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { IssueInvoiceForm } from "./invoice-form"
import {
    TrendingUp, TrendingDown, Plus, FileText, Download, Calendar,
    ArrowUpRight, ArrowDownRight, AlertCircle, BarChart3, Wallet,
    Building2, Receipt, Calculator, ShieldCheck, Users, ExternalLink
} from "lucide-react"
import Link from "next/link"
import { BackButton } from "@/components/ui/back-button"
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from "date-fns"

const TABS = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'invoices', label: 'Invoices', icon: FileText },
    { id: 'expenses', label: 'Expenses', icon: Receipt },
    { id: 'vendors', label: 'Vendors', icon: Building2 },
    { id: 'project-costs', label: 'Project Costs', icon: Calculator },
    { id: 'tax-reports', label: 'Tax Reports', icon: ShieldCheck },
]

export default async function FinanceHub({
    searchParams
}: {
    searchParams: Promise<{ tab?: string; start?: string; end?: string; q?: string }>
}) {
    const session = await auth()
    const userRole = (session?.user as any)?.role

    // Gate on the PermissionMatrix flag, not on a hardcoded role list.
    // hasPermission returns true for GLOBAL_SUPER_ADMIN unconditionally.
    const canViewFinance = await hasPermission('finance', 'masterVisible')
    if (!canViewFinance) redirect('/')

    const { tab, start, end, q } = await searchParams

    const tenantId = (session?.user as any)?.tenantId
    const isGlobalAdmin = userRole === 'GLOBAL_SUPER_ADMIN'
    const tenantFilter = isGlobalAdmin ? {} : { tenantId }

    const activeTab = tab || 'overview'
    const startDate = start ? new Date(start) : undefined
    const endDate = end ? new Date(end) : undefined

    // ─── Fetch data per active tab ─────────────────────────────────────────────
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentQuarter = Math.floor(now.getMonth() / 3) + 1

    // Overview tab data
    let statement: any = { transactions: [], totalIncome: 0, totalExpense: 0 }
    let taxReport: any = { netVatPayable: 0, quarter: currentQuarter, year: currentYear }
    let settings: any = {}
    let projectPerformance: any[] = []
    let overdueInvoices: any[] = []
    let cashflowData: any[] = []
    let projectPandL: any[] = []
    let chartData: any[] = []

    // Invoices tab
    let invoicesList: any[] = []
    let projectsForForm: any[] = []

    // Expenses tab
    let expensesList: any[] = []

    // Vendors tab
    let vendorsList: any[] = []

    // Project Costs tab
    let projectCostsData: any[] = []

    // Tax Reports tab
    let taxReportsData: any = null
    let taxReportsDate: any = null

    if (activeTab === 'overview') {
        [statement, taxReport, settings] = await Promise.all([
            getFinancialStatement(startDate, endDate),
            getTaxReport(currentYear, currentQuarter),
            getSystemSettings(),
        ])

        const projects = await (db as any).project.findMany({
            where: tenantFilter,
            include: {
                invoices: true,
                expenses: true,
                timeLogs: {
                    include: {
                        user: {
                            include: {
                                profile: {
                                    select: {
                                        basicSalary: true,
                                        housingAllowance: true,
                                        transportAllowance: true,
                                        otherAllowance: true,
                                    }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: { name: 'asc' }
        })

        projectPerformance = projects.map((p: any) => {
            const billed = p.invoices.reduce((s: number, i: any) => s + i.totalAmount, 0)
            const collected = p.invoices.filter((i: any) => i.status === 'PAID').reduce((s: number, i: any) => s + i.totalAmount, 0)
            const directExpenses = p.expenses.reduce((s: number, e: any) => s + e.totalAmount, 0)

            // Direct Labor Cost: (Basic + Allowances) / 180 × Hours Logged
            const laborCost = (p.timeLogs as any[]).reduce((s: number, log: any) => {
                const prof = log.user?.profile
                if (!prof) return s
                const monthlySalary = (prof.basicSalary || 0) + (prof.housingAllowance || 0) + (prof.transportAllowance || 0) + (prof.otherAllowance || 0)
                const hourlyRate = monthlySalary > 0 ? monthlySalary / 180 : 0
                return s + hourlyRate * (log.hoursLogged || 0)
            }, 0)

            const totalCosts = directExpenses + laborCost
            const grossProfit = billed - totalCosts
            const margin = billed > 0 ? (grossProfit / billed) * 100 : 0
            return { ...p, billed, collected, directExpenses, laborCost, totalCosts, grossProfit, margin }
        })

        overdueInvoices = projects.flatMap((p: any) =>
            p.invoices
                .filter((i: any) => i.status === 'ISSUED' && i.dueDate && new Date(i.dueDate) < now)
                .map((i: any) => ({ ...i, projectName: p.name, projectId: p.id }))
        )

        const last12Months = Array.from({ length: 12 }, (_, i) => {
            const d = subMonths(now, i)
            return { start: startOfMonth(d), end: endOfMonth(d), name: format(d, 'MMM') }
        }).reverse()

        cashflowData = last12Months.map(m => {
            const income = projects.reduce((sum: number, p: any) =>
                sum + p.invoices.filter((inv: any) =>
                    inv.status === 'PAID' && isWithinInterval(new Date(inv.date || inv.issueDate), { start: m.start, end: m.end })
                ).reduce((s: number, inv: any) => s + inv.totalAmount, 0), 0)
            const expense = projects.reduce((sum: number, p: any) =>
                sum + p.expenses.filter((exp: any) =>
                    isWithinInterval(new Date(exp.date), { start: m.start, end: m.end })
                ).reduce((s: number, exp: any) => s + exp.totalAmount, 0), 0)
            return { name: m.name, income, expense, net: income - expense }
        })

        projectPandL = projectPerformance.slice(0, 8).map((p: any) => ({
            name: p.name.split(' ').slice(0, 2).join(' '),
            budget: p.contractValue,
            actual: p.billed,
            cost: p.totalCosts
        }))
        chartData = cashflowData.slice(-6)
    }

    if (activeTab === 'invoices') {
        ;[invoicesList, projectsForForm] = await Promise.all([
            (db as any).invoice.findMany({
                where: tenantFilter,
                include: { project: { select: { name: true } } },
                orderBy: { date: 'desc' }
            }),
            (db as any).project.findMany({
                where: tenantFilter,
                select: { id: true, name: true, code: true }
            })
        ])
    }

    if (activeTab === 'expenses') {
        ;[expensesList, projectsForForm] = await Promise.all([
            (db as any).expense.findMany({
                where: tenantFilter,
                include: { project: { select: { name: true } } },
                orderBy: { date: 'desc' }
            }),
            (db as any).project.findMany({
                where: tenantFilter,
                select: { id: true, name: true, code: true, client: { select: { clientType: true } } }
            })
        ])
    }

    if (activeTab === 'vendors') {
        vendorsList = await getAllVendors()
    }

    if (activeTab === 'project-costs') {
        projectCostsData = await getProjectCosts()
    }

    if (activeTab === 'tax-reports') {
        const quarterNum = parseInt(q || String(currentQuarter))
        const startMonth = (quarterNum - 1) * 3
        const startOfQ = new Date(currentYear, startMonth, 1)
        const endOfQ = new Date(currentYear, startMonth + 3, 0, 23, 59, 59)
        taxReportsData = await getTaxReports(startOfQ, endOfQ)
        taxReportsDate = { from: startOfQ, to: endOfQ }
    }

    return (
        <div className="space-y-6 pb-20">
            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <BackButton />
                    <div>
                        <h1 className="text-4xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                            Finance Hub
                            <Badge className="bg-primary/10 text-primary border-primary/20 font-black px-3">ERP V2.0</Badge>
                        </h1>
                        <p className="text-slate-500 font-medium">Project Cost Control · VAT-Compliant Accounting</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Link href="/admin/hr/petty-cash">
                        <Button variant="outline" className="rounded-xl border-slate-200 font-bold h-10">
                            <Wallet className="mr-2 h-4 w-4" /> Petty Cash
                        </Button>
                    </Link>
                </div>
            </div>

            {/* ── Tab Navigation ───────────────────────────────────────────── */}
            <div className="flex gap-1 bg-slate-100 rounded-2xl p-1.5 w-fit flex-wrap">
                {TABS.map(tab => {
                    const Icon = tab.icon
                    const isActive = activeTab === tab.id
                    return (
                        <Link
                            key={tab.id}
                            href={`/admin/finance?tab=${tab.id}`}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${isActive
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-white/60'
                                }`}
                        >
                            <Icon className={`h-4 w-4 ${isActive ? 'text-primary' : ''}`} />
                            {tab.label}
                        </Link>
                    )
                })}
            </div>

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* TAB: OVERVIEW                                                  */}
            {/* ══════════════════════════════════════════════════════════════ */}
            {activeTab === 'overview' && (
                <div className="space-y-8">
                    {/* KPI Strip */}
                    <div className="grid gap-5 md:grid-cols-3">
                        <div className="relative overflow-hidden rounded-2xl bg-[#1e293b] p-6 shadow-xl">
                            <div className="absolute -right-4 -top-4 h-32 w-32 rounded-full bg-emerald-500/10" />
                            <TrendingUp className="absolute right-5 top-5 h-8 w-8 text-emerald-500/20" />
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-3">Total Revenue</p>
                            <p className="text-4xl font-black text-white leading-none mb-2">
                                SAR {statement.totalIncome.toLocaleString()}
                            </p>
                            <span className="flex items-center gap-1 w-fit text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full mt-3">
                                <ArrowUpRight size={11} /> Collected this period
                            </span>
                        </div>

                        <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
                            <TrendingDown className="absolute right-5 top-5 h-8 w-8 text-rose-400/30" />
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">Total Expenses</p>
                            <p className="text-4xl font-black text-slate-900 leading-none mb-2">
                                SAR {statement.totalExpense.toLocaleString()}
                            </p>
                            <span className="flex items-center gap-1 w-fit text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2.5 py-1 rounded-full mt-3">
                                <ArrowDownRight size={11} /> Direct + Overhead + Labor
                            </span>
                            <div className="mt-4 space-y-1">
                                <div className="flex justify-between text-[10px] font-bold text-slate-400">
                                    <span>Net Profit</span>
                                    <span className={statement.totalIncome - statement.totalExpense >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                                        SAR {(statement.totalIncome - statement.totalExpense).toLocaleString()}
                                    </span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className={statement.totalIncome - statement.totalExpense >= 0 ? 'h-full bg-emerald-500 rounded-full' : 'h-full bg-red-500 rounded-full'}
                                        style={{ width: `${statement.totalIncome > 0 ? Math.min(100, Math.max(0, ((statement.totalIncome - statement.totalExpense) / statement.totalIncome) * 100)) : 0}%` }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
                            <FileText className="absolute right-5 top-5 h-8 w-8 text-amber-400/30" />
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">Net VAT Liability</p>
                            <p className="text-4xl font-black text-slate-900 leading-none mb-2">
                                SAR {taxReport.netVatPayable.toLocaleString()}
                            </p>
                            <div className="flex items-center gap-1.5 mt-3">
                                <span className="text-[11px] font-black text-amber-700 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full uppercase tracking-wider">
                                    Q{taxReport.quarter} · {taxReport.year}
                                </span>
                                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-full">
                                    ✓ ZATCA
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Overdue Alert */}
                    {overdueInvoices.length > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                            <div className="flex items-center gap-3 mb-3">
                                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                                <h2 className="font-bold text-red-800 text-sm">
                                    {overdueInvoices.length} Overdue Invoice(s) — Requires Immediate Action
                                </h2>
                            </div>
                            <div className="space-y-2">
                                {overdueInvoices.map((inv: any, i: number) => (
                                    <Link href={`/admin/projects/${inv.projectId}?tab=financials`} key={i}
                                        className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-red-100 hover:border-red-300 hover:shadow-sm transition-all group">
                                        <div>
                                            <p className="font-bold text-sm text-slate-900 group-hover:text-red-700">{inv.projectName}</p>
                                            <p className="text-xs text-red-600">
                                                Due {format(new Date(inv.dueDate), 'dd MMM yyyy')} ·
                                                {Math.floor((Date.now() - new Date(inv.dueDate).getTime()) / 86400000)} days overdue
                                            </p>
                                        </div>
                                        <p className="font-black text-red-700">{inv.totalAmount.toLocaleString()} SAR</p>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Project Performance Table */}
                    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-[#1e293b]">
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center">
                                    <BarChart3 className="h-4 w-4 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-black text-white uppercase tracking-wider">Project P&L — Cost Control</h2>
                                    <p className="text-[10px] text-white/40 font-medium mt-0.5">{projectPerformance.length} projects · Direct Expenses + Labor Cost deducted</p>
                                </div>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50/80">
                                        {["Project", "Contract Value", "Billed", "Direct Expenses", "Labor Cost", "Total Costs", "Gross Profit", "Margin"].map(h => (
                                            <th key={h} className="px-4 py-3.5 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {projectPerformance.map((p: any) => {
                                        const marginColor = p.margin > 20 ? 'text-emerald-700' : p.margin > 0 ? 'text-amber-700' : 'text-red-600'
                                        const marginBg = p.margin > 20 ? '#22c55e' : p.margin > 0 ? '#f59e0b' : '#ef4444'
                                        return (
                                            <tr key={p.id} className="border-b border-slate-50 hover:bg-indigo-50/40 transition-colors group">
                                                <td className="px-4 py-4">
                                                    <Link href={`/admin/projects/${p.id}?tab=financials`}
                                                        className="font-black text-slate-900 group-hover:text-indigo-700 transition-colors leading-tight block">
                                                        {p.name}
                                                    </Link>
                                                    <span className={`inline-block mt-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${p.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                                        {p.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 font-bold text-slate-700 whitespace-nowrap">
                                                    {p.contractValue ? `SAR ${p.contractValue.toLocaleString()}` : <span className="text-slate-300">—</span>}
                                                </td>
                                                <td className="px-4 py-4 font-bold text-indigo-700 whitespace-nowrap">
                                                    SAR {p.billed.toLocaleString()}
                                                </td>
                                                <td className="px-4 py-4 font-bold text-rose-600 whitespace-nowrap">
                                                    SAR {p.directExpenses.toLocaleString()}
                                                </td>
                                                <td className="px-4 py-4 font-bold text-orange-600 whitespace-nowrap">
                                                    SAR {p.laborCost.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                                </td>
                                                <td className="px-4 py-4 font-black text-rose-700 whitespace-nowrap">
                                                    SAR {p.totalCosts.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                                </td>
                                                <td className={`px-4 py-4 font-black whitespace-nowrap ${p.grossProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                                                    {p.grossProfit >= 0 ? '+' : ''}SAR {p.grossProfit.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex items-center gap-2 min-w-[80px]">
                                                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                            <div className="h-full rounded-full transition-all"
                                                                style={{ width: `${Math.min(Math.max(p.margin, 0), 100)}%`, backgroundColor: marginBg }} />
                                                        </div>
                                                        <span className={`text-xs font-black w-10 text-right ${marginColor}`}>
                                                            {p.margin.toFixed(1)}%
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                    {projectPerformance.length === 0 && (
                                        <tr>
                                            <td colSpan={8} className="text-center py-12 text-slate-400 text-sm font-medium">
                                                No project financial data available.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Charts */}
                    <FinanceAnalytics cashflowData={cashflowData} projectPandL={projectPandL} />

                    <div className="grid gap-8 lg:grid-cols-4">
                        <div className="lg:col-span-3 space-y-6">
                            <FinanceFilters />
                            <Card className="border-none shadow-xl bg-white rounded-3xl">
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <CardTitle className="text-lg font-black flex items-center gap-2">
                                        <div className="w-2 h-6 bg-primary rounded-full" />
                                        Growth Analysis
                                    </CardTitle>
                                    <Badge variant="outline" className="rounded-lg border-slate-100 text-slate-400 font-bold">Monthly Data</Badge>
                                </CardHeader>
                                <CardContent>
                                    <FinancialChart data={chartData} />
                                </CardContent>
                            </Card>

                            {/* Ledger */}
                            <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden">
                                <CardHeader className="flex flex-row items-center justify-between bg-slate-50/50 pb-6 pt-8 px-8">
                                    <div>
                                        <CardTitle className="text-xl font-black">Financial Statement (Ledger)</CardTitle>
                                        <p className="text-sm text-slate-400 font-bold">Comprehensive transaction history</p>
                                    </div>
                                    <Button size="sm" variant="outline" className="rounded-xl border-slate-200 font-bold">
                                        <Download size={14} className="mr-2" /> Export PDF
                                    </Button>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="bg-slate-50 border-y border-slate-100/50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                                    <th className="text-left px-8 py-4">Date</th>
                                                    <th className="text-left px-8 py-4">Description</th>
                                                    <th className="text-right px-8 py-4">Credit (+)</th>
                                                    <th className="text-right px-8 py-4">Debit (-)</th>
                                                    <th className="text-right px-8 py-4">VAT</th>
                                                    <th className="text-right px-8 py-4">Balance</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {[...statement.transactions].reverse().map((t: any) => (
                                                    <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="px-8 py-5 whitespace-nowrap">
                                                            <div className="flex flex-col">
                                                                <span className="font-bold text-slate-900">{format(new Date(t.date), "dd MMM yyyy")}</span>
                                                                <span className="text-[10px] text-slate-400 font-bold uppercase">{t.type}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-5"><p className="font-bold text-slate-700">{t.description}</p></td>
                                                        <td className={`px-8 py-5 text-right font-black ${t.credit > 0 ? 'text-emerald-600' : 'text-slate-300'}`}>
                                                            {t.credit > 0 ? `+${t.credit.toLocaleString()}` : '0.00'}
                                                        </td>
                                                        <td className={`px-8 py-5 text-right font-black ${t.debit > 0 ? 'text-rose-600' : 'text-slate-300'}`}>
                                                            {t.debit > 0 ? `-${t.debit.toLocaleString()}` : '0.00'}
                                                        </td>
                                                        <td className="px-8 py-5 text-right text-slate-400 font-bold italic">{t.taxAmount.toLocaleString()}</td>
                                                        <td className="px-8 py-5 text-right">
                                                            <span className={`px-3 py-1 rounded-lg font-black text-xs ${t.balance >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                                                                {t.balance.toLocaleString()} SAR
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                        <div className="space-y-6">
                            <TaxCalculator systemVat={settings?.vatPercentage || 15} />
                            <Card className="border-none shadow-xl bg-white rounded-3xl p-6 space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                                        <Calendar size={20} />
                                    </div>
                                    <h4 className="font-black text-slate-900">Tax Reports</h4>
                                </div>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Quarterly ZATCA Reports</p>
                                <div className="space-y-2">
                                    {[1, 2, 3, 4].map(q => (
                                        <Link key={q} href={`/admin/finance?tab=tax-reports&q=${q}`}>
                                            <Button variant="outline" className="w-full justify-between rounded-xl font-bold border-slate-100 hover:bg-slate-50 py-6">
                                                <span>Q{q} {currentYear} Report</span>
                                                <ExternalLink size={14} className="text-slate-400" />
                                            </Button>
                                        </Link>
                                    ))}
                                </div>
                            </Card>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* TAB: INVOICES                                                  */}
            {/* ══════════════════════════════════════════════════════════════ */}
            {activeTab === 'invoices' && (
                <div className="grid gap-6 md:grid-cols-3">
                    {/* Create Invoice Form */}
                    <Card className="border-none shadow-lg bg-white md:col-span-1 h-fit rounded-2xl">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base font-black">
                                <Plus className="h-5 w-5 text-primary" />
                                Issue New Invoice
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <IssueInvoiceForm projectsForForm={projectsForForm} />
                        </CardContent>
                    </Card>

                    {/* Invoices List */}
                    <Card className="border-none shadow-lg bg-white md:col-span-2 rounded-2xl">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base font-black">
                                <FileText className="h-5 w-5 text-emerald-600" />
                                Invoice Registry
                                <Badge variant="outline" className="ml-auto font-bold">{invoicesList.length} total</Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {invoicesList.map((inv: any) => (
                                    <div key={inv.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100 hover:bg-white hover:shadow-sm transition-all">
                                        <div className="flex gap-4 items-center">
                                            <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-emerald-50 text-emerald-500 flex-shrink-0">
                                                <FileText className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-900">{inv.project?.name || 'N/A'}</h4>
                                                <div className="flex gap-2 text-xs text-slate-400 items-center mt-0.5">
                                                    <span>{format(new Date(inv.date), 'dd MMM yyyy')}</span>
                                                    <span>·</span>
                                                    <span className="font-mono text-slate-500">{inv.invoiceNumber}</span>
                                                    <Badge variant="secondary" className={`text-[9px] h-4 font-black ${inv.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{inv.status}</Badge>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-black text-slate-900">{inv.totalAmount.toLocaleString()} SAR</p>
                                            <p className="text-[10px] text-emerald-600 font-bold">VAT: {inv.vatAmount.toLocaleString()}</p>
                                            <p className="text-[9px] text-slate-400">Base: {inv.baseAmount.toLocaleString()}</p>
                                        </div>
                                    </div>
                                ))}
                                {invoicesList.length === 0 && (
                                    <div className="text-center py-12 text-slate-400">No invoices found.</div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* TAB: EXPENSES                                                  */}
            {/* ══════════════════════════════════════════════════════════════ */}
            {activeTab === 'expenses' && (
                <div className="grid gap-6 md:grid-cols-3">
                    {/* Create Expense Form */}
                    <Card className="border-none shadow-lg bg-white md:col-span-1 h-fit rounded-2xl">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base font-black">
                                <Plus className="h-5 w-5 text-primary" />
                                Log New Expense
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form action={createExpense as any} className="space-y-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="description">Description</Label>
                                    <Input id="description" name="description" required placeholder="e.g. Jan office rent" />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="amountBeforeTax">Amount (Before Tax)</Label>
                                    <Input id="amountBeforeTax" name="amountBeforeTax" type="number" step="0.01" required placeholder="0.00" />
                                </div>
                                <div className="flex items-center gap-2 border p-3 rounded-xl bg-slate-50">
                                    <input type="checkbox" name="isTaxRecoverable" id="isTaxRecoverable" defaultChecked className="h-4 w-4 accent-primary" />
                                    <Label htmlFor="isTaxRecoverable" className="cursor-pointer text-sm">Recoverable VAT (15%)</Label>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="category">Category</Label>
                                    <Select name="category" defaultValue="Office">
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Rent">Rent</SelectItem>
                                            <SelectItem value="Utilities">Utilities</SelectItem>
                                            <SelectItem value="Salaries">Salaries</SelectItem>
                                            <SelectItem value="Software">Software</SelectItem>
                                            <SelectItem value="Office">Office</SelectItem>
                                            <SelectItem value="Travel">Travel</SelectItem>
                                            <SelectItem value="Other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="date">Date</Label>
                                    <Input id="date" name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="projectId">Link to Project (optional)</Label>
                                    <Select name="projectId">
                                        <SelectTrigger><SelectValue placeholder="No project (General)" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">General (No Project)</SelectItem>
                                            {projectsForForm.map((p: any) => (
                                                <SelectItem key={p.id} value={p.id}>{p.code} – {p.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button type="submit" className="w-full rounded-xl bg-primary hover:bg-primary/90 font-bold">
                                    Save Expense
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Expenses List */}
                    <Card className="border-none shadow-lg bg-white md:col-span-2 rounded-2xl">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base font-black">
                                <Receipt className="h-5 w-5 text-rose-500" />
                                Expense Registry
                                <Badge variant="outline" className="ml-auto font-bold">{expensesList.length} total</Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {expensesList.map((exp: any) => (
                                    <div key={exp.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100 hover:bg-white hover:shadow-sm transition-all">
                                        <div className="flex gap-4 items-center">
                                            <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-rose-50 text-rose-500 flex-shrink-0">
                                                <Receipt className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-900">{exp.description}</h4>
                                                <div className="flex flex-wrap gap-1.5 text-xs text-slate-400 items-center mt-0.5">
                                                    <span>{format(new Date(exp.date), 'dd MMM yyyy')}</span>
                                                    <span>·</span>
                                                    <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md font-bold">{exp.category}</span>
                                                    {exp.project && (
                                                        <>
                                                            <span>·</span>
                                                            <span className="text-primary font-bold">{exp.project.name}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-black text-slate-900">{exp.totalAmount.toLocaleString()} SAR</p>
                                            <p className="text-[10px] text-slate-400">Base: {exp.amountBeforeTax.toLocaleString()}</p>
                                            {exp.taxAmount > 0 && (
                                                <p className={`text-[10px] font-bold ${exp.isTaxRecoverable ? 'text-emerald-600' : 'text-rose-500'}`}>
                                                    VAT: {exp.taxAmount.toLocaleString()} {exp.isTaxRecoverable ? '✓' : '✗'}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {expensesList.length === 0 && (
                                    <div className="text-center py-12 text-slate-400">No expenses found.</div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* TAB: VENDORS                                                   */}
            {/* ══════════════════════════════════════════════════════════════ */}
            {activeTab === 'vendors' && (
                <div className="space-y-6">
                    {/* KPI strip */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        {[
                            {
                                label: 'Total Outstanding',
                                value: `SAR ${vendorsList.reduce((s: number, v: any) => s + (v.balance || 0), 0).toLocaleString()}`,
                                color: 'text-orange-600',
                                bg: 'bg-orange-50',
                                border: 'border-orange-100'
                            },
                            {
                                label: 'Total Paid (All Time)',
                                value: `SAR ${vendorsList.reduce((s: number, v: any) => s + (v.totalPaid || 0), 0).toLocaleString()}`,
                                color: 'text-emerald-700',
                                bg: 'bg-emerald-50',
                                border: 'border-emerald-100'
                            },
                            {
                                label: 'Active Vendors',
                                value: String(vendorsList.length),
                                color: 'text-slate-700',
                                bg: 'bg-slate-50',
                                border: 'border-slate-100'
                            },
                        ].map(card => (
                            <div key={card.label} className={`rounded-2xl border p-5 ${card.bg} ${card.border}`}>
                                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mb-2">{card.label}</p>
                                <p className={`text-3xl font-black ${card.color}`}>{card.value}</p>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-black text-slate-900">Vendor Directory</h2>
                        <Link href="/admin/finance/vendors">
                            <Button variant="outline" className="rounded-xl font-bold gap-2">
                                <ExternalLink className="h-4 w-4" /> Full Vendor Management
                            </Button>
                        </Link>
                    </div>

                    <Card className="border-none shadow-sm bg-white rounded-2xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50/80">
                                        {["Company", "Specialty", "VAT #", "Contact", "Contracts", "Contracted", "Paid", "Balance"].map(h => (
                                            <th key={h} className="px-5 py-3.5 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {vendorsList.map((v: any) => (
                                        <tr key={v.id} className="border-b border-slate-50 hover:bg-indigo-50/30 transition-colors group">
                                            <td className="px-5 py-4">
                                                <Link href={`/admin/finance/vendors/${v.id}`}
                                                    className="font-black text-slate-900 group-hover:text-indigo-700 transition-colors block">
                                                    {v.companyName}
                                                </Link>
                                            </td>
                                            <td className="px-5 py-4">
                                                <Badge variant="outline" className="text-[10px] font-bold">{v.specialty || '—'}</Badge>
                                            </td>
                                            <td className="px-5 py-4 font-mono text-xs text-slate-500">{v.taxNumber || '—'}</td>
                                            <td className="px-5 py-4 text-slate-600 font-medium">{v.contactPerson || '—'}</td>
                                            <td className="px-5 py-4 text-center font-bold text-slate-700">{v.activeContractsCount || 0}</td>
                                            <td className="px-5 py-4 font-bold text-slate-700 whitespace-nowrap">SAR {(v.totalContracted || 0).toLocaleString()}</td>
                                            <td className="px-5 py-4 font-bold text-emerald-700 whitespace-nowrap">SAR {(v.totalPaid || 0).toLocaleString()}</td>
                                            <td className="px-5 py-4 font-black text-orange-600 whitespace-nowrap">SAR {(v.balance || 0).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                    {vendorsList.length === 0 && (
                                        <tr>
                                            <td colSpan={8} className="text-center py-12 text-slate-400">No vendors registered yet.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* TAB: PROJECT COSTS (Labor Cost Engine)                         */}
            {/* ══════════════════════════════════════════════════════════════ */}
            {activeTab === 'project-costs' && (
                <div className="space-y-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 flex items-center gap-3">
                        <Calculator className="h-5 w-5 text-amber-600 flex-shrink-0" />
                        <p className="text-sm font-bold text-amber-800">
                            Direct Labor Cost Formula: <span className="font-mono">(Basic Salary + Allowances) ÷ 180 hrs × Hours Logged</span>
                        </p>
                    </div>
                    <ProjectCostsClient initialData={projectCostsData} />
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* TAB: TAX REPORTS (ZATCA Quarterly)                             */}
            {/* ══════════════════════════════════════════════════════════════ */}
            {activeTab === 'tax-reports' && taxReportsData && (
                <TaxReportsClient
                    initialData={taxReportsData}
                    initialDate={taxReportsDate}
                    currentYear={currentYear}
                    currentQuarter={parseInt(q || String(currentQuarter))}
                />
            )}
        </div>
    )
}
