export const dynamic = 'force-dynamic';
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getCEODashboardData } from "@/app/actions/ceo-analytics"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { TrendingUp, Banknote, Briefcase, Calculator, Building2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { CEOCharts } from "./ceo-charts"

export default async function CEODashboardPage() {
    const session = await auth()

    // 1. Strict Authorization (RBAC)
    const userRole = (session?.user as any)?.role
    if (userRole !== 'SUPER_ADMIN' && userRole !== 'GLOBAL_SUPER_ADMIN') {
        redirect('/')
    }

    // 2. Data Fetching
    const data = await getCEODashboardData()

    return (
        <div className="p-4 md:p-8 max-w-[1600px] mx-auto pb-24 font-sans space-y-8">

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                        <Building2 className="h-10 w-10 text-indigo-600 bg-indigo-50 p-2 rounded-xl" />
                        Project Financial Summary
                        <Badge className="bg-indigo-600 text-white font-black px-3 py-1 rounded-full shadow-lg shadow-indigo-600/30 border-none">CEO</Badge>
                    </h1>
                    <p className="text-slate-500 font-medium mt-1">Live Cost Center Tracking & Receivables Management</p>
                </div>
            </div>

            {/* KPI Row (Top) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

                {/* KPI 1: Expected Revenue */}
                <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden relative group hover:shadow-2xl transition-all border-l-4 border-emerald-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-500">
                            Total Contract Value
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-slate-800">
                            SAR {data.kpis.totalExpectedRevenue.toLocaleString()}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">Aggregated across all active projects</p>
                    </CardContent>
                </Card>

                {/* KPI 2: External Expenses */}
                <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden relative group hover:shadow-2xl transition-all border-l-4 border-amber-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-500">
                            External Expenses
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-amber-600">
                            SAR {data.kpis.totalExternalExpenses.toLocaleString()}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">Direct project procurements & vendors</p>
                    </CardContent>
                </Card>

                {/* KPI 3: Total Internal Cost */}
                <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden relative group hover:shadow-2xl transition-all border-l-4 border-indigo-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-500">
                            Internal labor Cost
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-indigo-600">
                            SAR {data.kpis.totalInternalCost.toLocaleString()}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">Based on validated logged timesheets</p>
                    </CardContent>
                </Card>

                {/* KPI 4: Profit Margin */}
                <Card className="border-none shadow-xl bg-emerald-600 text-white rounded-3xl overflow-hidden relative group hover:shadow-2xl transition-all">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold uppercase tracking-widest text-emerald-100">
                            Corporate Gross Margin
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-black italic">
                            {data.kpis.netProfitMargin.toFixed(1)}%
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                           <TrendingUp className="h-4 w-4 text-emerald-200" />
                           <span className="text-xs font-bold text-emerald-100 uppercase tracking-tighter">Healthy Performance</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Section: Charts */}
            <CEOCharts data={data} />

            {/* Receivables & Project Summary Table */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                
                {/* Receivables Status Table */}
                <Card className="border-none shadow-2xl rounded-3xl overflow-hidden">
                    <CardHeader className="bg-slate-900 text-white">
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle className="text-xl font-black">Receivables Status</CardTitle>
                                <CardDescription className="text-slate-400 italic">Tracking unpaid invoices & upcoming milestones</CardDescription>
                            </div>
                            <Badge variant="outline" className="text-amber-400 border-amber-400">Action Required</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-800 text-slate-300 uppercase text-[10px] font-black tracking-widest">
                                    <tr>
                                        <th className="px-6 py-4">Project</th>
                                        <th className="px-6 py-4">Item / Milestone</th>
                                        <th className="px-6 py-4">Amount</th>
                                        <th className="px-6 py-4">Due Date</th>
                                        <th className="px-6 py-4 text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {data.receivables.map((r, i) => (
                                        <tr key={i} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-800">{r.projectName}</div>
                                                <div className="text-[10px] text-slate-400 font-bold uppercase">{r.type}</div>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-slate-600">{r.title}</td>
                                            <td className="px-6 py-4 font-black text-slate-900 whitespace-nowrap">SAR {r.amount.toLocaleString()}</td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-medium text-slate-600">
                                                    {new Date(r.dueDate).toLocaleDateString('en-GB')}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Badge className={r.status === 'OVERDUE' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}>
                                                    {r.status}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                    {data.receivables.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic font-medium">No pending receivables found.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {/* Project Financial Health List */}
                <Card className="border-none shadow-2xl rounded-3xl overflow-hidden">
                    <CardHeader className="bg-indigo-900 text-white">
                        <CardTitle className="text-xl font-black">Project Cost Centers</CardTitle>
                        <CardDescription className="text-indigo-200 uppercase text-[10px] tracking-widest font-bold">Active Profitability Matrix</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-indigo-800 text-indigo-200 uppercase text-[10px] font-black tracking-widest">
                                    <tr>
                                        <th className="px-6 py-4">Project ID</th>
                                        <th className="px-6 py-4">Budget</th>
                                        <th className="px-6 py-4">Total Spent</th>
                                        <th className="px-6 py-4 text-right">Margin %</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-indigo-50/10 bg-indigo-950/5">
                                    {data.projectsSummary.map((p, i) => (
                                        <tr key={i} className="hover:bg-indigo-50 border-b border-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-800">{p.code}</div>
                                                <div className="text-[10px] text-slate-500 font-medium truncate max-w-[150px]">{p.name}</div>
                                            </td>
                                            <td className="px-6 py-4 font-bold text-slate-700">SAR {p.contractValue.toLocaleString()}</td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-800">SAR {p.totalSpent.toLocaleString()}</div>
                                                <div className="text-[10px] text-slate-400 flex gap-2">
                                                    <span>Ext: {Math.round(p.externalExpenses/1000)}k</span>
                                                    <span>Lab: {Math.round(p.internalLaborCost/1000)}k</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className={`text-lg font-black ${p.marginPercent < 15 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                    {p.marginPercent.toFixed(1)}%
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

