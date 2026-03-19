"use client"

import { useState } from "react"
import { useFormStatus } from "react-dom"
import { submitLeaveRequest, submitLoanRequest, submitDocumentRequest } from "@/app/actions/hr-workflows"
import { Calendar, FileText, Wallet, Clock, CheckCircle2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

function SubmitButton({ text }: { text: string }) {
    const { pending } = useFormStatus()
    return (
        <Button type="submit" className="w-full font-bold bg-indigo-600 hover:bg-indigo-700 text-white" disabled={pending}>
            {pending ? "جاري الإرسال..." : text}
        </Button>
    )
}

function StatusBadge({ status }: { status: string }) {
    if (status.includes("APPROVED") || status === "READY_FOR_PICKUP") {
        return <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-md"><CheckCircle2 size={14} /> معتمد</span>
    }
    if (status === "REJECTED") {
        return <span className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-md"><XCircle size={14} /> مرفوض</span>
    }
    return <span className="flex items-center gap-1 text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-md"><Clock size={14} /> قيد المراجعة</span>
}

export function RequestsClient({ leaves, loans, documents, leaveBalance }: any) {
    const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    const handleLeave = async (formData: FormData) => {
        setMsg(null)
        const res = await submitLeaveRequest(formData)
        if (res.error) setMsg({ type: 'error', text: res.error })
        else setMsg({ type: 'success', text: "تم إرسال طلب الإجازة بنجاح للمدير المباشر." })
    }

    const handleLoan = async (formData: FormData) => {
        setMsg(null)
        const res = await submitLoanRequest(formData)
        if (res.error) setMsg({ type: 'error', text: res.error })
        else setMsg({ type: 'success', text: "تم إرسال طلب السلفة بنجاح للمدير المباشر." })
    }

    const handleDoc = async (formData: FormData) => {
        setMsg(null)
        const res = await submitDocumentRequest(formData)
        if (res.error) setMsg({ type: 'error', text: res.error })
        else setMsg({ type: 'success', text: "تم رفع طلب المستند بنجاح لإدارة الموارد البشرية." })
    }

    return (
        <div className="p-4 md:p-8 rtl:text-right max-w-5xl mx-auto pb-24 font-sans">
            <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-2">الطلبات والنماذج</h1>
            <p className="text-slate-500 font-medium mb-8">إرسال ومتابعة الإجازات، السلف، والمستندات الرسمية.</p>

            {msg && (
                <div className={`p-4 rounded-xl font-bold mb-6 ${msg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {msg.text}
                </div>
            )}

            <Tabs defaultValue="leave" className="w-full dir-rtl" dir="rtl">
                <TabsList className="grid grid-cols-3 w-full bg-slate-100 p-1 mb-6 rounded-xl">
                    <TabsTrigger value="leave" className="font-bold rounded-lg"><Calendar className="ml-2 w-4 h-4" /> طلب إجازة</TabsTrigger>
                    <TabsTrigger value="loan" className="font-bold rounded-lg"><Wallet className="ml-2 w-4 h-4" /> طلب سلفة</TabsTrigger>
                    <TabsTrigger value="document" className="font-bold rounded-lg"><FileText className="ml-2 w-4 h-4" /> مستند معتمد</TabsTrigger>
                </TabsList>

                {/* --- LEAVE REQUEST TAB --- */}
                <TabsContent value="leave">
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="bg-white border text-right border-slate-200 rounded-2xl p-6 shadow-sm">
                            <h2 className="text-xl font-bold text-slate-800 mb-6">تقديم طلب وتحديد التاريخ</h2>
                            <form action={handleLeave} className="space-y-4">
                                <div>
                                    <Label className="text-slate-700 font-bold">نوع الإجازة</Label>
                                    <Select name="type" required defaultValue="ANNUAL">
                                        <SelectTrigger className="bg-slate-50 border-slate-200 mt-1 rtl:flex-row-reverse text-right">
                                            <SelectValue placeholder="اختر النوع" />
                                        </SelectTrigger>
                                        <SelectContent align="end" className="text-right">
                                            <SelectItem value="ANNUAL">سنوية (مدفوعة)</SelectItem>
                                            <SelectItem value="SICK">مرضية</SelectItem>
                                            <SelectItem value="EMERGENCY">طارئة</SelectItem>
                                            <SelectItem value="UNPAID">غير مدفوعة الأجر</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-slate-700 font-bold">من تاريخ</Label>
                                        <Input name="startDate" type="date" className="mt-1 bg-slate-50" required />
                                    </div>
                                    <div>
                                        <Label className="text-slate-700 font-bold">إلى تاريخ</Label>
                                        <Input name="endDate" type="date" className="mt-1 bg-slate-50" required />
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-slate-700 font-bold">المبرر أو ملاحظات (اختياري)</Label>
                                    <Textarea name="reason" className="mt-1 bg-slate-50 min-h-[100px]" placeholder="مثال: إجازتي السنوية للعام الحالي..." />
                                </div>
                                <SubmitButton text="إرسال طلب الإجازة" />
                            </form>
                        </div>

                        <div>
                            <div className="bg-indigo-50 rounded-2xl p-6 mb-6 flex justify-between items-center text-right">
                                <div>
                                    <p className="text-xs font-bold text-indigo-400 mb-1 uppercase">رصيد الإجازات السنوية المتوفر</p>
                                    <p className="text-3xl font-black text-indigo-700">{leaveBalance} <span className="text-sm">يوم</span></p>
                                </div>
                                <Calendar size={48} className="text-indigo-200" />
                            </div>

                            <h3 className="font-bold text-slate-800 mb-4 text-right">آخر طلبات الإجازة</h3>
                            <div className="space-y-3 hidden sm:block">
                                {leaves?.map((l: any) => (
                                    <div key={l.id} className="bg-white border border-slate-100 p-4 rounded-xl flex justify-between items-center text-right">
                                        <div>
                                            <p className="font-bold text-slate-700 text-sm">{l.type === 'ANNUAL' ? 'إجازة سنوية' : l.type}</p>
                                            <p className="text-xs text-slate-400 mt-1">{new Date(l.startDate).toLocaleDateString()} المباشرة {new Date(l.endDate).toLocaleDateString()}</p>
                                        </div>
                                        <StatusBadge status={l.status} />
                                    </div>
                                ))}
                                {leaves?.length === 0 && <p className="text-sm text-slate-400 text-center py-4 bg-slate-50 rounded-xl">لا توجد طلبات سابقة</p>}
                            </div>
                        </div>
                    </div>
                </TabsContent>

                {/* --- LOAN REQUEST TAB --- */}
                <TabsContent value="loan">
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="bg-white border text-right border-slate-200 rounded-2xl p-6 shadow-sm">
                            <h2 className="text-xl font-bold text-slate-800 mb-6">تقديم طلب سلفة مالية</h2>
                            <form action={handleLoan} className="space-y-4">
                                <div>
                                    <Label className="text-slate-700 font-bold">المبلغ المطلوب (SAR)</Label>
                                    <Input name="amount" type="number" min={500} step={100} placeholder="مثال: 5000" className="mt-1 bg-slate-50" required />
                                </div>
                                <div>
                                    <Label className="text-slate-700 font-bold">مدة تقسيط الخصم (بالأشهر)</Label>
                                    <Input name="installments" type="number" min={1} max={12} placeholder="مثال: 4" className="mt-1 bg-slate-50" required />
                                </div>
                                <div>
                                    <Label className="text-slate-700 font-bold">السبب / المبرر</Label>
                                    <Textarea name="reason" className="mt-1 bg-slate-50" required placeholder="يرجى توضيح سبب الطلب بإيجاز..." />
                                </div>
                                <SubmitButton text="تقديم الطلب للمدير المباشر" />
                            </form>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 mb-4 text-right">طلبات السلف السابقة</h3>
                            <div className="space-y-3">
                                {loans?.map((l: any) => (
                                    <div key={l.id} className="bg-white border border-slate-100 p-4 rounded-xl flex justify-between items-center text-right">
                                        <div>
                                            <p className="font-bold text-slate-700 text-sm">{l.amount} SAR</p>
                                            <p className="text-xs text-slate-400 mt-1">تفويض خصم على {l.installments} أشهر</p>
                                        </div>
                                        <StatusBadge status={l.status} />
                                    </div>
                                ))}
                                {loans?.length === 0 && <p className="text-sm text-slate-400 text-center py-4 bg-slate-50 rounded-xl">لا توجد سلف مالية مسجلة</p>}
                            </div>
                        </div>
                    </div>
                </TabsContent>

                {/* --- DOCUMENT REQUEST TAB --- */}
                <TabsContent value="document">
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="bg-white border text-right border-slate-200 rounded-2xl p-6 shadow-sm">
                            <h2 className="text-xl font-bold text-slate-800 mb-6">طلب إصدار مستند أو خطاب</h2>
                            <form action={handleDoc} className="space-y-4">
                                <div>
                                    <Label className="text-slate-700 font-bold">نوع المستند</Label>
                                    <Select name="type" required defaultValue="SALARY_CERTIFICATE">
                                        <SelectTrigger className="bg-slate-50 border-slate-200 mt-1 rtl:flex-row-reverse text-right">
                                            <SelectValue placeholder="اختر المستند المطلوب" />
                                        </SelectTrigger>
                                        <SelectContent align="end" className="text-right">
                                            <SelectItem value="SALARY_CERTIFICATE">خطاب تعريف بالراتب</SelectItem>
                                            <SelectItem value="EXIT_RE_ENTRY">تأشيرة خروج وعودة</SelectItem>
                                            <SelectItem value="IBAN_LETTER">خطاب تحويل راتب (للبنك)</SelectItem>
                                            <SelectItem value="OTHER">أخرى (يرجى التوضيح)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label className="text-slate-700 font-bold">التفاصيل / الجهة الموجه لها</Label>
                                    <Textarea name="details" className="mt-1 bg-slate-50" placeholder="مثال: خطاب تعريف لتقديمه للبنك الأهلي..." required />
                                </div>
                                <SubmitButton text="إرسال الطلب للـ HR" />
                            </form>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 mb-4 text-right">الخطابات السابقة</h3>
                            <div className="space-y-3">
                                {documents?.map((d: any) => (
                                    <div key={d.id} className="bg-white border border-slate-100 p-4 rounded-xl flex justify-between items-center text-right">
                                        <div>
                                            <p className="font-bold text-slate-700 text-sm text-left">{d.type}</p>
                                            <p className="text-[10px] text-slate-500 mt-1">{new Date(d.createdAt).toLocaleDateString()}</p>
                                        </div>
                                        <StatusBadge status={d.status} />
                                    </div>
                                ))}
                                {documents?.length === 0 && <p className="text-sm text-slate-400 text-center py-4 bg-slate-50 rounded-xl">لم تطلب أي مستندات مسبقاً</p>}
                            </div>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
