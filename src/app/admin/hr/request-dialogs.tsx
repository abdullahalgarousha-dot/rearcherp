"use client"

import { useState, useTransition } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    CalendarDays, Clock, CreditCard, FileText,
    CheckCircle2, AlertCircle, X, Loader2
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
    submitLeaveRequest,
    submitPermissionRequest,
    submitAdvanceRequest,
    submitDocumentRequest,
} from "./hr-request-actions"

type DialogType = 'leave' | 'permission' | 'advance' | 'document' | null

// ── Action buttons config ─────────────────────────────────────────────────────
const ACTIONS = [
    {
        key: 'leave' as DialogType,
        label: 'Request Leave',
        sublabel: 'طلب إجازة (سنوية، مرضية، طارئة)',
        icon: CalendarDays,
        accent: 'bg-indigo-600 hover:bg-indigo-700 text-white',
        iconBg: 'bg-white/20',
    },
    {
        key: 'permission' as DialogType,
        label: 'Request Permission',
        sublabel: 'طلب استئذان قصير',
        icon: Clock,
        accent: 'bg-amber-500 hover:bg-amber-600 text-white',
        iconBg: 'bg-white/20',
    },
    {
        key: 'advance' as DialogType,
        label: 'Request Advance',
        sublabel: 'طلب سلفة مالية',
        icon: CreditCard,
        accent: 'bg-violet-600 hover:bg-violet-700 text-white',
        iconBg: 'bg-white/20',
    },
    {
        key: 'document' as DialogType,
        label: 'Request Document',
        sublabel: 'طلب خطاب أو مستند رسمي',
        icon: FileText,
        accent: 'bg-emerald-600 hover:bg-emerald-700 text-white',
        iconBg: 'bg-white/20',
    },
]

// ── Main export ───────────────────────────────────────────────────────────────
export function RequestActionCenter() {
    const [open, setOpen] = useState<DialogType>(null)

    return (
        <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {ACTIONS.map((a) => {
                    const Icon = a.icon
                    return (
                        <button
                            key={a.key}
                            onClick={() => setOpen(a.key)}
                            className={cn(
                                "flex flex-col items-start gap-3 rounded-2xl p-5 text-left transition-all hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] shadow-sm",
                                a.accent
                            )}
                        >
                            <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center", a.iconBg)}>
                                <Icon className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="font-black text-sm leading-tight tracking-tight">{a.label}</p>
                                <p className="text-xs font-medium opacity-70 mt-1 leading-snug" dir="rtl">{a.sublabel}</p>
                            </div>
                        </button>
                    )
                })}
            </div>

            <LeaveDialog open={open === 'leave'} onClose={() => setOpen(null)} />
            <PermissionDialog open={open === 'permission'} onClose={() => setOpen(null)} />
            <AdvanceDialog open={open === 'advance'} onClose={() => setOpen(null)} />
            <DocumentDialog open={open === 'document'} onClose={() => setOpen(null)} />
        </>
    )
}

// ── Shared dialog wrapper ─────────────────────────────────────────────────────
function RequestDialog({
    open, onClose, title, icon: Icon, iconColor, children, onSubmit, isPending, result
}: {
    open: boolean
    onClose: () => void
    title: string
    icon: any
    iconColor: string
    children: React.ReactNode
    onSubmit: () => void
    isPending: boolean
    result: { success?: boolean, error?: string } | null
}) {
    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-[460px] rounded-2xl p-0 overflow-hidden border-0 shadow-2xl">
                <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-50">
                    <div className="flex items-center gap-3">
                        <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", iconColor)}>
                            <Icon className="h-5 w-5 text-white" />
                        </div>
                        <DialogTitle className="text-base font-black text-slate-900">{title}</DialogTitle>
                    </div>
                </DialogHeader>

                <div className="px-6 py-5 space-y-4">
                    {children}

                    {result?.error && (
                        <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                            <p className="text-xs font-bold text-red-700">{result.error}</p>
                        </div>
                    )}
                    {result?.success && (
                        <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                            <p className="text-xs font-bold text-emerald-700">Request submitted successfully!</p>
                        </div>
                    )}
                </div>

                <DialogFooter className="px-6 pb-6 pt-0 flex gap-2">
                    <Button variant="ghost" onClick={onClose} disabled={isPending} className="rounded-xl font-black text-xs uppercase">
                        {result?.success ? 'Close' : 'Cancel'}
                    </Button>
                    {!result?.success && (
                        <Button
                            onClick={onSubmit}
                            disabled={isPending}
                            className="flex-1 rounded-xl bg-slate-900 hover:bg-slate-800 font-black text-xs uppercase gap-2 shadow-sm"
                        >
                            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                            {isPending ? 'Submitting…' : 'Submit Request'}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// ── Leave Dialog ──────────────────────────────────────────────────────────────
function LeaveDialog({ open, onClose }: { open: boolean, onClose: () => void }) {
    const [isPending, start] = useTransition()
    const [result, setResult] = useState<any>(null)
    const [leaveType, setLeaveType] = useState('')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [reason, setReason] = useState('')

    const reset = () => { setResult(null); setLeaveType(''); setStartDate(''); setEndDate(''); setReason('') }
    const handleClose = () => { reset(); onClose() }

    const submit = () => {
        if (!leaveType || !startDate || !endDate) {
            setResult({ error: 'Please fill in all required fields.' }); return
        }
        if (new Date(endDate) < new Date(startDate)) {
            setResult({ error: 'End date must be after start date.' }); return
        }
        start(async () => {
            const res = await submitLeaveRequest({ leaveType, startDate, endDate, reason })
            setResult(res)
        })
    }

    return (
        <RequestDialog open={open} onClose={handleClose} title="Request Leave"
            icon={CalendarDays} iconColor="bg-indigo-600"
            onSubmit={submit} isPending={isPending} result={result}
        >
            <FormRow label="Leave Type *">
                <Select value={leaveType} onValueChange={setLeaveType}>
                    <SelectTrigger className="rounded-xl h-11 font-medium border-slate-200">
                        <SelectValue placeholder="Select type…" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ANNUAL">Annual Leave — إجازة سنوية</SelectItem>
                        <SelectItem value="SICK">Sick Leave — إجازة مرضية</SelectItem>
                        <SelectItem value="EMERGENCY">Emergency Leave — إجازة طارئة</SelectItem>
                        <SelectItem value="UNPAID">Unpaid Leave — إجازة بدون راتب</SelectItem>
                    </SelectContent>
                </Select>
            </FormRow>
            <div className="grid grid-cols-2 gap-3">
                <FormRow label="Start Date *">
                    <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="rounded-xl h-11 border-slate-200 font-medium" />
                </FormRow>
                <FormRow label="End Date *">
                    <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="rounded-xl h-11 border-slate-200 font-medium" />
                </FormRow>
            </div>
            <FormRow label="Reason">
                <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Optional reason…" className="rounded-xl border-slate-200 font-medium resize-none" rows={2} />
            </FormRow>
            {leaveType === 'SICK' && (
                <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 font-bold">
                    Sick leave requires a medical attachment — you'll be asked to upload one after submission.
                </p>
            )}
        </RequestDialog>
    )
}

// ── Permission Dialog ─────────────────────────────────────────────────────────
function PermissionDialog({ open, onClose }: { open: boolean, onClose: () => void }) {
    const [isPending, start] = useTransition()
    const [result, setResult] = useState<any>(null)
    const [date, setDate] = useState('')
    const [hours, setHours] = useState('')
    const [reason, setReason] = useState('')

    const reset = () => { setResult(null); setDate(''); setHours(''); setReason('') }
    const handleClose = () => { reset(); onClose() }

    const submit = () => {
        if (!date || !hours) { setResult({ error: 'Please fill in all required fields.' }); return }
        const h = parseFloat(hours)
        if (isNaN(h) || h <= 0 || h > 8) { setResult({ error: 'Hours must be between 0.5 and 8.' }); return }
        start(async () => {
            const res = await submitPermissionRequest({ date, hours: h, reason })
            setResult(res)
        })
    }

    return (
        <RequestDialog open={open} onClose={handleClose} title="Request Short Leave (أذن)"
            icon={Clock} iconColor="bg-amber-500"
            onSubmit={submit} isPending={isPending} result={result}
        >
            <FormRow label="Date *">
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="rounded-xl h-11 border-slate-200 font-medium" />
            </FormRow>
            <FormRow label="Duration (hours) *">
                <Select value={hours} onValueChange={setHours}>
                    <SelectTrigger className="rounded-xl h-11 font-medium border-slate-200">
                        <SelectValue placeholder="Select duration…" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="0.5">30 minutes</SelectItem>
                        <SelectItem value="1">1 hour</SelectItem>
                        <SelectItem value="1.5">1.5 hours</SelectItem>
                        <SelectItem value="2">2 hours</SelectItem>
                        <SelectItem value="3">3 hours</SelectItem>
                        <SelectItem value="4">Half day (4 hours)</SelectItem>
                    </SelectContent>
                </Select>
            </FormRow>
            <FormRow label="Reason">
                <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason for short leave…" className="rounded-xl border-slate-200 font-medium resize-none" rows={2} />
            </FormRow>
        </RequestDialog>
    )
}

// ── Advance / Loan Dialog ─────────────────────────────────────────────────────
function AdvanceDialog({ open, onClose }: { open: boolean, onClose: () => void }) {
    const [isPending, start] = useTransition()
    const [result, setResult] = useState<any>(null)
    const [amount, setAmount] = useState('')
    const [installments, setInstallments] = useState('')
    const [reason, setReason] = useState('')

    const reset = () => { setResult(null); setAmount(''); setInstallments(''); setReason('') }
    const handleClose = () => { reset(); onClose() }

    const parsedAmount = parseFloat(amount) || 0
    const parsedInstallments = parseInt(installments) || 0
    const monthly = parsedInstallments > 0 ? parsedAmount / parsedInstallments : 0

    const submit = () => {
        if (!amount || !installments) { setResult({ error: 'Please fill in all required fields.' }); return }
        if (parsedAmount <= 0) { setResult({ error: 'Amount must be greater than 0.' }); return }
        if (parsedInstallments <= 0) { setResult({ error: 'Installments must be at least 1.' }); return }
        start(async () => {
            const res = await submitAdvanceRequest({ amount: parsedAmount, installments: parsedInstallments, reason })
            setResult(res)
        })
    }

    return (
        <RequestDialog open={open} onClose={handleClose} title="Request Advance / Loan (سلفة)"
            icon={CreditCard} iconColor="bg-violet-600"
            onSubmit={submit} isPending={isPending} result={result}
        >
            <FormRow label="Amount (SAR) *">
                <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 5000" className="rounded-xl h-11 border-slate-200 font-medium" min={1} />
            </FormRow>
            <FormRow label="Repayment Period (months) *">
                <Select value={installments} onValueChange={setInstallments}>
                    <SelectTrigger className="rounded-xl h-11 font-medium border-slate-200">
                        <SelectValue placeholder="Select…" />
                    </SelectTrigger>
                    <SelectContent>
                        {[1, 2, 3, 4, 6, 8, 10, 12].map(n => (
                            <SelectItem key={n} value={String(n)}>{n} month{n > 1 ? 's' : ''}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </FormRow>
            {monthly > 0 && (
                <div className="bg-violet-50 border border-violet-100 rounded-xl px-4 py-3 flex items-center justify-between">
                    <p className="text-xs font-bold text-violet-700">Monthly Deduction</p>
                    <p className="text-sm font-black text-violet-900">SAR {monthly.toFixed(2)}</p>
                </div>
            )}
            <FormRow label="Reason">
                <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason for advance…" className="rounded-xl border-slate-200 font-medium resize-none" rows={2} />
            </FormRow>
        </RequestDialog>
    )
}

// ── Document Dialog ───────────────────────────────────────────────────────────
function DocumentDialog({ open, onClose }: { open: boolean, onClose: () => void }) {
    const [isPending, start] = useTransition()
    const [result, setResult] = useState<any>(null)
    const [docType, setDocType] = useState('')
    const [description, setDescription] = useState('')

    const reset = () => { setResult(null); setDocType(''); setDescription('') }
    const handleClose = () => { reset(); onClose() }

    const submit = () => {
        if (!docType) { setResult({ error: 'Please select a document type.' }); return }
        start(async () => {
            const res = await submitDocumentRequest({ documentType: docType, description })
            setResult(res)
        })
    }

    return (
        <RequestDialog open={open} onClose={handleClose} title="Request Official Document"
            icon={FileText} iconColor="bg-emerald-600"
            onSubmit={submit} isPending={isPending} result={result}
        >
            <FormRow label="Document Type *">
                <Select value={docType} onValueChange={setDocType}>
                    <SelectTrigger className="rounded-xl h-11 font-medium border-slate-200">
                        <SelectValue placeholder="Select document…" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="SALARY_CERTIFICATE">Salary Certificate — شهادة راتب</SelectItem>
                        <SelectItem value="EMPLOYMENT_LETTER">Employment Letter — خطاب عمل</SelectItem>
                        <SelectItem value="EXPERIENCE_LETTER">Experience Letter — خطاب خبرة</SelectItem>
                        <SelectItem value="EXIT_REENTRY_VISA">Exit/Re-Entry Visa — تأشيرة خروج وعودة</SelectItem>
                        <SelectItem value="NOC_LETTER">No Objection Letter — خطاب عدم ممانعة</SelectItem>
                        <SelectItem value="OTHER">Other — أخرى</SelectItem>
                    </SelectContent>
                </Select>
            </FormRow>
            <FormRow label="Additional Notes">
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Any specific details or instructions…" className="rounded-xl border-slate-200 font-medium resize-none" rows={3} />
            </FormRow>
            <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 font-medium">
                Documents are typically processed within 2–3 business days. You'll be notified when ready.
            </p>
        </RequestDialog>
    )
}

// ── Shared helpers ────────────────────────────────────────────────────────────
function FormRow({ label, children }: { label: string, children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400">{label}</Label>
            {children}
        </div>
    )
}
