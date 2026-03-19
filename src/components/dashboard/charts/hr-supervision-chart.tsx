"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Users, AlertTriangle, FileText } from "lucide-react"

type HrProps = {
    hrData: any[]
    engineers: any[]
    reportsCount: number
}

export function HrSupervisionChart({ hrData, engineers, reportsCount }: HrProps) {

    // Quick calculations
    const expiringStaff = hrData.filter(e => {
        const soon = new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000);
        return (e.idExpiry && new Date(e.idExpiry) < soon) || (e.passportExpiry && new Date(e.passportExpiry) < soon);
    }).length

    const totalEngineers = engineers.length
    const otherStaff = hrData.length - totalEngineers

    return (
        <Card className="shadow-lg border-white/20 bg-white/60 backdrop-blur-xl hover:shadow-xl transition-all h-full">
            <CardHeader className="pb-2 text-center border-b border-slate-100 mb-4 bg-slate-50/50 rounded-t-xl">
                <CardTitle className="text-sm font-black text-slate-800 uppercase tracking-widest">
                    الموارد البشرية والإشراف (HR & Supervision)
                </CardTitle>
                <CardDescription className="text-xs font-bold text-slate-400">
                    Staff readiness & field activity
                </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">

                {/* Field Activity Pulse */}
                <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500 text-white rounded-lg shadow-sm">
                            <FileText className="h-5 w-5" />
                        </div>
                        <div>
                            <h4 className="font-bold text-emerald-900 text-sm">Site Reports Logged</h4>
                            <p className="text-xs font-medium text-emerald-600">Total DSRs recorded globally</p>
                        </div>
                    </div>
                    <div className="text-2xl font-black text-emerald-700">{reportsCount}</div>
                </div>

                {/* Staff Distribution */}
                <div className="flex items-center justify-between p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500 text-white rounded-lg shadow-sm">
                            <Users className="h-5 w-5" />
                        </div>
                        <div>
                            <h4 className="font-bold text-indigo-900 text-sm">Designated Engineers</h4>
                            <p className="text-xs font-medium text-indigo-600">Vs {otherStaff} administrative staff</p>
                        </div>
                    </div>
                    <div className="text-2xl font-black text-indigo-700">{totalEngineers}</div>
                </div>

                {/* Expirations */}
                <div className="flex items-center justify-between p-4 bg-rose-50 rounded-xl border border-rose-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-rose-500 text-white rounded-lg shadow-sm">
                            <AlertTriangle className="h-5 w-5" />
                        </div>
                        <div>
                            <h4 className="font-bold text-rose-900 text-sm">Pending Expirations</h4>
                            <p className="text-xs font-medium text-rose-600">Documents expiring &lt; 30 Days</p>
                        </div>
                    </div>
                    <div className="text-2xl font-black text-rose-700">{expiringStaff}</div>
                </div>

            </CardContent>
        </Card>
    )
}
