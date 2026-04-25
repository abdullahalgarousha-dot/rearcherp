"use client"

import { useState, useTransition } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { calculateMonthlyKPI } from "@/app/actions/kpi"
import { cn } from "@/lib/utils"
import { Loader2, RefreshCw, TrendingUp, Star } from "lucide-react"
import { useRouter } from "next/navigation"

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function kpiGrade(score: number) {
    if (score >= 90) return { label: 'Excellent', color: 'text-emerald-700', bg: 'bg-emerald-50',  border: 'border-emerald-200', bar: 'bg-emerald-500' }
    if (score >= 75) return { label: 'Good',      color: 'text-indigo-700',  bg: 'bg-indigo-50',   border: 'border-indigo-200',  bar: 'bg-indigo-500'  }
    if (score >= 50) return { label: 'Fair',       color: 'text-amber-700',   bg: 'bg-amber-50',    border: 'border-amber-200',   bar: 'bg-amber-500'   }
    return                  { label: 'At Risk',    color: 'text-rose-700',    bg: 'bg-rose-50',     border: 'border-rose-200',    bar: 'bg-rose-500'    }
}

interface Props {
    userId:       string
    history:      any[]
    canEvaluate:  boolean
}

export function KPIHistorySection({ userId, history, canEvaluate }: Props) {
    const router          = useRouter()
    const [isPending, startTransition] = useTransition()
    const [result, setResult] = useState<string | null>(null)

    // Default recalculate = current month
    const now        = new Date()
    const [recalcMonth, setRecalcMonth] = useState(now.getMonth() + 1)
    const [recalcYear,  setRecalcYear]  = useState(now.getFullYear())
    const [feedback,    setFeedback]    = useState('')

    // Month/Year filter for the table
    const [filterYear, setFilterYear] = useState<number | null>(null)
    const uniqueYears = [...new Set((history as any[]).map((r: any) => r.year))].sort((a, b) => b - a)
    const filtered = filterYear ? history.filter((r: any) => r.year === filterYear) : history

    async function handleRecalculate() {
        setResult(null)
        startTransition(async () => {
            const res = await calculateMonthlyKPI(userId, recalcMonth, recalcYear, feedback || undefined)
            if (res.error) {
                setResult(`Error: ${res.error}`)
            } else {
                setResult(`Score saved: ${res.evaluation?.totalScore} / 100`)
                router.refresh()
            }
        })
    }

    return (
        <Card className="border-none shadow-sm bg-white">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-base font-black flex items-center gap-2">
                            <Star className="h-5 w-5 text-amber-500" />
                            KPI History
                        </CardTitle>
                        <CardDescription>Monthly performance scores — last {history.length} evaluations</CardDescription>
                    </div>
                    {/* Year filter */}
                    {uniqueYears.length > 1 && (
                        <div className="flex gap-1">
                            <button
                                onClick={() => setFilterYear(null)}
                                className={cn("text-[10px] font-black uppercase px-2.5 py-1 rounded-lg transition-colors",
                                    filterYear === null ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100")}
                            >All</button>
                            {uniqueYears.map(y => (
                                <button
                                    key={y}
                                    onClick={() => setFilterYear(y)}
                                    className={cn("text-[10px] font-black uppercase px-2.5 py-1 rounded-lg transition-colors",
                                        filterYear === y ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100")}
                                >{y}</button>
                            ))}
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* History table */}
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                        <TrendingUp className="h-8 w-8 mb-2 text-slate-200" />
                        <p className="text-sm font-medium">No evaluations recorded yet.</p>
                        {canEvaluate && <p className="text-xs mt-1">Use the recalculate panel below to generate the first score.</p>}
                    </div>
                ) : (
                    <div className="space-y-2">
                        {filtered.map((rec: any) => {
                            const g = kpiGrade(rec.totalScore)
                            let bd: any = null
                            try { bd = JSON.parse(rec.breakdown || '{}') } catch {}
                            return (
                                <div key={rec.id} className={cn("rounded-2xl border p-4", g.bg, g.border)}>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-3">
                                            <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center text-[11px] font-black flex-shrink-0", g.bg, g.color)}>
                                                {MONTH_NAMES[rec.month - 1]}
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-slate-900">
                                                    {MONTH_NAMES[rec.month - 1]} {rec.year}
                                                </p>
                                                {rec.evaluator && (
                                                    <p className="text-[10px] text-slate-400">Evaluated by {rec.evaluator.name}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-20 h-2 bg-white/60 rounded-full overflow-hidden hidden sm:block">
                                                <div className={cn("h-full rounded-full", g.bar)} style={{ width: `${rec.totalScore}%` }} />
                                            </div>
                                            <span className={cn("text-2xl font-black", g.color)}>{rec.totalScore}</span>
                                            <Badge className={cn("border-none text-[9px] font-black uppercase rounded-lg", g.bg, g.color)}>
                                                {g.label}
                                            </Badge>
                                        </div>
                                    </div>
                                    {/* Per-component chips */}
                                    <div className="flex flex-wrap gap-2 mt-1">
                                        <span className="text-[10px] bg-white/60 rounded-lg px-2.5 py-1 font-bold text-slate-700">
                                            Tasks <span className="text-indigo-700">{rec.taskScore}pt</span>
                                        </span>
                                        <span className="text-[10px] bg-white/60 rounded-lg px-2.5 py-1 font-bold text-slate-700">
                                            Timesheet <span className="text-emerald-700">{rec.timesheetScore}pt</span>
                                        </span>
                                        <span className="text-[10px] bg-white/60 rounded-lg px-2.5 py-1 font-bold text-slate-700">
                                            Discipline <span className="text-rose-600">−{rec.disciplinePenalty}pt</span>
                                        </span>
                                        {bd?.timesheet && (
                                            <span className="text-[10px] bg-white/60 rounded-lg px-2.5 py-1 font-bold text-slate-500">
                                                {bd.timesheet.logged}h / {bd.timesheet.required}h
                                            </span>
                                        )}
                                    </div>
                                    {rec.feedback && (
                                        <p className="text-xs text-slate-600 italic mt-2 border-t border-white/40 pt-2">
                                            "{rec.feedback}"
                                        </p>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* Recalculate panel (admin only) */}
                {canEvaluate && (
                    <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                            Recalculate KPI Score
                        </p>
                        <div className="flex flex-wrap gap-3 items-end">
                            <div className="grid gap-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Month</label>
                                <select
                                    value={recalcMonth}
                                    onChange={e => setRecalcMonth(parseInt(e.target.value))}
                                    className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    {MONTH_NAMES.map((m, i) => (
                                        <option key={m} value={i + 1}>{m}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid gap-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Year</label>
                                <select
                                    value={recalcYear}
                                    onChange={e => setRecalcYear(parseInt(e.target.value))}
                                    className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    {[now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2].map(y => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid gap-1 flex-1 min-w-[160px]">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Feedback (optional)</label>
                                <input
                                    type="text"
                                    value={feedback}
                                    onChange={e => setFeedback(e.target.value)}
                                    placeholder="Add manager comment..."
                                    className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <Button
                                onClick={handleRecalculate}
                                disabled={isPending}
                                className="h-9 rounded-xl bg-slate-900 text-white hover:bg-slate-800 font-black text-xs uppercase gap-2"
                            >
                                {isPending
                                    ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Calculating…</>
                                    : <><RefreshCw className="h-3.5 w-3.5" /> Run KPI</>
                                }
                            </Button>
                        </div>
                        {result && (
                            <p className={cn("text-xs font-bold px-3 py-2 rounded-xl",
                                result.startsWith('Error') ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
                            )}>
                                {result}
                            </p>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
