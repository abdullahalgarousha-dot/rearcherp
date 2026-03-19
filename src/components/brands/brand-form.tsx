"use client"

import { useState } from "react"
import { useForm, SubmitHandler } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { createBrand, updateBrand } from "@/app/admin/brands/actions"
import { toast } from "sonner"
import { Building2, Palette, Receipt, Globe, CreditCard, Save } from "lucide-react"

const brandSchema = z.object({
    nameEn: z.string().min(2, "English name is required"),
    nameAr: z.string().min(2, "Arabic name is required"),
    abbreviation: z.string().min(2, "Prefix must be 2-4 characters").max(4, "Prefix must be 2-4 characters"),
    shortName: z.string().optional(),
    fullName: z.string().optional(),
    logoUrl: z.string().optional(),
    primaryColor: z.string(),
    accentColor: z.string(),
    taxNumber: z.string().optional(),
    crNumber: z.string().optional(),
    bankName: z.string().optional(),
    iban: z.string().optional(),
    addressAr: z.string().optional(),
    addressEn: z.string().optional(),
    isDefault: z.boolean(),
})

type BrandFormValues = z.infer<typeof brandSchema>

interface BrandFormProps {
    brand?: any
    tenantId: string
    onSuccess?: () => void
}

export function BrandForm({ brand, tenantId, onSuccess }: BrandFormProps) {
    const [loading, setLoading] = useState(false)
    const isEdit = !!brand

    const form = useForm<BrandFormValues>({
        resolver: zodResolver(brandSchema) as any,
        defaultValues: {
            nameEn: brand?.nameEn || "",
            nameAr: brand?.nameAr || "",
            abbreviation: brand?.abbreviation || "",
            shortName: brand?.shortName || "",
            fullName: brand?.fullName || "",
            logoUrl: brand?.logoUrl || "",
            primaryColor: brand?.primaryColor || "#10b981",
            accentColor: brand?.accentColor || "#059669",
            taxNumber: brand?.taxNumber || "",
            crNumber: brand?.crNumber || "",
            bankName: brand?.bankName || "",
            iban: brand?.iban || "",
            addressAr: brand?.addressAr || "",
            addressEn: brand?.addressEn || "",
            isDefault: brand?.isDefault || false,
        }
    })

    const onSubmit: SubmitHandler<BrandFormValues> = async (values) => {
        setLoading(true)
        let res
        if (isEdit) {
            res = await updateBrand(brand.id, values)
        } else {
            res = await createBrand(tenantId, values)
        }

        setLoading(false)
        if (res.success) {
            toast.success(isEdit ? "Brand updated successfully!" : "Brand created successfully!")
            onSuccess?.()
        } else {
            toast.error(res.error || "Failed to save brand")
        }
    }

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Brand Abbreviation (ID Prefix)</Label>
                        <Input
                            {...form.register("abbreviation")}
                            placeholder="e.g. FTS"
                            className="rounded-xl border-slate-200 font-black uppercase"
                        />
                        <p className="text-[10px] text-slate-400">Used for Projects, Invoices, and NCR IDs (2-4 chars)</p>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Entity Name (English)</Label>
                        <Input {...form.register("nameEn")} className="rounded-xl border-slate-200" />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Entity Name (Arabic)</Label>
                        <Input {...form.register("nameAr")} className="rounded-xl border-slate-200 text-right" />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="space-y-0.5">
                            <Label className="text-sm font-bold">Set as Default Entity</Label>
                            <p className="text-xs text-slate-400">Use this brand's prefix for system IDs by default</p>
                        </div>
                        <Switch
                            checked={form.watch("isDefault")}
                            onCheckedChange={(val: boolean) => form.setValue("isDefault", val)}
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Primary Branding Color</Label>
                        <div className="flex gap-3">
                            <Input type="color" {...form.register("primaryColor")} className="h-10 w-20 p-1 rounded-xl" />
                            <Input {...form.register("primaryColor")} className="rounded-xl font-mono uppercase" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Logo Image URL</Label>
                        <Input {...form.register("logoUrl")} className="rounded-xl border-slate-200" placeholder="https://..." />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tax/VAT Number</Label>
                        <Input {...form.register("taxNumber")} className="rounded-xl border-slate-200 font-mono" />
                    </div>
                </div>
            </div>

            <div className="pt-4 flex justify-end">
                <Button type="submit" disabled={loading} className="rounded-2xl h-12 px-8 bg-primary font-bold shadow-lg shadow-primary/20">
                    <Save className="mr-2 h-4 w-4" />
                    {loading ? "Saving..." : isEdit ? "Update Entity" : "Create Entity"}
                </Button>
            </div>
        </form>
    )
}
