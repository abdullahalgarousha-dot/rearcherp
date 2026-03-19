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
import { Pencil } from "lucide-react"
import { updateBrand } from "@/app/admin/brands/new/actions"
import { useRouter } from "next/navigation"

export function BrandEditDialog({ brand }: { brand: any }) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        const formData = new FormData(e.currentTarget)

        const res = await updateBrand(brand.id, formData)
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
                <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Pencil className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] rtl:text-right">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>تعديل بيانات العلامة التجارية</DialogTitle>
                        <DialogDescription>
                            قم بتعديل بيانات {brand.nameEn} هنا. اضغط حفظ عند الانتهاء.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="nameEn" className="text-right">الاسم (EN)</Label>
                            <Input id="nameEn" name="nameEn" defaultValue={brand.nameEn} className="col-span-3" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="nameAr" className="text-right">الاسم (AR)</Label>
                            <Input id="nameAr" name="nameAr" defaultValue={brand.nameAr} className="col-span-3" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="acronym" className="text-right">رمز مختصر</Label>
                            <Input id="acronym" name="acronym" defaultValue={brand.acronym || brand.shortName} className="col-span-3" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="email" className="text-right">البريد الإلكتروني</Label>
                            <Input id="email" name="email" defaultValue={brand.email} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="phone" className="text-right">الهاتف</Label>
                            <Input id="phone" name="phone" defaultValue={brand.phone} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="address" className="text-right">العنوان</Label>
                            <Input id="address" name="address" defaultValue={brand.address} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="crNumber" className="text-right">رقم السجل التجاري</Label>
                            <Input id="crNumber" name="crNumber" defaultValue={brand.crNumber} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="vatNumber" className="text-right">الرقم الضريبي</Label>
                            <Input id="vatNumber" name="vatNumber" defaultValue={brand.vatNumber} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="bankName" className="text-right">اسم البنك</Label>
                            <Input id="bankName" name="bankName" defaultValue={brand.bankName} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="iban" className="text-right">IBAN</Label>
                            <Input id="iban" name="iban" defaultValue={brand.iban} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="accountHolder" className="text-right">صاحب الحساب</Label>
                            <Input id="accountHolder" name="accountHolder" defaultValue={brand.accountHolder} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="logo" className="text-right">الشعار</Label>
                            <div className="col-span-3 flex items-center gap-2">
                                <Input id="logo" name="logo" type="file" accept="image/*" />
                                {brand.logoUrl && (
                                    <img src={brand.logoUrl} className="h-10 w-10 object-contain border rounded" alt="Logo preview" />
                                )}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading ? "جاري الحفظ..." : "حفظ التغييرات"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
