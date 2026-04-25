"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, Cell } from "recharts"
import { CEODashboardData } from "@/app/actions/ceo-analytics"

const COLORS = ['#10b981', '#f43f5e', '#6366f1', '#eab308', '#8b5cf6'];

export function CEOCharts({ data }: { data: CEODashboardData }) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Main Wide Chart: Project Gross Margin Comparison */}
            <Card className="border-none shadow-xl bg-white rounded-3xl lg:col-span-2">
                <CardHeader>
                    <CardTitle className="text-xl font-black text-slate-800">Project Performance (P&L)</CardTitle>
                    <CardDescription>Revenue vs Total Spent (External Expenses + Labor Cost)</CardDescription>
                </CardHeader>
                <CardContent className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.projectsSummary} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                            <XAxis dataKey="code" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(value) => `SAR ${value / 1000}k`} />
                            <Tooltip
                                cursor={{ fill: '#f8fafc' }}
                                contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                            />
                            <Legend wrapperStyle={{ paddingTop: '20px' }} />
                            <Bar dataKey="contractValue" fill="#10b981" name="Contract Value" radius={[4, 4, 0, 0]} barSize={40} />
                            <Bar dataKey="totalSpent" fill="#f43f5e" name="Total Spent" radius={[4, 4, 0, 0]} barSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Sub Chart: Revenue Trends */}
            <Card className="border-none shadow-xl bg-white rounded-3xl">
                <CardHeader>
                    <CardTitle className="text-xl font-black text-slate-800">Revenue Trends</CardTitle>
                    <CardDescription>Billed Invoices (Base Amount)</CardDescription>
                </CardHeader>
                <CardContent className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data.revenueTrends} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(value) => `${value / 1000}k`} />
                            <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                            <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={4} name="Revenue (Billed)" dot={{ r: 6, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Bottom: Internal vs External Cost Split */}
            <Card className="border-none shadow-xl bg-white rounded-3xl lg:col-span-3">
                <CardHeader>
                    <CardTitle className="text-xl font-black text-slate-800">Cost Breakdown Analysis</CardTitle>
                    <CardDescription>Comparison of External Procurements vs Internal Man-Hours</CardDescription>
                </CardHeader>
                <CardContent className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.projectsSummary} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                            <XAxis dataKey="code" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(v) => `SAR ${v / 1000}k`} />
                            <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                            <Legend />
                            <Bar dataKey="internalLaborCost" stackId="a" fill="#6366f1" name="Internal Labor" radius={[0, 0, 0, 0]} barSize={50} />
                            <Bar dataKey="externalExpenses" stackId="a" fill="#f59e0b" name="External Expenses" radius={[4, 4, 0, 0]} barSize={50} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

        </div>
    )
}

