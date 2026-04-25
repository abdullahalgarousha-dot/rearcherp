"use client"

import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip
} from "recharts"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Users, CalendarCheck, Clock, CreditCard,
    Building2, ArrowRight, CheckCircle2, AlertTriangle,
    TrendingUp, UserCircle, ShieldAlert, Star, TrendingDown,
    DollarSign
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

// ── Color tokens ──────────────────────────────────────────────────────────────
const EMPLOYMENT_COLORS: Record<string, { bar: string, bg: string, text: string, label: string }> = {
    PERMANENT:  { bar: "bg-indigo-500",  bg: "bg-indigo-50",  text: "text-indigo-700",  label: "Permanent"  },
    CONTRACT:   { bar: "bg-amber-500",   bg: "bg-amber-50",   text: "text-amber-700",   label: "Contract"   },
    PROBATION:  { bar: "bg-rose-500",    bg: "bg-rose-50",    text: "text-rose-700",    label: "Probation"  },
}

const DONUT_COLORS = ["#22c55e", "#f59e0b", "#e2e8f0"] // present, leave, absent
const SLIP_STATUS_PAID = ["APPROVED", "GENERATED"]

// ── Custom tooltip for donut ──────────────────────────────────────────────────
function DonutTooltip({ active, payload }: any) {
    if (!active || !payload?.length) return null
    return (
        <div className="bg-slate-900 text-white px-3 py-2 rounded-xl text-xs font-bold shadow-xl">
            {payload[0].name}: <span className="text-white/70">{payload[0].value}</span>
        </div>
    )
}

// ── Custom center label renderer ──────────────────────────────────────────────
function CenterLabel({ cx, cy, total }: { cx: number; cy: number; total: number }) {
    return (
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
            <tspan x={cx} dy="-0.4em" fill="#0f172a" fontSize={28} fontWeight={900}>{total}</tspan>
            <tspan x={cx} dy="1.5em" fill="#94a3b8" fontSize={10} fontWeight={700} letterSpacing={2}>STAFF</tspan>
        </text>
    )
}

// ── Main dashboard ────────────────────────────────────────────────────────────
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function kpiGrade(score: number) {
    if (score >= 90) return { label: 'Excellent', color: 'text-emerald-700', bg: 'bg-emerald-50',  bar: 'bg-emerald-500' }
    if (score >= 75) return { label: 'Good',      color: 'text-indigo-700',  bg: 'bg-indigo-50',   bar: 'bg-indigo-500'  }
    if (score >= 50) return { label: 'Fair',       color: 'text-amber-700',   bg: 'bg-amber-50',    bar: 'bg-amber-500'   }
    return                  { label: 'At Risk',    color: 'text-rose-700',    bg: 'bg-rose-50',     bar: 'bg-rose-500'    }
}

export function HRMasterDashboard({ data }: { data: any }) {
    const {
        totalStaff, onLeaveToday, pendingLeaves, pendingLoans,
        branches, recentLeaves, unassignedCount,
        employmentStats, payrollData, expiryAlerts = [],
        kpiLeaderboard = [], kpiRiskStaff = [],
        grandPayrollSAR = 0, branchPayrolls = [],
    } = data

    // Donut data
    const presentCount = Math.max(0, totalStaff - onLeaveToday)
    const absentEstimate = 0 // reserved for future TimeLog integration
    const donutData = [
        { name: "Present", value: presentCount },
        { name: "On Leave", value: onLeaveToday },
    ].filter(d => d.value > 0)

    // Employment type data
    const empTotal = employmentStats.reduce((s: number, e: any) => s + (e._count?._all ?? 0), 0) || 1
    const empRows = employmentStats.map((e: any) => ({
        type: e.employmentType || "PERMANENT",
        count: e._count?._all ?? 0,
        pct: Math.round(((e._count?._all ?? 0) / empTotal) * 100),
    }))

    const pendingTotal = pendingLeaves + pendingLoans

    return (
        <div className="space-y-6">
            {/* ── KPI Strip ──────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiTile label="Total Employees" value={totalStaff} icon={Users} accent="bg-slate-900 text-white" />
                <KpiTile label="On Leave Today" value={onLeaveToday} icon={CalendarCheck} accent="bg-indigo-600 text-white" />
                <KpiTile label="Pending Leaves" value={pendingLeaves} icon={Clock} accent="bg-amber-500 text-white" />
                <KpiTile label="Pending Loans" value={pendingLoans} icon={CreditCard} accent="bg-violet-600 text-white" />
            </div>

            {/* ── Bento Row ──────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Attendance Donut */}
                <BentoCard title="Attendance Overview" subtitle="Based on approved leaves">
                    <div className="h-[220px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={donutData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={68}
                                    outerRadius={96}
                                    paddingAngle={3}
                                    dataKey="value"
                                    strokeWidth={0}
                                >
                                    {donutData.map((_, i) => (
                                        <Cell key={i} fill={DONUT_COLORS[i]} />
                                    ))}
                                </Pie>
                                <Tooltip content={<DonutTooltip />} />
                                {/* Center text via custom label */}
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    {/* Manual center overlay */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ top: 60 }}>
                        <div className="text-center">
                            <p className="text-3xl font-black text-slate-900 leading-none">{totalStaff}</p>
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mt-0.5">Total</p>
                        </div>
                    </div>
                    {/* Legend */}
                    <div className="flex items-center justify-center gap-6 mt-3">
                        <LegendDot color="bg-emerald-500" label={`Present — ${presentCount}`} />
                        <LegendDot color="bg-amber-500" label={`On Leave — ${onLeaveToday}`} />
                    </div>
                </BentoCard>

                {/* Employment Type */}
                <BentoCard title="Employment Types" subtitle={`${empTotal} employees profiled`}>
                    <div className="space-y-4 mt-2">
                        {/* Stacked bar */}
                        <div className="h-5 rounded-full overflow-hidden flex gap-[2px] bg-slate-100">
                            {empRows.map((row: any) => {
                                const c = EMPLOYMENT_COLORS[row.type] ?? EMPLOYMENT_COLORS.PERMANENT
                                return (
                                    <div
                                        key={row.type}
                                        className={cn("h-full transition-all duration-700", c.bar)}
                                        style={{ width: `${row.pct}%` }}
                                        title={`${row.type}: ${row.count}`}
                                    />
                                )
                            })}
                        </div>
                        {/* Legend rows */}
                        <div className="space-y-3">
                            {empRows.length === 0 ? (
                                <p className="text-sm text-slate-400 font-medium text-center py-4">No employment data yet.</p>
                            ) : empRows.map((row: any) => {
                                const c = EMPLOYMENT_COLORS[row.type] ?? EMPLOYMENT_COLORS.PERMANENT
                                return (
                                    <div key={row.type} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <div className={cn("h-2.5 w-2.5 rounded-full flex-shrink-0", c.bar)} />
                                            <span className="text-sm font-bold text-slate-700">{c.label}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div className={cn("h-full rounded-full", c.bar)} style={{ width: `${row.pct}%` }} />
                                            </div>
                                            <span className="text-xs font-black text-slate-500 w-12 text-right">{row.count} <span className="text-slate-300">({row.pct}%)</span></span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Quick stats below */}
                    <div className="mt-auto pt-4 border-t border-slate-50 grid grid-cols-2 gap-3">
                        <MiniStat label="Pending Leaves" value={pendingLeaves} color="text-amber-600" />
                        <MiniStat label="Pending Loans" value={pendingLoans} color="text-violet-600" />
                    </div>
                </BentoCard>

                {/* Payroll Widget — currency-normalised SAR grand total */}
                <BentoCard title="Est. Monthly Payroll" subtitle="Grand total in SAR base currency">
                    {/* Grand total */}
                    <div className="bg-slate-900 text-white rounded-2xl px-5 py-4 flex items-center justify-between flex-shrink-0">
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-0.5">Grand Total (SAR)</p>
                            <p className="text-2xl font-black">
                                {grandPayrollSAR >= 1_000_000
                                    ? `${(grandPayrollSAR / 1_000_000).toFixed(2)}M`
                                    : grandPayrollSAR >= 1_000
                                        ? `${(grandPayrollSAR / 1_000).toFixed(1)}K`
                                        : grandPayrollSAR.toLocaleString()}
                                <span className="text-sm font-bold text-white/40 ml-1">SAR</span>
                            </p>
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center">
                            <DollarSign className="h-5 w-5 text-white/60" />
                        </div>
                    </div>
                    {/* Per-branch local totals */}
                    <div className="space-y-2 flex-1 mt-1 overflow-hidden">
                        {branchPayrolls.length === 0 ? (
                            <div className="flex items-center justify-center py-4 text-slate-400">
                                <p className="text-xs font-medium">No branch payroll data.</p>
                            </div>
                        ) : branchPayrolls.map((bp: any) => (
                            <div key={bp.id} className="flex items-center justify-between px-2 py-1.5 rounded-xl hover:bg-slate-50 transition-colors">
                                <div className="flex items-center gap-2 min-w-0">
                                    <div className="h-6 w-6 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                                        <Building2 className="h-3 w-3 text-slate-500" />
                                    </div>
                                    <p className="text-xs font-bold text-slate-700 truncate">{bp.name}</p>
                                </div>
                                <div className="text-right flex-shrink-0 flex items-center gap-2">
                                    <span className="text-xs font-black text-slate-900">
                                        {bp.localTotal.toLocaleString()} <span className="text-[10px] font-bold text-slate-400">{bp.currency}</span>
                                    </span>
                                    {bp.rate !== 1.0 && (
                                        <span className="text-[9px] text-slate-400">≈{Math.round(bp.localTotal * bp.rate).toLocaleString()} SAR</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    {/* Top earners strip */}
                    {payrollData.length > 0 && (
                        <div className="pt-2 border-t border-slate-50 mt-auto space-y-1">
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1">Top Earners</p>
                            {payrollData.slice(0, 3).map((emp: any, i: number) => {
                                const totalPkg = (emp.basicSalary ?? 0) + (emp.housingAllowance ?? 0) + (emp.transportAllowance ?? 0) + (emp.otherAllowance ?? 0)
                                const initials = emp.user?.name?.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() || '??'
                                return (
                                    <div key={emp.id} className="flex items-center gap-2 px-1 py-1">
                                        <div className={cn("h-6 w-6 rounded-lg flex items-center justify-center text-[9px] font-black flex-shrink-0",
                                            i === 0 ? "bg-amber-400 text-white" : i === 1 ? "bg-slate-300 text-slate-700" : "bg-amber-700 text-white")}>
                                            {i + 1}
                                        </div>
                                        <p className="text-[11px] font-bold text-slate-700 flex-1 truncate">{emp.user?.name || '—'}</p>
                                        <p className="text-[11px] font-black text-slate-900">{totalPkg.toLocaleString()}</p>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                    <div className="pt-3 border-t border-slate-50">
                        <Link href="/admin/hr/payroll">
                            <Button variant="ghost" size="sm" className="w-full rounded-xl font-black text-xs uppercase text-slate-500 h-9 gap-1 hover:text-slate-900">
                                Full Payroll Report <ArrowRight className="h-3 w-3" />
                            </Button>
                        </Link>
                    </div>
                </BentoCard>
            </div>

            {/* ── KPI Leaderboard + Risk ─────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <KPILeaderboardWidget leaderboard={kpiLeaderboard} />
                <KPIRiskWidget riskStaff={kpiRiskStaff} />
            </div>

            {/* ── Expiry Alerts ──────────────────────────────────────────── */}
            <ExpiryAlertsWidget alerts={expiryAlerts} />

            {/* ── Branch Breakdown + Recent Requests ─────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-3">
                    <SectionHeader title="Branch Breakdown" />
                    {branches.length === 0 ? (
                        <EmptyWidget icon={Building2} message="No branches configured." />
                    ) : (
                        <div className="space-y-3">
                            {branches.map((branch: any) => {
                                const employees = branch.employees || []
                                return (
                                    <div key={branch.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                        <div className="flex items-center justify-between px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 rounded-xl bg-slate-900 flex items-center justify-center flex-shrink-0">
                                                    <Building2 className="h-4 w-4 text-white" />
                                                </div>
                                                <div>
                                                    <p className="font-black text-slate-900 text-sm">{branch.nameEn}</p>
                                                    {branch.location && <p className="text-[10px] text-slate-400 font-medium">{branch.location}</p>}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="h-1.5 w-24 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                                                    <div
                                                        className="h-full bg-indigo-500 rounded-full transition-all"
                                                        style={{ width: `${Math.min(100, (employees.length / Math.max(totalStaff, 1)) * 100 * 3)}%` }}
                                                    />
                                                </div>
                                                <Badge className="bg-slate-100 text-slate-700 border-none font-black text-xs rounded-lg">
                                                    {employees.length} {employees.length === 1 ? 'person' : 'people'}
                                                </Badge>
                                            </div>
                                        </div>
                                        {employees.length > 0 && (
                                            <div className="px-5 pb-4 flex flex-wrap gap-2">
                                                {employees.slice(0, 7).map((emp: any) => (
                                                    <div key={emp.id} className="flex items-center gap-1.5 bg-slate-50 rounded-lg px-2 py-1">
                                                        <div className="h-5 w-5 rounded-full bg-slate-200 flex items-center justify-center text-[9px] font-black text-slate-600 flex-shrink-0">
                                                            {emp.user?.name?.charAt(0)?.toUpperCase() || '?'}
                                                        </div>
                                                        <span className="text-[11px] font-bold text-slate-700">{emp.user?.name?.split(' ')[0]}</span>
                                                    </div>
                                                ))}
                                                {employees.length > 7 && (
                                                    <div className="flex items-center bg-slate-100 rounded-lg px-2 py-1">
                                                        <span className="text-[11px] font-black text-slate-500">+{employees.length - 7}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                            {unassignedCount > 0 && (
                                <div className="bg-amber-50 border border-amber-100 rounded-2xl px-5 py-3.5 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                                        <p className="text-sm font-bold text-amber-800">Unassigned to Branch</p>
                                    </div>
                                    <Badge className="bg-amber-100 text-amber-700 border-none font-black text-xs rounded-lg">{unassignedCount}</Badge>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Recent Requests */}
                <div className="space-y-3">
                    <SectionHeader title="Recent Leave Requests" />
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        {recentLeaves.length === 0 ? (
                            <div className="p-8 text-center">
                                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-300" />
                                <p className="font-black text-slate-600 text-sm">All clear</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-50">
                                {recentLeaves.map((req: any) => (
                                    <div key={req.id} className="flex items-center justify-between px-4 py-3">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-600 flex-shrink-0">
                                                {req.user?.name?.charAt(0)?.toUpperCase() || '?'}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-black text-slate-900 truncate">{req.user?.name}</p>
                                                <p className="text-[10px] text-slate-400 font-medium">{req.type} · {new Date(req.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</p>
                                            </div>
                                        </div>
                                        <StatusPill status={req.status} />
                                    </div>
                                ))}
                            </div>
                        )}
                        {pendingTotal > 0 && (
                            <div className="px-4 py-3 border-t border-slate-50">
                                <Link href="/admin/hr?tab=inbox">
                                    <Button variant="ghost" size="sm" className="w-full rounded-xl font-black text-xs uppercase text-indigo-600 h-8 gap-1">
                                        Review {pendingTotal} Pending <ArrowRight className="h-3 w-3" />
                                    </Button>
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

// ── KPI Leaderboard Widget ────────────────────────────────────────────────────

function KPILeaderboardWidget({ leaderboard }: { leaderboard: any[] }) {
    const now   = new Date()
    const label = `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col gap-3">
            <div>
                <p className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <Star className="h-4 w-4 text-amber-500" />
                    KPI Leaderboard
                </p>
                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">
                    Top performers — {label}
                </p>
            </div>

            {leaderboard.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-slate-400 flex-1">
                    <TrendingUp className="h-8 w-8 mb-2 text-slate-200" />
                    <p className="text-sm font-medium text-center">No KPI evaluations yet.<br/>Run calculations from a staff profile.</p>
                </div>
            ) : (
                <div className="space-y-2 flex-1">
                    {leaderboard.map((rec: any, i: number) => {
                        const g        = kpiGrade(rec.totalScore)
                        const name     = rec.user?.name || '—'
                        const position = rec.user?.profile?.position || rec.user?.profile?.department || '—'
                        const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
                        const medal    = i === 0 ? 'bg-amber-400 text-white' : i === 1 ? 'bg-slate-300 text-slate-700' : i === 2 ? 'bg-amber-700 text-white' : 'bg-slate-100 text-slate-600'
                        return (
                            <div key={rec.id} className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-slate-50 transition-colors">
                                <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center text-[10px] font-black flex-shrink-0", medal)}>
                                    {i < 3 ? (i + 1) : initials}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-black text-slate-900 truncate">{name}</p>
                                    <p className="text-[10px] text-slate-400 font-medium truncate">{position}</p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                                        <div className={cn("h-full rounded-full", g.bar)} style={{ width: `${rec.totalScore}%` }} />
                                    </div>
                                    <span className={cn("text-sm font-black w-10 text-right", g.color)}>{rec.totalScore}</span>
                                    <Badge className={cn("border-none text-[9px] font-black uppercase rounded-md px-1.5 py-0 hidden md:inline-flex", g.bg, g.color)}>
                                        {g.label}
                                    </Badge>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
            <div className="pt-2 border-t border-slate-50 mt-auto">
                <Link href="/admin/hr?tab=directory">
                    <Button variant="ghost" size="sm" className="w-full rounded-xl font-black text-xs uppercase text-slate-500 h-9 gap-1 hover:text-slate-900">
                        View All Staff <ArrowRight className="h-3 w-3" />
                    </Button>
                </Link>
            </div>
        </div>
    )
}

// ── KPI Risk Widget ───────────────────────────────────────────────────────────

function KPIRiskWidget({ riskStaff }: { riskStaff: any[] }) {
    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-black text-slate-900 flex items-center gap-2">
                        <TrendingDown className="h-4 w-4 text-rose-500" />
                        At-Risk Employees
                    </p>
                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">
                        KPI score below 50 this month
                    </p>
                </div>
                {riskStaff.length > 0 && (
                    <span className="bg-rose-100 text-rose-700 font-black text-[11px] uppercase px-2.5 py-1 rounded-lg">
                        {riskStaff.length} flagged
                    </span>
                )}
            </div>

            {riskStaff.length === 0 ? (
                <div className="flex items-center gap-3 bg-emerald-50 rounded-xl px-4 py-3 flex-1">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                    <p className="text-sm font-bold text-emerald-800">No at-risk employees this month.</p>
                </div>
            ) : (
                <div className="space-y-2 flex-1">
                    {riskStaff.map((rec: any) => {
                        const g = kpiGrade(rec.totalScore)
                        return (
                            <div key={rec.id} className="flex items-center gap-3 bg-rose-50 border border-rose-100 px-3 py-2.5 rounded-xl">
                                <div className="h-7 w-7 rounded-lg bg-rose-100 flex items-center justify-center flex-shrink-0">
                                    <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-black text-slate-900 truncate">{rec.user?.name || '—'}</p>
                                    <div className="w-full h-1.5 bg-rose-100 rounded-full mt-1 overflow-hidden">
                                        <div className={cn("h-full rounded-full", g.bar)} style={{ width: `${rec.totalScore}%` }} />
                                    </div>
                                </div>
                                <span className={cn("text-sm font-black flex-shrink-0", g.color)}>{rec.totalScore}</span>
                            </div>
                        )
                    })}
                </div>
            )}
            <div className="pt-2 border-t border-slate-50 mt-auto">
                <Link href="/admin/hr?tab=directory">
                    <Button variant="ghost" size="sm" className="w-full rounded-xl font-black text-xs uppercase text-slate-500 h-9 gap-1 hover:text-slate-900">
                        Manage in Directory <ArrowRight className="h-3 w-3" />
                    </Button>
                </Link>
            </div>
        </div>
    )
}

// ── Expiry Alerts Widget ──────────────────────────────────────────────────────

function ExpiryAlertsWidget({ alerts }: { alerts: any[] }) {
    const expired = alerts.filter((a: any) => a.status === 'EXPIRED')
    const warning = alerts.filter((a: any) => a.status === 'WARNING')

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <p className="text-sm font-black text-slate-900 flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4 text-rose-500" />
                        Document Expiry Alerts
                    </p>
                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">
                        {alerts.length === 0
                            ? 'All documents valid — 60-day watch'
                            : `${expired.length} expired / critical · ${warning.length} expiring soon`}
                    </p>
                </div>
                {alerts.length > 0 && (
                    <div className="flex gap-2">
                        {expired.length > 0 && (
                            <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 font-black text-[10px] uppercase px-2.5 py-1 rounded-lg">
                                {expired.length} Critical
                            </span>
                        )}
                        {warning.length > 0 && (
                            <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 font-black text-[10px] uppercase px-2.5 py-1 rounded-lg">
                                {warning.length} Warning
                            </span>
                        )}
                    </div>
                )}
            </div>

            {alerts.length === 0 ? (
                <div className="flex items-center gap-3 bg-emerald-50 rounded-xl px-4 py-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                    <p className="text-sm font-bold text-emerald-800">All employee documents are valid for the next 60 days.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {alerts.map((alert: any, i: number) => {
                        const isExpired = alert.status === 'EXPIRED'
                        const days = alert.daysRemaining
                        const daysText = days < 0
                            ? `Expired ${Math.abs(days)}d ago`
                            : days === 0 ? 'Expires today!'
                            : `${days}d remaining`
                        return (
                            <div
                                key={i}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-xl border",
                                    isExpired
                                        ? "bg-red-50 border-red-100"
                                        : "bg-amber-50 border-amber-100"
                                )}
                            >
                                <div className={cn(
                                    "h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0",
                                    isExpired ? "bg-red-100" : "bg-amber-100"
                                )}>
                                    <AlertTriangle className={cn("h-4 w-4", isExpired ? "text-red-600" : "text-amber-600")} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-black text-slate-900 truncate">{alert.user?.name}</p>
                                    <p className="text-[10px] font-bold text-slate-500 truncate">{alert.document}</p>
                                    <p className={cn(
                                        "text-[10px] font-black mt-0.5",
                                        isExpired ? "text-red-600" : "text-amber-600"
                                    )}>
                                        {daysText}
                                    </p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {alerts.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-50">
                    <Link href="/admin/hr?tab=directory">
                        <Button variant="ghost" size="sm" className="w-full rounded-xl font-black text-xs uppercase text-slate-500 h-9 gap-1 hover:text-slate-900">
                            Manage Documents in Directory <ArrowRight className="h-3 w-3" />
                        </Button>
                    </Link>
                </div>
            )}
        </div>
    )
}

// ── Shared UI helpers ─────────────────────────────────────────────────────────

function BentoCard({ title, subtitle, children }: { title: string, subtitle?: string, children: React.ReactNode }) {
    return (
        <div className="relative bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col gap-2 min-h-[340px]">
            <div className="mb-1">
                <p className="text-sm font-black text-slate-900">{title}</p>
                {subtitle && <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{subtitle}</p>}
            </div>
            {children}
        </div>
    )
}

function KpiTile({ label, value, icon: Icon, accent }: { label: string, value: number, icon: any, accent: string }) {
    return (
        <div className={cn("rounded-2xl p-5 shadow-sm flex flex-col gap-3", accent)}>
            <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{label}</p>
                <div className="h-8 w-8 rounded-xl bg-white/10 flex items-center justify-center">
                    <Icon className="h-4 w-4" />
                </div>
            </div>
            <p className="text-4xl font-black">{value}</p>
        </div>
    )
}

function SectionHeader({ title }: { title: string }) {
    return <p className="text-sm font-black uppercase tracking-widest text-slate-400">{title}</p>
}

function LegendDot({ color, label }: { color: string, label: string }) {
    return (
        <div className="flex items-center gap-1.5">
            <div className={cn("h-2.5 w-2.5 rounded-full", color)} />
            <span className="text-xs font-bold text-slate-600">{label}</span>
        </div>
    )
}

function MiniStat({ label, value, color }: { label: string, value: number, color: string }) {
    return (
        <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">{label}</p>
            <p className={cn("text-2xl font-black", color)}>{value}</p>
        </div>
    )
}

function EmptyWidget({ icon: Icon, message }: { icon: any, message: string }) {
    return (
        <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
            <Icon className="h-8 w-8 mx-auto mb-2 text-slate-200" />
            <p className="text-sm font-medium text-slate-400">{message}</p>
        </div>
    )
}

function StatusPill({ status }: { status: string }) {
    const map: Record<string, string> = {
        PENDING: 'bg-amber-100 text-amber-700',
        PENDING_MANAGER: 'bg-amber-100 text-amber-700',
        PENDING_HR: 'bg-amber-100 text-amber-700',
        APPROVED: 'bg-emerald-100 text-emerald-700',
        REJECTED: 'bg-red-100 text-red-700',
        ACTIVE: 'bg-indigo-100 text-indigo-700',
    }
    return (
        <Badge className={cn("border-none font-black text-[9px] uppercase rounded-md px-1.5 whitespace-nowrap flex-shrink-0", map[status] || 'bg-slate-100 text-slate-600')}>
            {status?.replace(/_/g, ' ')}
        </Badge>
    )
}
