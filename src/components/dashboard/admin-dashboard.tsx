"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import {
    Building2, Users, Wallet, HardHat, ArrowUpRight,
    AlertTriangle, FileWarning, TrendingUp, BarChart3,
    Clock, ChevronRight, Activity, Shield
} from "lucide-react"
import { TimesheetWidget } from "@/components/dashboard/timesheet-widget"
import { RecentUploadsFeed } from "@/components/dashboard/recent-uploads-feed"
import { ProjectStatusChart } from "@/components/dashboard/charts/project-status-chart"
import { FinancialHealthChart } from "@/components/dashboard/charts/financial-health-chart"
import { HrSupervisionChart } from "@/components/dashboard/charts/hr-supervision-chart"
import { cn } from "@/lib/utils"

type AdminDashboardProps = {
    projects: any[]
    engineers: any[]
    hrData: any[]
    financeSummary: {
        totalReceivables: number
        activeInvoices: number
        totalPaid?: number
        totalContractValue?: number
        totalExpenses?: number
    }
    supervisionSummary?: { reportsCount: number }
    companyProfile?: {
        companyNameAr?: string
        companyNameEn?: string
        logoUrl?: string | null
        vatPercentage?: number
        vatNumber?: string | null
        defaultCurrency?: string
        workingHoursPerDay?: number
    } | null
    recentUploads: any[]
    user: any
}

const fmt = (n: number) =>
    n >= 1_000_000
        ? `${(n / 1_000_000).toFixed(1)}M`
        : n >= 1_000
            ? `${(n / 1_000).toFixed(0)}K`
            : n.toLocaleString()

const stagger = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } }

export function AdminDashboard({
    projects, engineers, hrData, financeSummary,
    supervisionSummary, companyProfile, recentUploads, user
}: AdminDashboardProps) {

    const currency = companyProfile?.defaultCurrency || "SAR"
    const activeProjects = projects.filter(p => p.status === 'ACTIVE')
    const delayedProjects = activeProjects.filter(p => {
        if (!p.startDate || !p.totalDuration) return false
        const end = new Date(p.startDate)
        end.setDate(end.getDate() + p.totalDuration * 7)
        return end < new Date() && p.completionPercent < 100
    })
    const expiringStaff = hrData.filter(e => {
        const soon = new Date(Date.now() + 30 * 864e5)
        return (e.idExpiry && new Date(e.idExpiry) < soon) ||
            (e.passportExpiry && new Date(e.passportExpiry) < soon)
    })
    const portfolioValue = financeSummary.totalContractValue || 0

    const kpiCards = [
        {
            href: "/admin/finance",
            accent: "#0ea5e9",        // sky-500
            accentBg: "bg-sky-50",
            accentText: "text-sky-700",
            accentBorder: "border-sky-200",
            icon: Wallet,
            iconBg: "bg-sky-500",
            module: "Finance & Receivables",
            value: `${currency} ${fmt(financeSummary.totalReceivables)}`,
            sub: `${financeSummary.activeInvoices} outstanding invoice${financeSummary.activeInvoices !== 1 ? 's' : ''}`,
            foot: `Collected: ${currency} ${fmt(financeSummary.totalPaid || 0)}`,
            alert: financeSummary.activeInvoices > 0,
        },
        {
            href: "/admin/projects",
            accent: "#6366f1",        // indigo-500
            accentBg: "bg-indigo-50",
            accentText: "text-indigo-700",
            accentBorder: "border-indigo-200",
            icon: Building2,
            iconBg: "bg-indigo-500",
            module: "Projects Portfolio",
            value: String(activeProjects.length),
            sub: `${delayedProjects.length} running delayed`,
            foot: `Portfolio: ${currency} ${fmt(portfolioValue)}`,
            alert: delayedProjects.length > 0,
        },
        {
            href: "/admin/hr",
            accent: "#f43f5e",        // rose-500
            accentBg: "bg-rose-50",
            accentText: "text-rose-700",
            accentBorder: "border-rose-200",
            icon: Users,
            iconBg: "bg-rose-500",
            module: "Human Resources",
            value: String(hrData.length),
            sub: `${expiringStaff.length} document expir${expiringStaff.length !== 1 ? 'ies' : 'y'} soon`,
            foot: "All branches — Full headcount",
            alert: expiringStaff.length > 0,
        },
        {
            href: "/admin/supervision",
            accent: "#22c55e",        // emerald-500
            accentBg: "bg-emerald-50",
            accentText: "text-emerald-700",
            accentBorder: "border-emerald-200",
            icon: HardHat,
            iconBg: "bg-emerald-500",
            module: "Supervision",
            value: String(supervisionSummary?.reportsCount || 0),
            sub: `${engineers.length} active site engineer${engineers.length !== 1 ? 's' : ''}`,
            foot: "DSRs · IRs · NCRs tracked",
            alert: false,
        },
    ]

    return (
        <div className="space-y-8 pb-20">

            {/* ── Company Identity Banner ─────────────────────────────── */}
            <div className="relative overflow-hidden rounded-3xl bg-[#1e293b] px-8 py-7 shadow-2xl">
                {/* subtle grid texture */}
                <div className="pointer-events-none absolute inset-0 opacity-[0.04]"
                    style={{ backgroundImage: 'repeating-linear-gradient(0deg,#fff 0px,#fff 1px,transparent 1px,transparent 40px),repeating-linear-gradient(90deg,#fff 0px,#fff 1px,transparent 1px,transparent 40px)' }} />
                <div className="relative flex items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        {companyProfile?.logoUrl ? (
                            <img src={companyProfile.logoUrl} alt="logo"
                                className="h-14 w-14 rounded-2xl object-contain bg-white p-1.5 shadow-lg" />
                        ) : (
                            <div className="h-14 w-14 rounded-2xl bg-white/10 flex items-center justify-center">
                                <Shield className="h-7 w-7 text-white" />
                            </div>
                        )}
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-1">
                                Master Command Center
                            </p>
                            <h1 className="text-2xl font-black text-white leading-none tracking-tight">
                                {companyProfile?.companyNameEn || "TO-PO Engineering Dashboard"}
                            </h1>
                            {companyProfile?.companyNameAr && (
                                <p className="text-sm font-bold text-white/50 mt-1" dir="rtl">
                                    {companyProfile.companyNameAr}
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="hidden md:flex items-center gap-8 text-right">
                        <div>
                            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">VAT Rate</p>
                            <p className="text-xl font-black text-white">{companyProfile?.vatPercentage ?? 15}%</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Currency</p>
                            <p className="text-xl font-black text-white">{currency}</p>
                        </div>
                        {companyProfile?.vatNumber && (
                            <div>
                                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">VAT No.</p>
                                <p className="text-sm font-mono font-bold text-white/70">{companyProfile.vatNumber}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── 4-Column KPI Cards ──────────────────────────────────── */}
            <motion.div
                className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4"
                initial="hidden"
                animate="show"
                variants={{ show: { transition: { staggerChildren: 0.08 } } }}
            >
                {kpiCards.map((card) => {
                    const Icon = card.icon
                    return (
                        <motion.div key={card.href} variants={stagger}>
                            <Link href={card.href} className="group block h-full">
                                <div className="relative h-full overflow-hidden rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                                    {/* colored top accent bar */}
                                    <div className="h-1.5 w-full" style={{ backgroundColor: card.accent }} />

                                    <div className="p-6">
                                        {/* header row */}
                                        <div className="flex items-center justify-between mb-5">
                                            <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shadow-sm", card.iconBg)}>
                                                <Icon className="h-5 w-5 text-white" />
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {card.alert && (
                                                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                                                )}
                                                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all" />
                                            </div>
                                        </div>

                                        {/* module label */}
                                        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mb-2">
                                            {card.module}
                                        </p>

                                        {/* primary value */}
                                        <p className="text-4xl font-black text-slate-900 leading-none tracking-tight mb-2">
                                            {card.value}
                                        </p>

                                        {/* sub metric */}
                                        <p className={cn("text-xs font-bold mb-4", card.alert ? "text-amber-600" : "text-slate-500")}>
                                            {card.sub}
                                        </p>

                                        {/* footer detail */}
                                        <div className={cn("rounded-xl px-3 py-2 border text-[11px] font-bold", card.accentBg, card.accentText, card.accentBorder)}>
                                            {card.foot}
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        </motion.div>
                    )
                })}
            </motion.div>

            {/* ── Main Content: Project Table + Sidebar ───────────────── */}
            <div className="grid gap-6 lg:grid-cols-[1fr_380px]">

                {/* Active Projects Table */}
                <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
                        <div className="flex items-center gap-2.5">
                            <Building2 className="h-4 w-4 text-indigo-500" />
                            <h2 className="text-sm font-black uppercase tracking-wider text-slate-700">Active Projects</h2>
                        </div>
                        <Link href="/admin/projects"
                            className="text-[11px] font-black text-indigo-600 hover:text-indigo-800 flex items-center gap-1 uppercase tracking-wider transition-colors">
                            View All <ArrowUpRight className="h-3 w-3" />
                        </Link>
                    </div>
                    <div className="divide-y divide-slate-50">
                        {activeProjects.length === 0 && (
                            <p className="text-center text-slate-400 text-sm py-10 font-medium">No active projects.</p>
                        )}
                        {activeProjects.slice(0, 6).map((p) => {
                            const pct = Math.round(p.completionPercent || 0)
                            const isDelayed = delayedProjects.some(d => d.id === p.id)
                            return (
                                <Link href={`/admin/projects/${p.id}`} key={p.id}
                                    className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/80 transition-colors group">
                                    {/* status dot */}
                                    <div className={cn("h-2.5 w-2.5 rounded-full flex-shrink-0 mt-0.5",
                                        isDelayed ? "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]"
                                            : "bg-emerald-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]"
                                    )} />
                                    {/* name + code */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-black text-slate-900 truncate group-hover:text-indigo-700 transition-colors">
                                            {p.name}
                                        </p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                                            {p.code} {isDelayed && "· ⚠ Delayed"}
                                        </p>
                                    </div>
                                    {/* contract value */}
                                    {p.contractValue && (
                                        <p className="text-xs font-bold text-slate-500 hidden sm:block flex-shrink-0">
                                            {currency} {fmt(p.contractValue)}
                                        </p>
                                    )}
                                    {/* progress bar */}
                                    <div className="flex items-center gap-2 flex-shrink-0 w-28">
                                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className={cn("h-full rounded-full transition-all",
                                                    isDelayed ? "bg-red-500" : pct === 100 ? "bg-emerald-500" : "bg-indigo-500"
                                                )}
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                        <span className="text-[11px] font-black text-slate-700 w-8 text-right">{pct}%</span>
                                    </div>
                                </Link>
                            )
                        })}
                    </div>
                </div>

                {/* Right Sidebar */}
                <div className="space-y-5">
                    {/* Alert Panel */}
                    {(delayedProjects.length > 0 || expiringStaff.length > 0) && (
                        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
                            <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/60 flex items-center gap-2">
                                <Activity className="h-4 w-4 text-amber-500" />
                                <h2 className="text-sm font-black uppercase tracking-wider text-slate-700">Action Required</h2>
                            </div>
                            <div className="p-4 space-y-3">
                                {delayedProjects.length > 0 && (
                                    <Link href="/admin/projects"
                                        className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 border border-amber-100 hover:border-amber-300 hover:bg-amber-100/70 transition-all group">
                                        <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-xs font-black text-amber-900">
                                                {delayedProjects.length} Project{delayedProjects.length !== 1 ? 's' : ''} Delayed
                                            </p>
                                            <p className="text-[10px] text-amber-700 mt-0.5 font-medium">
                                                Past estimated completion date
                                            </p>
                                        </div>
                                        <ChevronRight className="h-3.5 w-3.5 text-amber-400 group-hover:translate-x-0.5 transition-transform mt-0.5 ml-auto flex-shrink-0" />
                                    </Link>
                                )}
                                {expiringStaff.length > 0 && (
                                    <Link href="/admin/hr"
                                        className="flex items-start gap-3 p-3 rounded-xl bg-rose-50 border border-rose-100 hover:border-rose-300 hover:bg-rose-100/70 transition-all group">
                                        <FileWarning className="h-4 w-4 text-rose-600 mt-0.5 flex-shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-xs font-black text-rose-900">
                                                {expiringStaff.length} Document Expir{expiringStaff.length !== 1 ? 'ies' : 'y'}
                                            </p>
                                            <p className="text-[10px] text-rose-700 mt-0.5 font-medium">
                                                Renewal required within 30 days
                                            </p>
                                        </div>
                                        <ChevronRight className="h-3.5 w-3.5 text-rose-400 group-hover:translate-x-0.5 transition-transform mt-0.5 ml-auto flex-shrink-0" />
                                    </Link>
                                )}
                            </div>
                        </div>
                    )}

                    <RecentUploadsFeed uploads={recentUploads} />

                    <div className="relative z-10">
                        <TimesheetWidget
                            projects={projects}
                            dailyGoal={companyProfile?.workingHoursPerDay || 8}
                        />
                    </div>
                </div>
            </div>

            {/* ── Analytics Row ────────────────────────────────────────── */}
            <div>
                <div className="flex items-center gap-2.5 mb-5">
                    <BarChart3 className="h-4 w-4 text-slate-400" />
                    <h2 className="text-sm font-black uppercase tracking-wider text-slate-500">Performance Analytics</h2>
                </div>
                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                    <ProjectStatusChart projects={projects} />
                    <FinancialHealthChart finance={financeSummary} />
                    <HrSupervisionChart
                        hrData={hrData}
                        engineers={engineers}
                        reportsCount={supervisionSummary?.reportsCount || 0}
                    />
                </div>
            </div>
        </div>
    )
}
