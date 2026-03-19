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
import { ClipboardCheck } from "lucide-react"
import { createInspectionRequest } from "@/app/admin/supervision/actions"
import { useRouter } from "next/navigation"

export function NewIRDialog({ projects, contractors }: { projects: any[], contractors: any[] }) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [selectedProject, setSelectedProject] = useState("")
    const [selectedContractor, setSelectedContractor] = useState("")
    const router = useRouter()

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        const formData = new FormData(e.currentTarget)

        // Ensure projectId is present
        if (!formData.get("projectId") && selectedProject) {
            formData.set("projectId", selectedProject)
        }
        // Ensure contractorId is present
        if (!formData.get("contractorId") && selectedContractor) {
            formData.set("contractorId", selectedContractor)
        }

        const res = await createInspectionRequest(formData)
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
                <Button className="rounded-xl shadow-lg bg-blue-600 hover:bg-blue-700 text-white border-none transition-all hover:-translate-y-0.5 font-bold">
                    <ClipboardCheck className="mr-2 h-4 w-4" />
                    IR جديد
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden border-none shadow-2xl rounded-[2rem] rtl:text-right font-sans">
                <form onSubmit={handleSubmit}>
                    <div className="bg-blue-600 p-8 text-white relative">
                        <div className="absolute top-0 right-0 p-8 opacity-20">
                            <ClipboardCheck className="h-16 w-16" />
                        </div>
                        <DialogHeader>
                            <DialogTitle className="text-3xl font-black tracking-tight">إصدار طلب فحص أعمال</DialogTitle>
                            <DialogDescription className="text-blue-100 font-medium text-lg mt-2 opacity-90">
                                تعبئة نموذج طلب الفحص (New Inspection Request)
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto bg-slate-50/30">
                        <div className="grid gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="projectId" className="text-xs font-black uppercase tracking-widest text-slate-400">المشروع</Label>
                                <Select name="projectId" required onValueChange={setSelectedProject}>
                                    <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-white shadow-sm focus:ring-blue-500">
                                        <SelectValue placeholder="اختر المشروع" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl border-slate-200">
                                        {projects.map(p => (
                                            <SelectItem key={p.id} value={p.id} className="rounded-xl focus:bg-blue-50 focus:text-blue-600">{p.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <input type="hidden" name="projectId" value={selectedProject} />
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="contractorId" className="text-xs font-black uppercase tracking-widest text-slate-400">المقاول</Label>
                                    <Select name="contractorId" required onValueChange={setSelectedContractor}>
                                        <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-white shadow-sm focus:ring-blue-500">
                                            <SelectValue placeholder="اختر المقاول" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl">
                                            {contractors.map(c => (
                                                <SelectItem key={c.id} value={c.id} className="rounded-xl">{c.companyName || c.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <input type="hidden" name="contractorId" value={selectedContractor} />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="type" className="text-xs font-black uppercase tracking-widest text-slate-400">نوع الفحص</Label>
                                    <Select name="type" required defaultValue="WORK">
                                        <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-white shadow-sm focus:ring-blue-500">
                                            <SelectValue placeholder="اختر النوع" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl">
                                            <SelectItem value="WORK" className="rounded-xl font-bold">Work Inspection</SelectItem>
                                            <SelectItem value="MATERIAL" className="rounded-xl font-bold">Material Admission</SelectItem>
                                            <SelectItem value="TESTING" className="rounded-xl font-bold">Field Testing</SelectItem>
                                            <SelectItem value="SURVEY" className="rounded-xl font-bold">Survey Points</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="date" className="text-xs font-black uppercase tracking-widest text-slate-400">تاريخ الفحص</Label>
                                    <Input id="date" name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="h-12 rounded-2xl border-slate-200 bg-white shadow-sm" />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="contractorRef" className="text-xs font-black uppercase tracking-widest text-slate-400">مرجع المقاول (Ref#)</Label>
                                    <Input id="contractorRef" name="contractorRef" placeholder="ABC/IR/001" className="h-12 rounded-2xl border-slate-200 bg-white shadow-sm font-bold" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description" className="text-xs font-black uppercase tracking-widest text-slate-400">وصف الأعمال المطلوب فحصها</Label>
                                <Textarea
                                    id="description"
                                    name="description"
                                    required
                                    placeholder="يرجى توضيح المحاور، المنسوب، ونوع الأعمال..."
                                    className="min-h-[100px] rounded-2xl border-slate-200 bg-white focus:ring-blue-500 shadow-sm"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="file" className="text-xs font-black uppercase tracking-widest text-blue-500">تقرير المقاول المرفق *</Label>
                                <div className="relative">
                                    <Input
                                        id="file"
                                        name="file"
                                        type="file"
                                        required
                                        accept=".pdf,.png,.jpg,.jpeg"
                                        className="h-14 rounded-2xl bg-blue-50/50 border-blue-100 file:bg-blue-600 file:text-white file:border-none file:rounded-xl file:px-4 file:py-2 file:mr-4 file:text-xs file:font-black"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 bg-white border-t border-slate-50">
                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-lg shadow-xl shadow-blue-500/20 transition-all active:scale-95"
                        >
                            {loading ? "جاري الحفظ..." : "إرسال الطلب للاستشاري ✓"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
