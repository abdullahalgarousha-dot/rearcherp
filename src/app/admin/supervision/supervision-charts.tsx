"use client"

import {
    LineChart, Line,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer,
    BarChart, Bar, Cell,
    PieChart, Pie,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface SupervisionChartsProps {
    ncrTrends: { name: string; open: number; closed: number }[]
    irVolume: { name: string; count: number }[]
    manpowerData: { name: string; value: number }[]
}

// Custom donut label
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.08) return null
    const RADIAN = Math.PI / 180
    const r = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + r * Math.cos(-midAngle * RADIAN)
    const y = cy + r * Math.sin(-midAngle * RADIAN)
    return (
        <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central"
            fontSize={10} fontWeight={900}>
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    )
}

// Shared tooltip style
const tooltipStyle = {
    contentStyle: {
        borderRadius: '1rem',
        border: 'none',
        boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
        fontSize: 12,
        fontWeight: 700
    },
    cursor: { stroke: '#e2e8f0', strokeWidth: 1 }
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444']
const IR_COLORS = ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe', '#eff6ff']

export function SupervisionCharts({ ncrTrends, irVolume, manpowerData }: SupervisionChartsProps) {
    const hasManpower = manpowerData.some(d => d.value > 0)

    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

            {/* ── NCR Resolution Trends — Line Chart ──────────────────────────── */}
            <Card className="rounded-[2.5rem] border-none shadow-xl bg-white overflow-hidden lg:col-span-2">
                <CardHeader className="pb-1 px-8 pt-7">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-7 bg-red-500 rounded-full" />
                            <div>
                                <CardTitle className="text-base font-black text-slate-900">NCR Resolution Trends</CardTitle>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">6-Month Rolling View</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest">
                            <span className="flex items-center gap-1.5 text-red-500">
                                <span className="h-2.5 w-2.5 rounded-full bg-red-500 inline-block" /> Open
                            </span>
                            <span className="flex items-center gap-1.5 text-emerald-500">
                                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" /> Closed
                            </span>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="h-[280px] w-full px-4 pb-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={ncrTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <filter id="glow-red">
                                    <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                                    <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                                </filter>
                                <filter id="glow-green">
                                    <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                                    <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                                </filter>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false}
                                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                            <YAxis axisLine={false} tickLine={false}
                                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                                allowDecimals={false} />
                            <Tooltip {...tooltipStyle} />
                            <Line
                                type="monotone" dataKey="open" name="Open NCRs"
                                stroke="#ef4444" strokeWidth={3} dot={{ fill: '#ef4444', r: 5, strokeWidth: 2, stroke: '#fff' }}
                                activeDot={{ r: 7, stroke: '#ef4444', strokeWidth: 2, fill: '#fff' }}
                            />
                            <Line
                                type="monotone" dataKey="closed" name="Closed NCRs"
                                stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', r: 5, strokeWidth: 2, stroke: '#fff' }}
                                activeDot={{ r: 7, stroke: '#10b981', strokeWidth: 2, fill: '#fff' }}
                                strokeDasharray="0"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* ── Manpower Distribution — Donut ────────────────────────────────── */}
            <Card className="rounded-[2.5rem] border-none shadow-xl bg-white overflow-hidden">
                <CardHeader className="pb-1 px-8 pt-7">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-7 bg-emerald-500 rounded-full" />
                        <div>
                            <CardTitle className="text-base font-black text-slate-900">Manpower Distribution</CardTitle>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">By Project</p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="px-6 pb-6">
                    {hasManpower ? (
                        <>
                            <div className="h-[200px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={manpowerData}
                                            cx="50%" cy="50%"
                                            innerRadius={55} outerRadius={85}
                                            paddingAngle={3}
                                            dataKey="value"
                                            labelLine={false}
                                            label={renderCustomLabel}
                                        >
                                            {manpowerData.map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]}
                                                    stroke="white" strokeWidth={2} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.12)', fontSize: 12, fontWeight: 700 }}
                                            formatter={(val: any) => [`${val} workers`, 'Manpower']}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            {/* Custom Legend */}
                            <div className="space-y-2 mt-2">
                                {manpowerData.map((entry, index) => (
                                    <div key={entry.name} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                                                style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                            <span className="text-xs font-bold text-slate-600 truncate max-w-[110px]">{entry.name}</span>
                                        </div>
                                        <span className="text-xs font-black text-slate-900">{entry.value}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="h-[260px] flex flex-col items-center justify-center text-slate-300">
                            <div className="h-20 w-20 rounded-full border-4 border-dashed border-slate-100 flex items-center justify-center mb-3">
                                <span className="text-2xl font-black">0</span>
                            </div>
                            <p className="text-xs font-bold">No manpower data yet</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ── Monthly IR Volume — Bar Chart ─────────────────────────────────── */}
            <Card className="rounded-[2.5rem] border-none shadow-xl bg-white overflow-hidden lg:col-span-3">
                <CardHeader className="pb-1 px-8 pt-7">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-7 bg-blue-500 rounded-full" />
                        <div>
                            <CardTitle className="text-base font-black text-slate-900">Monthly IR Submittals Volume</CardTitle>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Inspection Requests Trend</p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="h-[220px] w-full px-4 pb-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={irVolume} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false}
                                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                            <YAxis axisLine={false} tickLine={false}
                                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                                allowDecimals={false} />
                            <Tooltip
                                cursor={{ fill: '#f8fafc', radius: 8 }}
                                contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.12)', fontSize: 12, fontWeight: 700 }}
                                formatter={(val: any) => [val, 'IRs Submitted']}
                            />
                            <Bar dataKey="count" name="IR Submittals" radius={[6, 6, 0, 0]} maxBarSize={48}>
                                {irVolume.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={IR_COLORS[index % IR_COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

        </div>
    )
}
