"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { updateNCRStatus, resubmitNCR } from "@/app/admin/supervision/actions"
import { AlertTriangle, FileText, ArrowUpRight, CheckCircle2, XCircle, Download } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export function NCRDetailsDialog({ ncr, userRole }: { ncr: any, userRole: string }) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    async function handleStatusUpdate(newStatus: string, formData: FormData) {
        setLoading(true)
        formData.append("status", newStatus)

        const res = await updateNCRStatus(ncr.id, formData)
        setLoading(false)

        if (res.success) {
            toast.success("NCR Status Updated")
            setOpen(false)
            router.refresh()
        } else {
            toast.error(res.error)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 rounded-lg text-primary hover:bg-primary hover:text-white">
                    التفاصيل <ArrowUpRight className="ml-2 h-3 w-3" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl bg-white rtl:text-right font-sans">
                <DialogHeader>
                    <div className="flex justify-between items-center pb-4 border-b">
                        <Badge variant={ncr.status === 'OPEN' ? 'destructive' : 'default'} className="text-sm px-3 py-1">
                            {ncr.status}
                        </Badge>
                        <DialogTitle className="text-xl font-black text-primary">تفاصيل تقرير عدم المطابقة</DialogTitle>
                    </div>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    {/* Basic Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label className="text-xs font-bold text-muted-foreground">التاريخ</Label>
                            <p className="font-bold text-slate-800">{new Date(ncr.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs font-bold text-muted-foreground">الرقم المرجعي</Label>
                            <p className="font-bold text-slate-800">{ncr.officeRef || ncr.id.slice(0, 8)}</p>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs font-bold text-muted-foreground">المشروع</Label>
                            <p className="font-bold text-slate-800">{ncr.project?.name}</p>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs font-bold text-muted-foreground">المقاول</Label>
                            <p className="font-bold text-slate-800">{ncr.contractor?.name}</p>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs font-bold text-muted-foreground">الخطورة</Label>
                            <div className={`inline-flex px-2 py-1 rounded bg-slate-100 text-xs font-bold ${ncr.severity === 'CRITICAL' ? 'text-red-600 bg-red-50' :
                                ncr.severity === 'HIGH' ? 'text-orange-600 bg-orange-50' : 'text-slate-600'
                                }`}>
                                {ncr.severity}
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <Label className="text-xs font-bold text-muted-foreground">تفاصيل المخالفة</Label>
                        <p className="text-sm font-medium leading-relaxed">{ncr.description}</p>
                    </div>

                    {/* Contractor Document */}
                    {ncr.contractorDoc && (
                        <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-50 border border-indigo-100">
                            <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-indigo-600" />
                                <span className="text-sm font-bold text-indigo-900">تقرير المقاول المرفق</span>
                            </div>
                            <Button asChild size="sm" variant="outline" className="h-8 border-indigo-200 text-indigo-700 bg-white hover:bg-indigo-100">
                                <a href={ncr.contractorDoc} target="_blank" rel="noopener noreferrer">
                                    <Download className="mr-2 h-3 w-3" /> تحميل
                                </a>
                            </Button>
                        </div>
                    )}

                    {/* Root Cause */}
                    {ncr.rootCause && (
                        <div className="space-y-2 bg-amber-50 p-4 rounded-xl border border-amber-100">
                            <Label className="text-xs font-bold text-amber-600">الجذر المسبب (Root Cause)</Label>
                            <p className="text-sm font-medium leading-relaxed text-slate-800">{ncr.rootCause}</p>
                        </div>
                    )}

                    {/* Consultant Response (If Closed) */}
                    {ncr.consultantDoc && (
                        <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                <span className="text-sm font-bold text-emerald-900">الرد النهائي (Consultant Response)</span>
                            </div>
                            <Button asChild size="sm" variant="outline" className="h-8 border-emerald-200 text-emerald-700 bg-white hover:bg-emerald-100">
                                <a href={ncr.consultantDoc} target="_blank" rel="noopener noreferrer">
                                    <Download className="mr-2 h-3 w-3" /> تحميل
                                </a>
                            </Button>
                        </div>
                    )}

                    {/* Actions (Admin/PM Only) */}
                    {(userRole === 'ADMIN' || userRole === 'PM') && (ncr.status === 'PENDING' || ncr.status === 'OPEN') && (
                        <div className="border-t pt-4 mt-2 grid gap-4">
                            <Label className="block text-sm font-bold">إجراءات الاعتماد</Label>

                            <div className="flex gap-2">
                                <Button
                                    onClick={async () => {
                                        if (confirm("Are you sure you want to Approve this NCR?")) {
                                            setLoading(true)
                                            const res = await (await import("@/app/admin/supervision/actions")).approveNCR(ncr.id)
                                            setLoading(false)
                                            if (res.success) {
                                                toast.success("NCR Approved successfully")
                                                setOpen(false)
                                                router.refresh()
                                            } else {
                                                toast.error(res.error)
                                            }
                                        }
                                    }}
                                    disabled={loading}
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                                >
                                    {loading ? "جاري المعالجة..." : "اعتماد (Approve NCR)"}
                                </Button>
                            </div>

                            <div className="space-y-4 pt-2 border-t mt-2">
                                <Label className="block text-sm font-bold text-slate-600">إغلاق مع إرفاق مستند (اختياري)</Label>
                                <form action={(formData) => handleStatusUpdate('CLOSED', formData)} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-slate-600">إرفاق الرد النهائي / الموافقة (مطلوب للإغلاق اليدوي)</Label>
                                        <Input type="file" name="consultantDoc" required className="bg-slate-50 border-slate-200" accept=".pdf,.png,.jpg,.jpeg" />
                                    </div>
                                    <Button type="submit" disabled={loading} variant="outline" className="w-full border-emerald-600 text-emerald-700 hover:bg-emerald-50 font-bold">
                                        {loading ? "جاري المعالجة..." : "إغلاق التقرير مع ملف (Close with File)"}
                                    </Button>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Resubmit (If Rejected) */}
                    {(userRole === 'ADMIN' || userRole === 'PM' || userRole === 'SITE_ENGINEER') && (ncr.status === 'REJECTED' || ncr.status === 'OPEN') && (
                        <div className="border-t pt-4 mt-2">
                            <Label className="mb-4 block text-sm font-bold text-red-600 flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4" />
                                إعادة التقديم (Resubmit Revision)
                            </Label>
                            <form action={async (formData) => {
                                setLoading(true)
                                const res = await resubmitNCR(ncr.id, formData)
                                setLoading(false)
                                if (res.success) {
                                    toast.success("NCR Resubmitted successfully")
                                    setOpen(false)
                                    router.refresh()
                                } else {
                                    toast.error(res.error)
                                }
                            }} className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-slate-600">إرفاق تقرير مصحح (Corrected Report) *</Label>
                                    <Input type="file" name="file" required className="bg-slate-50 border-slate-200" accept=".pdf,.png,.jpg,.jpeg" />
                                </div>
                                <Button type="submit" variant="default" disabled={loading} className="w-full bg-slate-900 hover:bg-black text-white font-bold">
                                    {loading ? "جاري الرفع..." : "إعادة إرسال (Submit Revision)"}
                                </Button>
                            </form>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
