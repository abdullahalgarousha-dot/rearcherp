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
import { Plus, Building2 } from "lucide-react"
import { createContractor } from "@/app/admin/supervision/actions"
import { useRouter } from "next/navigation"

export function NewContractorDialog() {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        const formData = new FormData(e.currentTarget)

        const res = await createContractor(formData)
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
                <Button className="rounded-xl shadow-lg shadow-primary/20">
                    <Plus className="mr-2 h-4 w-4" />
                    إضافة مقاول جديد
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] rtl:text-right">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-primary">إضافة مقاول جديد</DialogTitle>
                        <DialogDescription>
                            أدخل بيانات المقاول الجديد لإضافته لقاعدة البيانات.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">اسم المقاول / الشركة</Label>
                            <Input id="name" name="name" required className="rounded-xl" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="contactInfo">بيانات التواصل (هاتف/ايميل)</Label>
                            <Input id="contactInfo" name="contactInfo" className="rounded-xl" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="logo">رابط الشعار (Logo URL)</Label>
                            <Input id="logo" name="logo" placeholder="https://..." className="rounded-xl" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading} className="w-full rounded-xl">
                            {loading ? "جاري الحفظ..." : "حفظ المقاول"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
