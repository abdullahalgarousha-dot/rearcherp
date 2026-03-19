"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, Cell } from "recharts"
import { CEODashboardData } from "@/app/actions/ceo-analytics"

const COLORS = ['#10b981', '#f43f5e', '#6366f1', '#eab308', '#8b5cf6'];

export function CEOCharts({ data }: { data: CEODashboardData }) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Main Wide Chart: Project Profitability Comparison */}
            <Card className="border-none shadow-xl bg-white rounded-3xl lg:col-span-2">
                <CardHeader>
                    <CardTitle className="text-xl font-black text-slate-800">Project Margins</CardTitle>
                    <CardDescription>Contract Value vs Estimated Internal Cost (Timesheets)</CardDescription>
                </CardHeader>
                <CardContent className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.projectMargins} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                            <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(value) => `SAR ${value / 1000}k`} />
                            <Tooltip
                                cursor={{ fill: 'transparent' }}
                                contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                            />
                            <Legend wrapperStyle={{ paddingTop: '20px' }} />
                            <Bar yAxisId="left" dataKey="revenue" fill="#10b981" name="Contract Value" radius={[4, 4, 0, 0]} barSize={40} />
                            <Bar yAxisId="left" dataKey="cost" fill="#f43f5e" name="Est. Cost" radius={[4, 4, 0, 0]} barSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Sub Chart: Revenue Trends */}
            <Card className="border-none shadow-xl bg-white rounded-3xl">
                <CardHeader>
                    <CardTitle className="text-xl font-black text-slate-800">Revenue Trends</CardTitle>
                    <CardDescription>Billed Invoices over last 6 months</CardDescription>
                </CardHeader>
                <CardContent className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data.revenueTrends} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(value) => `${value / 1000}k`} />
                            <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                            <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={4} name="Revenue (Paid)" dot={{ r: 6, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Full Width Bottom: Top Engineers Performance Matrix */}
            <Card className="border-none shadow-xl bg-white rounded-3xl lg:col-span-3">
                <CardHeader>
                    <CardTitle className="text-xl font-black text-slate-800">Top Performing Engineers</CardTitle>
                    <CardDescription>Volume of billable hours logged in Timesheets</CardDescription>
                </CardHeader>
                <CardContent className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.topEngineers} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.2} horizontal={true} vertical={false} />
                            <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 13, fontWeight: 'bold', fill: '#1e293b' }} width={150} />
                            <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                            <Bar dataKey="hours" name="Total Hours Logged" radius={[0, 4, 4, 0]} barSize={32}>
                                {data.topEngineers.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

        </div>
    )
}
