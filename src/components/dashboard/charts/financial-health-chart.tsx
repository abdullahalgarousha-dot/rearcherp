"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"

type FinanceProps = {
    totalReceivables: number
    activeInvoices: number
    totalPaid?: number
    totalContractValue?: number
    totalExpenses?: number
}

export function FinancialHealthChart({ finance }: { finance: FinanceProps }) {

    // Format large numbers for YAxis 
    const formatYAxis = (tickItem: number) => {
        if (tickItem === 0) return '0'
        if (tickItem >= 1000000) return `${(tickItem / 1000000).toFixed(1)}M`
        if (tickItem >= 1000) return `${(tickItem / 1000).toFixed(0)}k`
        return tickItem.toString()
    }

    const data = [
        {
            name: "Gross Contract",
            Amount: finance.totalContractValue || 0,
            fill: "#3b82f6" // Blue
        },
        {
            name: "Invoiced",
            Amount: (finance.totalPaid || 0) + finance.totalReceivables,
            fill: "#8b5cf6" // Violet
        },
        {
            name: "Collected",
            Amount: finance.totalPaid || 0,
            fill: "#10b981" // Emerald
        },
        {
            name: "Expenses",
            Amount: finance.totalExpenses || 0,
            fill: "#f43f5e" // Rose
        }
    ]

    return (
        <Card className="shadow-lg border-white/20 bg-white/60 backdrop-blur-xl hover:shadow-xl transition-all h-full">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-black text-slate-800 uppercase tracking-widest text-center">
                    الصحة المالية (Financial Health)
                </CardTitle>
                <CardDescription className="text-xs font-bold text-slate-400 text-center">
                    Contract vs Cash Flow vs Expenses
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[250px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={data}
                            margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis
                                dataKey="name"
                                tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }}
                                tickFormatter={formatYAxis}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip
                                cursor={{ fill: 'rgba(241, 245, 249, 0.5)' }}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
                                formatter={(value: any) => [`SAR ${value.toLocaleString()}`, 'Amount']}
                                labelStyle={{ fontWeight: 'black', color: '#0f172a', marginBottom: '4px' }}
                            />
                            <Bar dataKey="Amount" radius={[6, 6, 0, 0]} maxBarSize={50} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}
