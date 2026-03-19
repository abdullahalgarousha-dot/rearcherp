"use client"

import { useState, useEffect } from "react"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "../ui/textarea"
import { Plus, Calendar, AlertCircle } from "lucide-react"
import { createLeaveRequest } from "@/app/admin/hr/actions"
import { useRouter } from "next/navigation"

export function NewLeaveDialog({ currentUser }: { currentUser?: any }) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")
    const [daysRequested, setDaysRequested] = useState(0)
    const router = useRouter()

    useEffect(() => {
        if (startDate && endDate) {
            const start = new Date(startDate)
            const end = new Date(endDate)
            const diffTime = Math.abs(end.getTime() - start.getTime())
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
            setDaysRequested(diffDays > 0 ? diffDays : 0)
        } else {
            setDaysRequested(0)
        }
    }, [startDate, endDate])

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        const formData = new FormData(e.currentTarget)

        try {
            const res = await createLeaveRequest(formData)
            if (res.success) {
                setOpen(false)
                router.refresh()
                setStartDate("")
                setEndDate("")
            } else {
                alert(res.error || "Something went wrong")
            }
        } catch (error) {
            alert("Unexpected error occurred")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="rounded-xl shadow-lg shadow-primary/20 bg-gradient-to-r from-primary to-primary/80 hover:shadow-xl transition-all">
                    <Plus className="mr-2 h-4 w-4" />
                    طلب إجازة جديد
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] rtl:text-right border-none shadow-2xl bg-white/95 backdrop-blur-xl">
                <form onSubmit={handleSubmit}>
                    <DialogHeader className="border-b border-slate-100 pb-4 mb-4">
                        <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                <Calendar className="h-4 w-4" />
                            </div>
                            طلب إجازة جديد
                        </DialogTitle>
                        <DialogDescription className="text-slate-500">
                            يرجى ملء تفاصيل طلب الإجازة بدقة.
                        </DialogDescription>
                    </DialogHeader>

                    {currentUser && (
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-2xl border border-blue-100 mb-6 flex justify-between items-center text-blue-900 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Calendar className="h-24 w-24" />
                            </div>
                            <div className="space-y-1 relative z-10">
                                <span className="text-xs font-bold uppercase text-blue-400 tracking-wider">الرصيد المتاح</span>
                                <div className="text-3xl font-black">{currentUser.leaveBalance} <span className="text-sm font-medium">يوم</span></div>
                            </div>
                        </div>
                    )}

                    <div className="grid gap-5 py-2">
                        <div className="grid gap-2">
                            <Label htmlFor="type" className="text-slate-600 font-bold">نوع الإجازة</Label>
                            <Select name="type" required defaultValue="ANNUAL">
                                <SelectTrigger className="rounded-xl border-slate-200 h-10">
                                    <SelectValue placeholder="اختر النوع" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ANNUAL">🏖️ إجازة سنوية</SelectItem>
                                    <SelectItem value="SICK">🤒 إجازة مرضية</SelectItem>
                                    <SelectItem value="EMERGENCY">🚨 إجازة اضطرارية</SelectItem>
                                    <SelectItem value="UNPAID">💸 إجازة بدون راتب</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="startDate" className="text-slate-600 font-bold">من تاريخ</Label>
                                <Input
                                    id="startDate"
                                    name="startDate"
                                    type="date"
                                    required
                                    className="rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-colors"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="endDate" className="text-slate-600 font-bold">إلى تاريخ</Label>
                                <Input
                                    id="endDate"
                                    name="endDate"
                                    type="date"
                                    required
                                    className="rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-colors"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </div>
                        </div>

                        {daysRequested > 0 && (
                            <div className={`p-4 rounded-xl border text-sm flex justify-between items-center transition-all ${currentUser && daysRequested > currentUser.leaveBalance
                                ? "bg-red-50 border-red-100 text-red-700 shadow-sm"
                                : "bg-emerald-50 border-emerald-100 text-emerald-700 shadow-sm"
                                }`}>
                                <span className="font-medium">مدة الإجازة المطلوبة:</span>
                                <span className="font-black text-lg">{daysRequested} يوم</span>
                                {currentUser && daysRequested > currentUser.leaveBalance && (
                                    <span className="flex items-center gap-1 font-bold text-xs bg-white px-2 py-1 rounded-full text-red-600 border border-red-100">
                                        <AlertCircle className="h-3 w-3" /> تجاوز الرصيد
                                    </span>
                                )}
                            </div>
                        )}

                        <div className="grid gap-2">
                            <Label htmlFor="reason" className="text-slate-600 font-bold">السبب (اختياري)</Label>
                            <Textarea id="reason" name="reason" placeholder="اكتب سبب الإجازة هنا..." className="min-h-[100px] rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-colors" />
                        </div>
                    </div>
                    <DialogFooter className="mt-4">
                        <Button type="submit" disabled={loading} className="w-full rounded-xl h-11 text-base shadow-lg shadow-primary/20 hover:shadow-xl transition-all">
                            {loading ? "جاري الإرسال..." : "إرسال الطلب"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
