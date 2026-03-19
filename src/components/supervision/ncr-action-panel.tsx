"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { updateNCRStatus, resubmitNCR } from "@/app/admin/supervision/actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { CheckCircle2, XCircle, RefreshCw } from "lucide-react"

interface NCRActionPanelProps {
    ncr: any
    userRole: string
    currentRev: number
}

export function NCRActionPanel({ ncr, userRole, currentRev }: NCRActionPanelProps) {
    const [loading, setLoading] = useState(false)
    const [action, setAction] = useState<'NONE' | 'APPROVE' | 'REJECT' | 'RESUBMIT'>('NONE')
    const router = useRouter()

    const canApprove = ['ADMIN', 'PM'].includes(userRole) && (ncr.status === 'PENDING' || ncr.status === 'OPEN')
    const canResubmit = ['ADMIN', 'PM', 'SITE_ENGINEER'].includes(userRole) && (ncr.status === 'REJECTED' || ncr.status === 'REVISE_RESUBMIT')

    async function handleStatusUpdate(newStatus: string, formData: FormData) {
        setLoading(true)
        formData.append("status", newStatus)

        const res = await updateNCRStatus(ncr.id, formData)
        setLoading(false)

        if (res.success) {
            toast.success(`NCR ${newStatus === 'CLOSED' ? 'Closed' : 'Rejected'} Successfully`)
            setAction('NONE')
            router.refresh()
        } else {
            toast.error(res.error)
        }
    }

    async function handleResubmit(formData: FormData) {
        setLoading(true)
        const res = await resubmitNCR(ncr.id, formData)
        setLoading(false)

        if (res.success) {
            toast.success("NCR Resubmitted Successfully")
            setAction('NONE')
            router.refresh()
        } else {
            toast.error(res.error)
        }
    }

    if (!canApprove && !canResubmit) return null

    return (
        <div className="bg-white border-t border-slate-200 p-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
            {/* Initial Buttons */}
            {action === 'NONE' && (
                <div className="flex gap-4 justify-end">
                    {canApprove && (
                        <>
                            <Button
                                variant="destructive"
                                onClick={() => setAction('REJECT')}
                                className="bg-red-50 text-red-600 hover:bg-red-100 border-red-200 border"
                            >
                                <XCircle className="w-4 h-4 mr-2" />
                                رفض (Reject)
                            </Button>
                            <Button
                                onClick={() => setAction('APPROVE')}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                إغلاق / اعتماد (Close / Approve)
                            </Button>
                        </>
                    )}
                    {canResubmit && (
                        <Button
                            onClick={() => setAction('RESUBMIT')}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            إعادة تقديم (Resubmit Rev {currentRev + 1})
                        </Button>
                    )}
                </div>
            )}

            {/* Approval Form */}
            {action === 'APPROVE' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-emerald-800 flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5" />
                            إغلاق التقرير (Close NCR)
                        </h3>
                        <Button variant="ghost" size="sm" onClick={() => setAction('NONE')}>Cancel</Button>
                    </div>

                    <form action={(fd) => handleStatusUpdate('CLOSED', fd)} className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-600">إرفاق تقرير الإغلاق (Closure Report) *</Label>
                                <div className="border-2 border-dashed border-emerald-200 bg-emerald-50/50 rounded-xl p-6 text-center hover:bg-emerald-50 transition-colors">
                                    <Input
                                        type="file"
                                        name="consultantDoc"
                                        required
                                        accept=".pdf,.png,.jpg"
                                        className="cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-100 file:text-emerald-700 hover:file:bg-emerald-200"
                                    />
                                    <p className="text-xs text-slate-400 mt-2">PDF, PNG or JPG (Max 5MB)</p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-600">ملاحظات الإغلاق (Closure Notes)</Label>
                                <Textarea name="comments" placeholder="أي ملاحظات إضافية..." className="h-[100px] bg-slate-50" />
                            </div>
                        </div>
                        <div className="flex justify-end pt-2">
                            <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8">
                                {loading ? "جاري المعالجة..." : "تأكيد الإغلاق (Confirm Close)"}
                            </Button>
                        </div>
                    </form>
                </div>
            )}

            {/* Rejection Form */}
            {action === 'REJECT' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-red-800 flex items-center gap-2">
                            <XCircle className="w-5 h-5" />
                            رفض (Rejection)
                        </h3>
                        <Button variant="ghost" size="sm" onClick={() => setAction('NONE')}>Cancel</Button>
                    </div>

                    <form action={(fd) => handleStatusUpdate('REJECTED', fd)} className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-600">سبب الرفض (Rejection Reason) *</Label>
                            <Textarea name="comments" required placeholder="سبب الرفض..." className="min-h-[100px] bg-red-50 border-red-100 focus:border-red-300" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-600">إرفاق ملف (اختياري)</Label>
                            <Input type="file" name="consultantDoc" accept=".pdf,.png,.jpg" className="bg-slate-50" />
                        </div>
                        <div className="flex justify-end pt-2">
                            <Button type="submit" disabled={loading} variant="destructive" className="font-bold px-8">
                                {loading ? "جاري المعالجة..." : "تأكيد الرفض (Confirm Rejection)"}
                            </Button>
                        </div>
                    </form>
                </div>
            )}

            {/* Resubmit Form */}
            {action === 'RESUBMIT' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-blue-800 flex items-center gap-2">
                            <RefreshCw className="w-5 h-5" />
                            تقديم نسخة جديدة (Resubmit Rev {currentRev + 1})
                        </h3>
                        <Button variant="ghost" size="sm" onClick={() => setAction('NONE')}>Cancel</Button>
                    </div>

                    <form action={handleResubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-600">إرفاق التقرير المصحح (Corrected NCR) *</Label>
                            <div className="border-2 border-dashed border-blue-200 bg-blue-50/50 rounded-xl p-6 text-center hover:bg-blue-50 transition-colors">
                                <Input
                                    type="file"
                                    name="file"
                                    required
                                    accept=".pdf,.png,.jpg"
                                    className="cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200"
                                />
                                <p className="text-xs text-slate-400 mt-2">The new rev will automatically act as Rev {currentRev + 1}</p>
                            </div>
                        </div>
                        <div className="flex justify-end pt-2">
                            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8">
                                {loading ? "جاري الرفع..." : "إعادة الإرسال (Submit Revision)"}
                            </Button>
                        </div>
                    </form>
                </div>
            )}

        </div>
    )
}
