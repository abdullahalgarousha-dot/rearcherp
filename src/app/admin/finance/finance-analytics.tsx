"use client"

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    LineChart,
    Line,
    Legend,
    ComposedChart,
    Area
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface FinanceAnalyticsProps {
    cashflowData: any[]
    projectPandL: any[]
}

export function FinanceAnalytics({ cashflowData, projectPandL }: FinanceAnalyticsProps) {
    return (
        <div className="grid gap-6 md:grid-cols-2">
            {/* Monthly Cashflow Analytics */}
            <Card className="rounded-[2.5rem] border-none shadow-xl bg-white overflow-hidden">
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-black flex items-center gap-2">
                        <div className="w-2 h-6 bg-emerald-500 rounded-full" />
                        Monthly Cashflow (Income vs Expense)
                    </CardTitle>
                </CardHeader>
                <CardContent className="h-[300px] w-full pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={cashflowData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                            />
                            <Tooltip
                                contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            />
                            <Legend verticalAlign="top" height={36} />
                            <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} barSize={30} />
                            <Bar dataKey="expense" name="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={30} />
                            <Line type="monotone" dataKey="net" name="Net Flow" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, fill: '#f59e0b' }} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Project Profit & Loss vs Budget */}
            <Card className="rounded-[2.5rem] border-none shadow-xl bg-white overflow-hidden">
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-black flex items-center gap-2">
                        <div className="w-2 h-6 bg-indigo-600 rounded-full" />
                        Project P&L vs Contract Value (Budget)
                    </CardTitle>
                </CardHeader>
                <CardContent className="h-[300px] w-full pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={projectPandL} layout="vertical" margin={{ left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                            <XAxis type="number" hide />
                            <YAxis
                                dataKey="name"
                                type="category"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                                width={100}
                            />
                            <Tooltip
                                cursor={{ fill: '#f8fafc' }}
                                contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            />
                            <Legend verticalAlign="top" height={36} />
                            <Bar dataKey="budget" name="Contract Value" fill="#e2e8f0" radius={[0, 4, 4, 0]} barSize={15} />
                            <Bar dataKey="actual" name="Actual Revenue" fill="#4f46e5" radius={[0, 4, 4, 0]} barSize={15} />
                            <Bar dataKey="cost" name="Actual Cost" fill="#f43f5e" radius={[0, 4, 4, 0]} barSize={15} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    )
}
