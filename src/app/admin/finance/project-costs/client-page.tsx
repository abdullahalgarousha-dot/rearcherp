'use client'

import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ChevronDown, ChevronRight, Calculator, Clock, Users } from "lucide-react"
import { cn } from "@/lib/utils"

interface EngineerCost {
    engineerName: string
    hours: number
    cost: number
}

interface ProjectCostData {
    id: string
    name: string
    code: string
    status: string
    totalHours: number
    estimatedCost: number
    engineerCosts: EngineerCost[]
}

interface ProjectCostsClientProps {
    initialData: ProjectCostData[]
}

export function ProjectCostsClient({ initialData }: ProjectCostsClientProps) {
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

    const toggleRow = (id: string) => {
        setExpandedRows(prev => {
            const newSet = new Set(prev)
            if (newSet.has(id)) {
                newSet.delete(id)
            } else {
                newSet.add(id)
            }
            return newSet
        })
    }

    const totalSystemHours = initialData.reduce((sum, p) => sum + p.totalHours, 0)
    const totalSystemCost = initialData.reduce((sum, p) => sum + p.estimatedCost, 0)

    const statusColors: any = {
        'LEAD': 'bg-slate-100 text-slate-700 border-slate-200',
        'PROPOSAL': 'bg-blue-100 text-blue-700 border-blue-200',
        'ACTIVE': 'bg-emerald-100 text-emerald-700 border-emerald-200',
        'ON_HOLD': 'bg-amber-100 text-amber-700 border-amber-200',
        'COMPLETED': 'bg-purple-100 text-purple-700 border-purple-200',
        'CANCELLED': 'bg-red-100 text-red-700 border-red-200'
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-black text-slate-900">Estimated Project Costs</h1>
                <p className="text-sm text-slate-500 mt-1">Internal cost estimation based on engineer logged hours and profile hourly rates.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-bold text-slate-500 uppercase tracking-widest">Global Hours Logged</CardTitle>
                        <Clock className="w-4 h-4 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-black text-slate-900">{totalSystemHours.toLocaleString()} <span className="text-sm text-slate-400">Hrs</span></p>
                    </CardContent>
                </Card>
                <Card className="bg-primary/5 border-primary/20">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-bold text-primary uppercase tracking-widest">Global Est. Cost</CardTitle>
                        <Calculator className="w-4 h-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-black text-primary">{totalSystemCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-sm text-primary/60">SAR</span></p>
                    </CardContent>
                </Card>
            </div>

            <Card className="shadow-lg border-white/20 bg-white/60 backdrop-blur-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-500 border-collapse">
                        <thead className="text-[10px] text-slate-400 uppercase bg-slate-50/50">
                            <tr>
                                <th className="px-6 py-4 font-black tracking-wider w-10"></th>
                                <th className="px-6 py-4 font-black tracking-wider">Project</th>
                                <th className="px-6 py-4 font-black tracking-wider text-center">Status</th>
                                <th className="px-6 py-4 font-black tracking-wider text-right">Total Hours</th>
                                <th className="px-6 py-4 font-black tracking-wider text-right">Est. Cost (SAR)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {initialData.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">No project cost data available.</td>
                                </tr>
                            ) : (
                                initialData.map((project) => (
                                    <React.Fragment key={project.id}>
                                        <tr
                                            className={cn("hover:bg-slate-50/50 transition-colors cursor-pointer", expandedRows.has(project.id) && "bg-slate-50/80")}
                                            onClick={() => toggleRow(project.id)}
                                        >
                                            <td className="px-6 py-4 text-center">
                                                {project.engineerCosts.length > 0 ? (
                                                    expandedRows.has(project.id) ?
                                                        <ChevronDown className="h-4 w-4 text-slate-400 mx-auto" /> :
                                                        <ChevronRight className="h-4 w-4 text-slate-400 mx-auto" />
                                                ) : <span className="w-4 inline-block"></span>}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-900">{project.name}</div>
                                                <div className="text-[10px] text-slate-400 uppercase font-mono">{project.code}</div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <Badge variant="outline" className={cn("text-[10px] font-bold border", statusColors[project.status] || 'bg-slate-100 text-slate-700 border-slate-200')}>
                                                    {project.status.replace('_', ' ')}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 text-right tabular-nums font-bold text-slate-700">
                                                {project.totalHours.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">h</span>
                                            </td>
                                            <td className="px-6 py-4 text-right tabular-nums font-black text-slate-900">
                                                {project.estimatedCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                        {/* Expandable Breakdown Row */}
                                        {expandedRows.has(project.id) && project.engineerCosts.length > 0 && (
                                            <tr className="bg-slate-50/30">
                                                <td colSpan={5} className="p-0 border-t-0">
                                                    <div className="pl-16 pr-6 py-4 bg-gradient-to-r from-slate-50/50 to-transparent">
                                                        <div className="flex flex-col gap-2">
                                                            <div className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5 mb-1">
                                                                <Users className="h-3 w-3" /> Breakdown by Engineer
                                                            </div>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                                {project.engineerCosts.map((eng, idx) => (
                                                                    <div key={idx} className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm flex justify-between items-center">
                                                                        <div>
                                                                            <p className="text-xs font-bold text-slate-900">{eng.engineerName}</p>
                                                                            <p className="text-[10px] text-slate-400">{eng.hours} Hours Logged</p>
                                                                        </div>
                                                                        <div className="text-right">
                                                                            <p className="text-sm font-black text-primary tabular-nums">{eng.cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SAR</p>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    )
}
