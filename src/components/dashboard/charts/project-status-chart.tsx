"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"

export function ProjectStatusChart({ projects }: { projects: any[] }) {
    const active = projects.filter(p => p.status === 'ACTIVE' && p.completionPercent < 100).length
    const completed = projects.filter(p => p.completionPercent >= 100).length
    const delayed = projects.filter(p => {
        if (p.status !== 'ACTIVE' || (p.completionPercent || 0) >= 100) return false
        if (!p.startDate || !p.totalDuration) return false
        const computedEndDate = new Date(p.startDate)
        computedEndDate.setDate(computedEndDate.getDate() + (p.totalDuration * 7)) // duration in weeks
        return computedEndDate < new Date()
    }).length

    // Subtract delayed from active so we don't double count in the visual
    const strictlyActive = Math.max(0, active - delayed)

    const data = [
        { name: "Active", value: strictlyActive, color: "#4f46e5" },   // Indigo
        { name: "Completed", value: completed, color: "#10b981" }, // Emerald
        { name: "Delayed", value: delayed, color: "#f59e0b" },     // Amber
    ].filter(d => d.value > 0)

    return (
        <Card className="shadow-lg border-white/20 bg-white/60 backdrop-blur-xl hover:shadow-xl transition-all h-full">
            <CardHeader className="pb-2 text-center">
                <CardTitle className="text-sm font-black text-slate-800 uppercase tracking-widest">
                    حالة المشاريع (Project Status)
                </CardTitle>
                <CardDescription className="text-xs font-bold text-slate-400">
                    Distribution of portfolio status
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[250px] w-full mt-4">
                    {data.length === 0 ? (
                        <div className="flex h-full items-center justify-center text-xs text-slate-400 font-bold">No Data Available</div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data}
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)', fontWeight: 'bold', fontSize: '12px' }}
                                    formatter={(value: any) => [`${value} Projects`, 'Count']}
                                />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
