import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getWeeklyDigest } from "@/app/admin/supervision/actions"
import { BackButton } from "@/components/ui/back-button"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks } from "date-fns"
import {
    FileText, Users, Clock, AlertTriangle, TrendingUp,
    ChevronLeft, ChevronRight, BarChart3
} from "lucide-react"
import { db } from "@/lib/db"
import { PrintReportButton } from "@/components/supervision/print-report-button"

export default async function SupervisionReportsPage({
    searchParams
}: {
    searchParams: Promise<{ mode?: string; year?: string; month?: string; week?: string }>
}) {
    const session = await auth()
    const userRole = (session?.user as any)?.role
    const tenantId = (session?.user as any)?.tenantId

    if (!['ADMIN', 'PM', 'HR', 'SITE_ENGINEER', 'GLOBAL_SUPER_ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
        redirect('/dashboard')
    }

    const { mode = 'weekly', year, month, week } = await searchParams
    const now = new Date()
    const currentYear = parseInt(year || String(now.getFullYear()))
    const currentMonth = parseInt(month || String(now.getMonth() + 1))
    const weekOffset = parseInt(week || '0')

    let startDate: Date, endDate: Date, periodLabel: string

    if (mode === 'monthly') {
        startDate = startOfMonth(new Date(currentYear, currentMonth - 1))
        endDate = endOfMonth(new Date(currentYear, currentMonth - 1))
        periodLabel = format(startDate, 'MMMM yyyy')
    } else {
        const refDate = subWeeks(now, weekOffset)
        startDate = startOfWeek(refDate, { weekStartsOn: 6 as const })
        endDate = endOfWeek(refDate, { weekStartsOn: 6 as const })
        periodLabel = `${format(startDate, 'dd MMM')} – ${format(endDate, 'dd MMM yyyy')}`
    }

    const digest = await getWeeklyDigest(startDate, endDate)

    const companyProfile = await (db as any).companyProfile.findFirst({
        where: tenantId ? { tenantId } : {},
        select: { companyNameEn: true, logoUrl: true }
    }).catch(() => null)

    const brandName = companyProfile?.companyNameEn || 'Field Supervision Reports'
    const logoUrl = companyProfile?.logoUrl
    const primaryColor = '#1e293b'

    const prevWeek = weekOffset + 1
    const nextWeek = Math.max(0, weekOffset - 1)
    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1
    const prevMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear
    const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1
    const nextMonthYear = currentMonth === 12 ? currentYear + 1 : currentYear

    return (
        <div className="space-y-6 pb-20 min-h-screen bg-slate-50/50">
            {/* Header bar */}
            <div className="flex items-center justify-between flex-wrap gap-4 print:hidden">
                <div className="flex items-center gap-3">
                    <BackButton />
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                            <BarChart3 className="h-6 w-6 text-primary" />
                            Automated Site Reports
                        </h1>
                        <p className="text-sm text-slate-500">تقارير الموقع الأسبوعية والشهرية التلقائية</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Link href="?mode=weekly">
                        <Button variant={mode !== 'monthly' ? 'default' : 'outline'} size="sm" className="rounded-xl font-bold">Weekly</Button>
                    </Link>
                    <Link href="?mode=monthly">
                        <Button variant={mode === 'monthly' ? 'default' : 'outline'} size="sm" className="rounded-xl font-bold">Monthly</Button>
                    </Link>
                    <PrintReportButton fileName={`${mode === 'monthly' ? 'Monthly' : 'Weekly'}-Report-${periodLabel.replace(/\s/g, '-')}`} />
                </div>
            </div>

            {/* Period Navigator */}
            <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-100 shadow-sm px-6 py-4 print:hidden">
                <Link href={mode === 'monthly' ? `?mode=monthly&year=${prevMonthYear}&month=${prevMonth}` : `?mode=weekly&week=${prevWeek}`}>
                    <Button variant="ghost" size="icon" className="rounded-xl"><ChevronLeft className="h-4 w-4" /></Button>
                </Link>
                <div className="text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{mode === 'monthly' ? 'Monthly Report' : 'Weekly Report'}</p>
                    <p className="text-xl font-black text-slate-900">{periodLabel}</p>
                </div>
                <Link href={mode === 'monthly' ? `?mode=monthly&year=${nextMonthYear}&month=${nextMonth}` : `?mode=weekly&week=${nextWeek}`}>
                    <Button variant="ghost" size="icon" className="rounded-xl"><ChevronRight className="h-4 w-4" /></Button>
                </Link>
            </div>

            {/* Printable Document */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden print:shadow-none print:rounded-none print:border-none">

                {/* Brand Header */}
                <div className="px-10 py-7 flex justify-between items-center" style={{ backgroundColor: primaryColor }}>
                    <div className="flex items-center gap-4">
                        {logoUrl && <img src={logoUrl} alt="Logo" className="h-12 object-contain" />}
                        <div>
                            <h2 className="text-white font-black text-xl tracking-tight">{brandName}</h2>
                            <p className="text-white/50 text-xs font-bold uppercase tracking-widest mt-0.5">Field Supervision Department</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest">
                            {mode === 'monthly' ? 'Monthly Summary Report' : 'Weekly Summary Report'}
                        </p>
                        <p className="text-white font-black text-lg">{periodLabel}</p>
                        <p className="text-white/40 text-[10px] mt-1 font-mono">Generated: {format(new Date(), 'dd MMM yyyy, HH:mm')}</p>
                    </div>
                </div>

                {/* KPI Strip */}
                <div className="grid grid-cols-2 md:grid-cols-5 border-b border-slate-100 divide-x divide-slate-100">
                    {([
                        { label: 'DSRs Filed', value: String(digest.reportCount), icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
                        { label: 'Total Manpower', value: digest.totalManpower.toLocaleString(), icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                        { label: 'Est. Man-Hours', value: digest.totalManHours.toLocaleString(), icon: Clock, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                        { label: 'Avg Completion', value: `${digest.avgCompletion}%`, icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' },
                        { label: 'Open NCRs', value: String(digest.pendingNCRs), icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
                    ] as const).map(({ label, value, icon: Icon, color, bg }) => (
                        <div key={label} className="p-6">
                            <div className={`h-9 w-9 rounded-xl ${bg} flex items-center justify-center mb-3`}>
                                <Icon className={`h-4 w-4 ${color}`} />
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
                            <p className={`text-2xl font-black mt-1 ${color}`}>{value}</p>
                        </div>
                    ))}
                </div>

                <div className="px-10 py-8 space-y-8">
                    {/* Project Breakdown */}
                    {digest.projectBreakdown.length > 0 && (
                        <section>
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <span className="h-4 w-1 rounded-full bg-blue-500 inline-block" />
                                Project Performance Breakdown
                            </h3>
                            <table className="w-full text-sm border border-slate-200 rounded-2xl overflow-hidden">
                                <thead className="bg-slate-50">
                                    <tr>
                                        {['Project', 'Code', 'DSRs Filed', 'Total Manpower', 'Est. Man-Hours', 'Avg Completion'].map(h => (
                                            <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {digest.projectBreakdown.map((p, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50/50">
                                            <td className="px-4 py-3 font-bold text-slate-900">{p.name}</td>
                                            <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.code}</td>
                                            <td className="px-4 py-3 font-black text-blue-700">{p.reports}</td>
                                            <td className="px-4 py-3 font-black text-emerald-700">{p.manpower.toLocaleString()}</td>
                                            <td className="px-4 py-3 font-black text-indigo-700">{(p.manpower * 8).toLocaleString()}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-1 bg-slate-100 rounded-full h-2 min-w-[80px]">
                                                        <div
                                                            className="h-2 rounded-full transition-all"
                                                            style={{
                                                                width: `${p.avgCompletion}%`,
                                                                backgroundColor: p.avgCompletion >= 75 ? '#10b981' : p.avgCompletion >= 50 ? '#3b82f6' : '#f59e0b'
                                                            }}
                                                        />
                                                    </div>
                                                    <span className="text-xs font-black text-slate-700 w-10 text-right">{p.avgCompletion}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </section>
                    )}

                    {/* NCR Activity */}
                    {digest.ncrs.length > 0 && (
                        <section>
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <span className="h-4 w-1 rounded-full bg-red-500 inline-block" />
                                NCR Activity — {periodLabel}
                            </h3>
                            <div className="grid grid-cols-3 gap-4">
                                {[
                                    { label: 'New NCRs Issued', value: digest.newNCRs, cls: 'bg-orange-50 border-orange-200 text-orange-700' },
                                    { label: 'Critical Severity', value: digest.criticalNCRs, cls: 'bg-red-50 border-red-200 text-red-700' },
                                    { label: 'Still Pending', value: digest.pendingNCRs, cls: 'bg-amber-50 border-amber-200 text-amber-700' },
                                ].map(({ label, value, cls }) => (
                                    <div key={label} className={`rounded-2xl border p-5 ${cls}`}>
                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">{label}</p>
                                        <p className="text-3xl font-black">{value}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* DSR Log */}
                    {digest.reports.length > 0 ? (
                        <section>
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <span className="h-4 w-1 rounded-full bg-emerald-500 inline-block" />
                                Daily Report Log ({digest.reports.length} records)
                            </h3>
                            <table className="w-full text-sm border border-slate-200 rounded-2xl overflow-hidden">
                                <thead className="bg-slate-50">
                                    <tr>
                                        {['Date', 'Project', 'Manpower', 'Completion', 'Filed By', 'Status'].map(h => (
                                            <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {(digest.reports as any[]).map((r) => (
                                        <tr key={r.id} className="hover:bg-slate-50/50">
                                            <td className="px-4 py-3 text-xs font-bold text-slate-700 whitespace-nowrap">{format(new Date(r.date), 'dd MMM yyyy')}</td>
                                            <td className="px-4 py-3 font-medium text-slate-900">{r.project.name}</td>
                                            <td className="px-4 py-3 font-black text-emerald-700">{r.totalManpower || 0}</td>
                                            <td className="px-4 py-3 font-black text-blue-700">{r.currentCompletion || 0}%</td>
                                            <td className="px-4 py-3 text-xs text-slate-500">{r.createdBy?.name || '—'}</td>
                                            <td className="px-4 py-3">
                                                <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${r.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                    {r.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </section>
                    ) : (
                        <div className="text-center py-16 text-slate-400">
                            <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                            <p className="font-bold">No reports filed for this period</p>
                            <p className="text-sm mt-1">Try selecting a different date range</p>
                        </div>
                    )}

                    {/* Signature Block */}
                    <div className="grid grid-cols-2 gap-16 pt-8 border-t border-slate-200">
                        {['Site Supervision Manager', 'Project Manager / Client Representative'].map(role => (
                            <div key={role} className="text-center">
                                <div className="border-b border-slate-300 w-3/4 mx-auto mb-4 mt-12" />
                                <p className="text-xs font-black text-slate-700">{role}</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">Signature & Stamp</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-10 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                    <p className="text-[10px] text-slate-400">{brandName} · Supervision Reports · {periodLabel}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Confidential</p>
                </div>
            </div>

            <style>{`
                @media print {
                    body { background: white !important; }
                    @page { margin: 12mm; size: A4; }
                    .print\\:hidden { display: none !important; }
                }
            `}</style>
        </div>
    )
}
