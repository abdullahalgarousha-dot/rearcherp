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
    if (userRole !== 'SUPER_ADMIN') {
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
                        Executive Dashboard
                        <Badge className="bg-indigo-600 text-white font-black px-3 py-1 rounded-full shadow-lg shadow-indigo-600/30 border-none">CEO</Badge>
                    </h1>
                    <p className="text-slate-500 font-medium mt-1">Macro-Performance, Profitability & Corporate KPIs</p>
                </div>
            </div>

            {/* KPI Row (Top) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

                {/* KPI 1: Expected Revenue */}
                <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden relative group hover:shadow-2xl transition-all">
                    <div className="absolute -right-4 -bottom-4 bg-emerald-50 text-emerald-500 rounded-full p-6 opacity-50 group-hover:scale-110 transition-transform">
                        <Banknote className="h-20 w-20" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                            Total Expected Revenue
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="relative z-10">
                        <div className="text-4xl font-black text-slate-800">
                            {data.kpis.totalExpectedRevenue.toLocaleString()} <span className="text-lg text-emerald-600 font-medium">SAR</span>
                        </div>
                    </CardContent>
                </Card>

                {/* KPI 2: VAT Collected */}
                <Card className="border-none shadow-xl bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-3xl overflow-hidden relative group hover:shadow-2xl transition-all">
                    <div className="absolute -right-4 -bottom-4 bg-white/5 rounded-full p-6 opacity-50 group-hover:scale-110 transition-transform">
                        <Calculator className="h-20 w-20 text-white" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold uppercase tracking-widest text-indigo-300 flex items-center gap-2">
                            Total VAT Collected
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="relative z-10">
                        <div className="text-4xl font-black text-white">
                            {data.kpis.totalVatCollected.toLocaleString()} <span className="text-lg text-indigo-200 font-medium">SAR</span>
                        </div>
                    </CardContent>
                </Card>

                {/* KPI 3: Total Internal Cost */}
                <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden relative group hover:shadow-2xl transition-all">
                    <div className="absolute -right-4 -bottom-4 bg-red-50 text-red-500 rounded-full p-6 opacity-50 group-hover:scale-110 transition-transform">
                        <Briefcase className="h-20 w-20" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                            Est. Internal Cost (Timesheets)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="relative z-10">
                        <div className="text-4xl font-black text-red-600">
                            {data.kpis.totalInternalCost.toLocaleString()} <span className="text-lg text-red-400 font-medium">SAR</span>
                        </div>
                    </CardContent>
                </Card>

                {/* KPI 4: Profit Margin */}
                <Card className="border-none shadow-xl bg-emerald-600 text-white rounded-3xl overflow-hidden relative group hover:shadow-2xl transition-all">
                    <div className="absolute -right-4 -bottom-4 bg-white/10 rounded-full p-6 opacity-50 group-hover:scale-110 transition-transform">
                        <TrendingUp className="h-20 w-20" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold uppercase tracking-widest text-emerald-200 flex items-center gap-2">
                            Net Profit Margin (Expected)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="relative z-10">
                        <div className="text-4xl font-black">
                            {data.kpis.netProfitMargin.toFixed(2)}%
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Grid */}
            <CEOCharts data={data} />
        </div>
    )
}
