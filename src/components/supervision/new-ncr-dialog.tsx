"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertTriangle } from "lucide-react"
import { createNCR } from "@/app/admin/supervision/actions"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"

export function NewNCRDialog({ projects, contractors, defaultProjectId }: { projects: any[], contractors: any[], defaultProjectId?: string }) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        const formData = new FormData(e.currentTarget)

        const res = await createNCR(formData)
        setLoading(false)
        if (res.success) {
            setOpen(false)
            router.refresh()
        } else {
            alert(res.error || "Something went wrong")
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 shadow-sm transition-all hover:-translate-y-0.5 font-bold">
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    NCR جديد
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden border-none shadow-2xl rounded-[2rem] rtl:text-right">
                <form onSubmit={handleSubmit}>
                    <div className="bg-red-600 p-8 text-white relative">
                        <div className="absolute top-0 right-0 p-8 opacity-20">
                            <AlertTriangle className="h-16 w-16" />
                        </div>
                        <DialogHeader>
                            <DialogTitle className="text-3xl font-black tracking-tight">إصدار تقرير عدم مطابقة</DialogTitle>
                            <DialogDescription className="text-red-100 font-medium text-lg mt-2 opacity-90">
                                تسجيل مخالفة فنية أو إنشائية في الموقع (New NCR)
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto bg-slate-50/30">
                        <div className="grid gap-6">
                            {defaultProjectId ? (
                                <input type="hidden" name="projectId" value={defaultProjectId} />
                            ) : (
                                <div className="space-y-2">
                                    <Label htmlFor="projectId" className="text-xs font-black uppercase tracking-widest text-slate-400">المشروع المستهدف</Label>
                                    <Select name="projectId" required>
                                        <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-white shadow-sm focus:ring-red-500">
                                            <SelectValue placeholder="اختر المشروع من القائمة..." />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl border-slate-200">
                                            {projects.map(p => <SelectItem key={p.id} value={p.id} className="rounded-xl focus:bg-red-50 focus:text-red-600">{p.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="contractorId" className="text-xs font-black uppercase tracking-widest text-slate-400">المقاول المتسبب</Label>
                                    <Select name="contractorId" required>
                                        <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-white shadow-sm">
                                            <SelectValue placeholder="اختر المقاول" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl">
                                            {contractors.map(c => <SelectItem key={c.id} value={c.id} className="rounded-xl">{c.companyName || c.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="severity" className="text-xs font-black uppercase tracking-widest text-slate-400">مستوى الخطورة</Label>
                                    <Select name="severity" required defaultValue="MEDIUM">
                                        <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-white shadow-sm">
                                            <SelectValue placeholder="اختر المستوى" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl">
                                            <SelectItem value="LOW" className="text-emerald-600 font-bold rounded-xl">Low (منخفض)</SelectItem>
                                            <SelectItem value="MEDIUM" className="text-blue-600 font-bold rounded-xl">Medium (متوسط)</SelectItem>
                                            <SelectItem value="HIGH" className="text-orange-600 font-bold rounded-xl">High (عالي)</SelectItem>
                                            <SelectItem value="CRITICAL" className="text-red-600 font-bold rounded-xl">Critical (حرج)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description" className="text-xs font-black uppercase tracking-widest text-slate-400">وصف المخالفة بالتفصيل</Label>
                                <Textarea
                                    id="description"
                                    name="description"
                                    required
                                    placeholder="يرجى شرح التفاصيل الفنية للمخالفة وموقعها في المشروع..."
                                    className="min-h-[100px] rounded-2xl border-slate-200 bg-white focus:ring-red-500 shadow-sm"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="file" className="text-xs font-black uppercase tracking-widest text-red-500">مرفق صور الميدان / تقارير فنية *</Label>
                                <div className="relative">
                                    <Input
                                        id="file"
                                        name="file"
                                        type="file"
                                        required
                                        accept=".pdf,.png,.jpg,.jpeg"
                                        className="h-14 rounded-2xl bg-red-50/50 border-red-100 file:bg-red-600 file:text-white file:border-none file:rounded-xl file:px-4 file:py-2 file:mr-4 file:text-xs file:font-black"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 bg-white border-t border-slate-50">
                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full h-14 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-lg shadow-xl shadow-red-500/20 transition-all active:scale-95"
                        >
                            {loading ? "جاري إصدار التقرير..." : "إصدار التقرير النهائي ✓"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
