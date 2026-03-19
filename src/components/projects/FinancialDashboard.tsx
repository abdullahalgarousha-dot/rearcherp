"use client"

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Cell,
    PieChart,
    Pie
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, TrendingUp, TrendingDown, Target } from "lucide-react"

interface PLData {
    revenue: number
    directCosts: number
    indirectCosts: number
    netProfit: number
    profitMargin: number
    currency: string
}

export function FinancialDashboard({ data }: { data: PLData }) {
    const chartData = [
        {
            name: "Revenue",
            amount: data.revenue,
            color: "#10b981" // emerald-500
        },
        {
            name: "Direct Costs",
            amount: data.directCosts,
            color: "#f43f5e" // rose-500
        },
        {
            name: "Indirect Costs",
            amount: data.indirectCosts,
            color: "#f59e0b" // amber-500
        }
    ]

    const pieData = [
        { name: "Net Profit", value: Math.max(0, data.netProfit), fill: "#8b5cf6" }, // violet-500
        { name: "Remaining", value: Math.max(0, data.revenue - data.netProfit), fill: "#e2e8f0" } // slate-200
    ]

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 1. Main Stats */}
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-none shadow-md bg-white">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-emerald-500" />
                            Net Profit (الربح الصافي)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-slate-900">
                            {data.netProfit.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">{data.currency}</span>
                        </div>
                        <p className={`text-xs mt-1 font-bold ${data.profitMargin > 20 ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {data.profitMargin.toFixed(1)}% Margin
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-md bg-white">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <TrendingDown className="h-4 w-4 text-rose-500" />
                            Burn Rate (Direct + Indirect)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-slate-900">
                            {(data.directCosts + data.indirectCosts).toLocaleString()} <span className="text-sm font-normal text-muted-foreground">{data.currency}</span>
                        </div>
                        <p className="text-xs mt-1 text-muted-foreground">
                            Total Operational Expenditure
                        </p>
                    </CardContent>
                </Card>

                {/* 2. Bar Chart */}
                <Card className="md:col-span-2 border-none shadow-md bg-white">
                    <CardHeader>
                        <CardTitle className="text-sm font-bold">Financial Overview (نظرة مالية عامة)</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `${value / 1000}k`} />
                                <Tooltip
                                    cursor={{ fill: '#f8fafc' }}
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            return (
                                                <div className="bg-white p-3 shadow-xl rounded-xl border border-slate-100">
                                                    <p className="text-xs font-bold text-slate-500 mb-1">{payload[0].payload.name}</p>
                                                    <p className="text-lg font-black text-slate-900">{payload[0].value?.toLocaleString()} {data.currency}</p>
                                                </div>
                                            )
                                        }
                                        return null
                                    }}
                                />
                                <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* 3. Profit Margin Gauge (Simple Pie Chart implementation) */}
            <Card className="border-none shadow-md bg-slate-900 text-white overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Target className="h-24 w-24" />
                </div>
                <CardHeader>
                    <CardTitle className="text-sm font-bold text-slate-400">Profitability Ratio (نسبة الربحية)</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center pt-0">
                    <div className="h-[200px] w-full relative flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-4xl font-black">{data.profitMargin.toFixed(0)}%</span>
                            <span className="text-[10px] uppercase tracking-widest text-slate-400">Success Rate</span>
                        </div>
                    </div>
                    <div className="mt-4 space-y-2 w-full">
                        <div className="flex justify-between text-xs">
                            <span className="text-slate-400">Total Revenue</span>
                            <span className="font-bold">{data.revenue.toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-emerald-500 h-full" style={{ width: `${Math.min(100, data.profitMargin)}%` }} />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
