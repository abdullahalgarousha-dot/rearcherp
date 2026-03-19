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
import { Plus, UserPlus } from "lucide-react"
import { createStaff } from "@/app/admin/hr/actions"
import { useRouter } from "next/navigation"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { formatRoleName } from "@/lib/role-utils"

export function NewStaffDialog({ roles, managers, branches = [], children }: { roles: { id: string, name: string }[], managers: { id: string, name: string }[], branches?: any[], children?: React.ReactNode }) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [branchId, setBranchId] = useState(branches[0]?.id || "")
    const router = useRouter()

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        const formData = new FormData(e.currentTarget)
        // Ensure branchId is sent
        if (branchId) formData.append("branchId", branchId)

        const res = await createStaff(formData)
        setLoading(false)
        if (res.success) {
            setOpen(false)
            router.refresh()
        } else {
            alert(res.error || "خطأ في إنشاء الموظف")
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children ? children : (
                    <Button className="rounded-xl shadow-lg shadow-primary/20">
                        <UserPlus className="mr-2 h-4 w-4" />
                        إضافة موظف جديد
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] rtl:text-right">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-primary">إضافة موظف جديد</DialogTitle>
                        <DialogDescription>
                            أدخل البيانات الأساسية للموظف. اختر فرع الشركة المناسب.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">الاسم بالكامل</Label>
                                <Input id="name" name="name" required placeholder="مثال: أحمد محمد" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="email">البريد الإلكتروني (للدخول)</Label>
                                <Input id="email" name="email" type="email" required placeholder="user@fts.com" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>الفرع</Label>
                                <Select value={branchId} onValueChange={setBranchId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="اختر الفرع" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {branches.map(b => (
                                            <SelectItem key={b.id} value={b.id}>{b.nameAr} - {b.nameEn}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="roleId">المسمى الوظيفي</Label>
                                <Select name="roleId" required>
                                    <SelectTrigger>
                                        <SelectValue placeholder="اختر الدور" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {roles.map(r => (
                                            <SelectItem key={r.id} value={r.id}>{formatRoleName(r.name)}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="department">القسم</Label>
                                <Input id="department" name="department" required placeholder="مثال: الإدارة الهندسية" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="directManagerId">المدير المباشر</Label>
                                <Select name="directManagerId" defaultValue="NONE">
                                    <SelectTrigger>
                                        <SelectValue placeholder="بدون مدير (اختياري)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="NONE">بدون مدير مباشر</SelectItem>
                                        {managers.map(m => (
                                            <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="password">كلمة المرور المؤقتة</Label>
                                <Input id="password" name="password" type="password" required />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="salary">الراتب الأساسي</Label>
                                <Input id="salary" name="salary" type="number" step="0.01" />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading} className="w-full">
                            {loading ? "جاري الإضافة..." : "تسجيل الموظف"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
