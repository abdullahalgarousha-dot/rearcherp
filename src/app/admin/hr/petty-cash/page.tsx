import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { getAllPettyCashRequests, approvePettyCashRequest, rejectPettyCashRequest } from "./actions"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Wallet, CheckCircle2, XCircle, Clock, ShieldCheck,
    FileCheck, Archive, ExternalLink, AlertCircle
} from "lucide-react"
import { format } from "date-fns"
import { BackButton } from "@/components/ui/back-button"
import { PettyCashRequestDialog } from "@/components/hr/petty-cash-request-dialog"
import { CustodySettlementDialog } from "@/components/hr/custody-settlement-dialog"
import { CustodyCloseDialog } from "@/components/hr/custody-close-dialog"
import Link from "next/link"
import { revalidatePath } from "next/cache"

// Status config for the new workflow
const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
    REQUESTED: { label: "Pending Approval", color: "bg-amber-100 text-amber-700 border-amber-200", dot: "bg-amber-400" },
    APPROVED: { label: "Disbursed — Awaiting Settlement", color: "bg-blue-100 text-blue-700 border-blue-200", dot: "bg-blue-400" },
    PENDING_REVIEW: { label: "Pending Accountant Review", color: "bg-violet-100 text-violet-700 border-violet-200", dot: "bg-violet-400" },
    CLOSED: { label: "Closed & Cleared", color: "bg-emerald-100 text-emerald-700 border-emerald-200", dot: "bg-emerald-400" },
    REJECTED: { label: "Rejected", color: "bg-red-100 text-red-700 border-red-200", dot: "bg-red-400" },
}

const FINANCE_ROLES = ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'GLOBAL_SUPER_ADMIN']

export default async function PettyCashPage() {
    const session = await auth()
    if (!session) redirect('/login')

    const user = session?.user as any
    const isFinance = FINANCE_ROLES.includes(user?.role)
    const currentUserId = user?.id
    const tenantId = user?.tenantId
    const isGlobalAdmin = user?.role === 'GLOBAL_SUPER_ADMIN'

    // Finance sees all; employees see own
    const result = isFinance ? await getAllPettyCashRequests() : { requests: [] }
    const allRequests = (result as any).requests || []

    // For the employee panel: their custodies needing action
    const myApproved = allRequests.filter((r: any) => r.userId === currentUserId && r.status === 'APPROVED')

    // KPI counters
    const pending = allRequests.filter((r: any) => r.status === 'REQUESTED').length
    const awaitingReview = allRequests.filter((r: any) => r.status === 'PENDING_REVIEW').length
    const closed = allRequests.filter((r: any) => r.status === 'CLOSED').length
    const totalDisbursed = allRequests
        .filter((r: any) => ['APPROVED', 'PENDING_REVIEW', 'CLOSED'].includes(r.status))
        .reduce((s: number, r: any) => s + r.amount, 0)

    const projects = await (db as any).project.findMany({
        where: isGlobalAdmin ? {} : { tenantId },
        select: { id: true, name: true },
        orderBy: { name: 'asc' }
    })

    return (
        <div className="space-y-8 pb-20">
            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className="flex justify-between items-start flex-wrap gap-4">
                <div className="flex items-center gap-3">
                    <BackButton />
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
                            Petty Cash | العهد
                            <Badge className="bg-primary/10 text-primary border-primary/20 font-black text-xs">
                                Manual Audit Workflow
                            </Badge>
                        </h1>
                        <p className="text-slate-500 text-sm mt-1">
                            Custody → Settlement → Archive → Manual Expense Entry
                        </p>
                    </div>
                </div>
                <PettyCashRequestDialog projects={projects} />
            </div>

            {/* ── Workflow Explainer ───────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { step: '1', label: 'Request', desc: 'Employee requests custody', icon: Wallet, color: 'amber' },
                    { step: '2', label: 'Disburse', desc: 'Accountant approves & pays', icon: CheckCircle2, color: 'blue' },
                    { step: '3', label: 'Settle', desc: 'Employee uploads invoices', icon: FileCheck, color: 'violet' },
                    { step: '4', label: 'Close', desc: 'Accountant audits & clears', icon: ShieldCheck, color: 'emerald' },
                ].map(({ step, label, desc, icon: Icon, color }) => (
                    <div key={step} className={`rounded-2xl border p-4 bg-${color}-50 border-${color}-100`}>
                        <div className="flex items-center gap-2 mb-2">
                            <span className={`text-[10px] font-black text-${color}-600 bg-${color}-100 rounded-full w-5 h-5 flex items-center justify-center`}>
                                {step}
                            </span>
                            <Icon className={`h-3.5 w-3.5 text-${color}-600`} />
                        </div>
                        <p className={`text-sm font-black text-${color}-800`}>{label}</p>
                        <p className={`text-[10px] text-${color}-600 mt-0.5`}>{desc}</p>
                    </div>
                ))}
            </div>

            {/* ── KPI Strip ───────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: "Awaiting Approval", val: pending, color: "text-amber-700", bg: "bg-amber-50" },
                    { label: "Pending Review", val: awaitingReview, color: "text-violet-700", bg: "bg-violet-50" },
                    { label: "Closed This Year", val: closed, color: "text-emerald-700", bg: "bg-emerald-50" },
                    { label: "Total Disbursed", val: `SAR ${totalDisbursed.toLocaleString()}`, color: "text-slate-900", bg: "bg-slate-100" },
                ].map(({ label, val, color, bg }) => (
                    <Card key={label} className="border-none shadow-sm">
                        <CardContent className={`p-4 ${bg} rounded-xl`}>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
                            <p className={`text-2xl font-black ${color}`}>{val}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* ── Finance view: All requests ───────────────────────────────── */}
            {isFinance && (
                <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-5 bg-[#1e293b]">
                        <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center">
                                <Wallet className="h-4 w-4 text-white" />
                            </div>
                            <div>
                                <h2 className="text-sm font-black text-white uppercase tracking-wider">
                                    Custody Register
                                </h2>
                                <p className="text-[10px] text-white/40 mt-0.5">{allRequests.length} total records</p>
                            </div>
                        </div>
                        <Link href="/admin/finance?tab=expenses">
                            <Button variant="outline" size="sm"
                                className="h-8 text-xs rounded-xl border-white/20 bg-white/10 text-white hover:bg-white/20 font-bold gap-1">
                                <Archive className="h-3 w-3" /> Post to Finance
                            </Button>
                        </Link>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    {["Employee", "Project", "Reason", "Amount", "Date", "Status", "Invoices", "Actions"].map(h => (
                                        <th key={h} className="px-4 py-3.5 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {allRequests.map((req: any) => {
                                    const cfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.REQUESTED
                                    return (
                                        <tr key={req.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-4 py-4 font-bold text-slate-900">{req.user?.name}</td>
                                            <td className="px-4 py-4 text-slate-600 max-w-[140px] truncate">{req.project?.name}</td>
                                            <td className="px-4 py-4 text-slate-500 max-w-[180px] truncate">{req.reason}</td>
                                            <td className="px-4 py-4 font-black text-slate-900 whitespace-nowrap">
                                                SAR {req.amount.toLocaleString()}
                                            </td>
                                            <td className="px-4 py-4 text-slate-500 whitespace-nowrap">
                                                {format(new Date(req.createdAt), 'dd/MM/yyyy')}
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className={`inline-flex items-center gap-1.5 border text-[10px] font-black px-2.5 py-1 rounded-full ${cfg.color}`}>
                                                    <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                                                    {cfg.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                {req.settlementItems?.length > 0 ? (
                                                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                                                        {req.settlementItems.length} invoice(s)
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-300 text-xs">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-2">
                                                    {req.status === 'REQUESTED' && (
                                                        <>
                                                            <form action={async () => {
                                                                'use server'
                                                                await approvePettyCashRequest(req.id)
                                                                revalidatePath('/admin/hr/petty-cash')
                                                            }}>
                                                                <Button type="submit" size="sm"
                                                                    className="h-7 text-xs bg-emerald-500 hover:bg-emerald-600 rounded-lg gap-1">
                                                                    <CheckCircle2 className="h-3 w-3" /> Approve
                                                                </Button>
                                                            </form>
                                                            <form action={async () => {
                                                                'use server'
                                                                await rejectPettyCashRequest(req.id)
                                                                revalidatePath('/admin/hr/petty-cash')
                                                            }}>
                                                                <Button type="submit" size="sm" variant="outline"
                                                                    className="h-7 text-xs border-red-200 text-red-600 hover:bg-red-50 rounded-lg gap-1">
                                                                    <XCircle className="h-3 w-3" /> Reject
                                                                </Button>
                                                            </form>
                                                        </>
                                                    )}
                                                    {req.status === 'PENDING_REVIEW' && (
                                                        <CustodyCloseDialog
                                                            requestId={req.id}
                                                            employeeName={req.user?.name}
                                                            custodyAmount={req.amount}
                                                            projectName={req.project?.name || '—'}
                                                            settlementItems={req.settlementItems || []}
                                                        />
                                                    )}
                                                    {req.status === 'CLOSED' && (
                                                        <Link href={`/admin/hr/petty-cash/${req.id}/clearance`}>
                                                            <Button size="sm" variant="outline"
                                                                className="h-7 text-xs rounded-lg gap-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                                                                <ExternalLink className="h-3 w-3" /> Certificate
                                                            </Button>
                                                        </Link>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                                {allRequests.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="text-center py-12 text-slate-400">
                                            No custody records found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── Employee: My custodies awaiting settlement ───────────────── */}
            {myApproved.length > 0 && (
                <div className="rounded-2xl bg-blue-50 border border-blue-200 p-6 space-y-4">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-blue-600" />
                        <h3 className="font-black text-blue-900">
                            You have {myApproved.length} custody(ies) awaiting settlement
                        </h3>
                    </div>
                    <p className="text-sm text-blue-700">
                        Upload your invoices to settle your custody and clear your name from the records.
                    </p>
                    <div className="space-y-3">
                        {myApproved.map((req: any) => (
                            <div key={req.id}
                                className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-blue-100 shadow-sm">
                                <div>
                                    <p className="font-bold text-slate-900">{req.project?.name}</p>
                                    <p className="text-xs text-slate-500">{req.reason}</p>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        Approved {format(new Date(req.updatedAt), 'dd MMM yyyy')}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <p className="font-black text-blue-700">SAR {req.amount.toLocaleString()}</p>
                                    <CustodySettlementDialog
                                        requestId={req.id}
                                        custodyAmount={req.amount}
                                        projectName={req.project?.name || '—'}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Archive notice for accountants ──────────────────────────── */}
            {isFinance && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex gap-4">
                    <Archive className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <h4 className="font-black text-amber-900 mb-1">Manual Expense Entry Required</h4>
                        <p className="text-sm text-amber-800 leading-relaxed">
                            Closing a custody <strong>does not</strong> automatically create expense records.
                            After reviewing the archived invoices, go to{" "}
                            <Link href="/admin/finance?tab=expenses" className="underline font-bold hover:text-amber-900">
                                Finance Hub → Expenses
                            </Link>{" "}
                            and manually create the formal expense entries with correct VAT, vendor details, and tax categories.
                        </p>
                    </div>
                </div>
            )}
        </div>
    )
}
