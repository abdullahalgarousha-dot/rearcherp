"use client"

import { useState, useTransition } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
    CalendarDays, Clock, CreditCard, FileText,
    CheckCircle2, XCircle, ChevronDown, Loader2,
    Users, AlertTriangle
} from "lucide-react"
import { cn } from "@/lib/utils"
import { approveInboxRequest, rejectInboxRequest } from "./hr-request-actions"

const TYPE_CONFIG: Record<string, { label: string, icon: any, bg: string, color: string }> = {
    LEAVE:      { label: 'Leave',      icon: CalendarDays, bg: 'bg-indigo-100', color: 'text-indigo-600' },
    PERMISSION: { label: 'Permission', icon: Clock,        bg: 'bg-amber-100',  color: 'text-amber-600'  },
    LOAN:       { label: 'Loan',       icon: CreditCard,   bg: 'bg-violet-100', color: 'text-violet-600' },
    DOCUMENT:   { label: 'Document',   icon: FileText,     bg: 'bg-emerald-100',color: 'text-emerald-600'},
}

function itemTitle(item: any): string {
    if (item._type === 'LEAVE')
        return `${item.type} Leave · ${fmtDate(item.startDate)} – ${fmtDate(item.endDate)}`
    if (item._type === 'PERMISSION')
        return `${item.hours}h Short Leave on ${fmtDate(item.date)}`
    if (item._type === 'LOAN')
        return `Advance SAR ${item.amount?.toLocaleString()} / ${item.installments} months`
    if (item._type === 'DOCUMENT')
        return item.type?.replace(/_/g, ' ') || 'Document Request'
    return 'Request'
}

function fmtDate(d: any) {
    return d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'
}

function employeeName(item: any): string {
    return item.user?.name || item.profile?.user?.name || '—'
}

// ── Main component ────────────────────────────────────────────────────────────
export function HRInboxClient({ data }: { data: any }) {
    const {
        totalPending, stats,
        inboxLeaves, inboxPermissions, inboxLoans, inboxDocs,
        approvedLeaves, rejectedLeaves
    } = data

    const [filter, setFilter] = useState<'all' | 'LEAVE' | 'PERMISSION' | 'LOAN' | 'DOCUMENT'>('all')

    const allItems = [
        ...inboxLeaves.map((r: any) => ({ ...r, _type: 'LEAVE' })),
        ...inboxPermissions.map((r: any) => ({ ...r, _type: 'PERMISSION' })),
        ...inboxLoans.map((r: any) => ({ ...r, _type: 'LOAN' })),
        ...inboxDocs.map((r: any) => ({ ...r, _type: 'DOCUMENT' })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    const visible = filter === 'all' ? allItems : allItems.filter(i => i._type === filter)

    return (
        <div className="space-y-6">
            {/* Stats row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatChip label="Total Pending" value={totalPending} accent="bg-slate-900 text-white" />
                <StatChip label="Leaves Pending" value={stats.leaves} accent="bg-indigo-600 text-white" />
                <StatChip label="Loans Pending" value={stats.loans} accent="bg-violet-600 text-white" />
                <StatChip label="Docs & Perms" value={stats.docsAndPerms} accent="bg-amber-500 text-white" />
            </div>

            {/* Filter bar */}
            <div className="flex items-center gap-2 flex-wrap">
                {(['all', 'LEAVE', 'PERMISSION', 'LOAN', 'DOCUMENT'] as const).map(f => {
                    const cfg = f === 'all' ? null : TYPE_CONFIG[f]
                    const count = f === 'all' ? allItems.length
                        : allItems.filter(i => i._type === f).length
                    return (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                                filter === f
                                    ? "bg-slate-900 text-white shadow-sm"
                                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                            )}
                        >
                            {cfg && <cfg.icon className="h-3 w-3" />}
                            {f === 'all' ? 'All' : cfg!.label}
                            <span className={cn(
                                "ml-1 rounded-full px-1.5 py-0 text-[10px] font-black",
                                filter === f ? "bg-white/20" : "bg-slate-200 text-slate-600"
                            )}>{count}</span>
                        </button>
                    )
                })}
            </div>

            {/* Items list */}
            {visible.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-emerald-300" />
                    <p className="font-black text-slate-600 text-lg">Inbox Clear</p>
                    <p className="text-sm text-slate-400 font-medium mt-1">No pending requests in this category.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {visible.map(item => (
                        <InboxRow key={`${item._type}-${item.id}`} item={item} />
                    ))}
                </div>
            )}

            {/* Historical stats footer */}
            <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    <div>
                        <p className="text-[10px] font-black uppercase text-emerald-600">Approved Leaves</p>
                        <p className="text-2xl font-black text-emerald-700">{approvedLeaves}</p>
                    </div>
                </div>
                <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center gap-3">
                    <XCircle className="h-5 w-5 text-red-400" />
                    <div>
                        <p className="text-[10px] font-black uppercase text-red-600">Rejected Leaves</p>
                        <p className="text-2xl font-black text-red-700">{rejectedLeaves}</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ── Single inbox row with inline approve/reject ───────────────────────────────
function InboxRow({ item }: { item: any }) {
    const [isPending, start] = useTransition()
    const [done, setDone] = useState<'approved' | 'rejected' | null>(null)
    const [showReject, setShowReject] = useState(false)
    const [reason, setReason] = useState('')
    const [err, setErr] = useState<string | null>(null)

    const cfg = TYPE_CONFIG[item._type]
    const Icon = cfg.icon

    const handleApprove = () => {
        start(async () => {
            const res = await approveInboxRequest(item._type, item.id)
            if (res.error) { setErr(res.error); return }
            setDone('approved')
        })
    }

    const handleReject = () => {
        if (!reason.trim()) { setErr('Please provide a rejection reason.'); return }
        start(async () => {
            const res = await rejectInboxRequest(item._type, item.id, reason)
            if (res.error) { setErr(res.error); return }
            setDone('rejected')
        })
    }

    if (done === 'approved') {
        return (
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-5 py-3 flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                <p className="text-sm font-bold text-emerald-700">
                    <span className="font-black">{employeeName(item)}</span> — {itemTitle(item)} · Approved
                </p>
            </div>
        )
    }
    if (done === 'rejected') {
        return (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 flex items-center gap-3 opacity-60">
                <XCircle className="h-4 w-4 text-slate-400 flex-shrink-0" />
                <p className="text-sm font-bold text-slate-500 line-through">
                    {employeeName(item)} — {itemTitle(item)}
                </p>
                <Badge className="bg-red-100 text-red-600 border-none text-[9px] font-black uppercase rounded-md ml-auto">Rejected</Badge>
            </div>
        )
    }

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex items-center gap-4 px-5 py-4">
                {/* Type icon */}
                <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0", cfg.bg)}>
                    <Icon className={cn("h-5 w-5", cfg.color)} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-black text-slate-900">{employeeName(item)}</p>
                        <Badge className={cn("border-none font-black text-[9px] uppercase rounded-md", cfg.bg, cfg.color)}>
                            {cfg.label}
                        </Badge>
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">{itemTitle(item)}</p>
                    {(item.reason || item.details) && (
                        <p className="text-[10px] text-slate-400 italic mt-0.5">"{item.reason || item.details}"</p>
                    )}
                    <p className="text-[10px] text-slate-300 font-medium mt-0.5">
                        Submitted {new Date(item.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                </div>

                {/* Action buttons */}
                {!showReject ? (
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                            size="sm"
                            disabled={isPending}
                            onClick={handleApprove}
                            className="h-8 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase gap-1.5 shadow-sm"
                        >
                            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                            Approve
                        </Button>
                        <Button
                            size="sm"
                            disabled={isPending}
                            onClick={() => setShowReject(true)}
                            className="h-8 px-4 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-black text-xs uppercase border border-red-100"
                        >
                            <XCircle className="h-3.5 w-3.5 mr-1" />
                            Reject
                        </Button>
                    </div>
                ) : null}
            </div>

            {/* Reject reason inline */}
            {showReject && (
                <div className="px-5 pb-4 pt-0 border-t border-red-50 bg-red-50/30">
                    <p className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-2 mt-3">Rejection Reason</p>
                    <Textarea
                        value={reason}
                        onChange={e => { setReason(e.target.value); setErr(null) }}
                        placeholder="Provide a reason for rejection…"
                        className="rounded-xl border-red-100 font-medium text-sm resize-none mb-2 bg-white"
                        rows={2}
                        autoFocus
                    />
                    {err && <p className="text-xs text-red-600 font-bold mb-2">{err}</p>}
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            disabled={isPending}
                            onClick={handleReject}
                            className="h-8 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase gap-1.5"
                        >
                            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                            Confirm Reject
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => { setShowReject(false); setReason(''); setErr(null) }}
                            className="h-8 px-4 rounded-xl font-black text-xs uppercase text-slate-500"
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}

function StatChip({ label, value, accent }: { label: string, value: number, accent: string }) {
    return (
        <div className={cn("rounded-2xl p-5 shadow-sm", accent)}>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">{label}</p>
            <p className="text-4xl font-black">{value}</p>
        </div>
    )
}
