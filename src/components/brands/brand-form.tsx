"use client"

import { useState, useRef } from "react"
import { useForm, SubmitHandler } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { createBrand, updateBrand } from "@/app/admin/brands/actions"
import { toast } from "sonner"
import { Building2, Upload, Save, X } from "lucide-react"

const brandSchema = z.object({
    nameEn: z.string().min(2, "English name is required"),
    nameAr: z.string().min(2, "Arabic name is required"),
    abbreviation: z.string().min(2, "Prefix must be 2–4 characters").max(4, "Prefix must be 2–4 characters"),
    shortName: z.string().optional(),
    fullName: z.string().optional(),
    logoUrl: z.string().optional(),
    primaryColor: z.string(),
    accentColor: z.string(),
    taxNumber: z.string().optional(),
    crNumber: z.string().optional(),
    nationalAddress: z.string().optional(),
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
    const [logoPreview, setLogoPreview] = useState<string>(brand?.logoUrl || "")
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
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
            nationalAddress: brand?.nationalAddress || "",
            bankName: brand?.bankName || "",
            iban: brand?.iban || "",
            addressAr: brand?.addressAr || "",
            addressEn: brand?.addressEn || "",
            isDefault: brand?.isDefault || false,
        }
    })

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        if (file.size > 2 * 1024 * 1024) {
            toast.error("Logo must be under 2 MB")
            return
        }
        setSelectedFile(file)
        const reader = new FileReader()
        reader.onload = (ev) => {
            setLogoPreview(ev.target?.result as string)
        }
        reader.readAsDataURL(file)
    }

    const onSubmit: SubmitHandler<BrandFormValues> = async (values) => {
        setLoading(true)
        try {
            const formData = new FormData()
            
            // Append all fields EXCEPT logoUrl to prevent sending giant base64 strings
            Object.entries(values).forEach(([key, value]) => {
                if (key !== "logoUrl" && value !== undefined && value !== null) {
                    formData.append(key, value.toString())
                }
            })

            // Append binary file if selected using a dedicated key
            if (selectedFile) {
                formData.append("logoFile", selectedFile)
            }

            let res
            if (isEdit) {
                res = await updateBrand(brand.id, formData)
            } else {
                res = await createBrand(tenantId, formData)
            }

            if (res.success) {
                toast.success(isEdit ? "Entity updated successfully!" : "Entity created successfully!")
                onSuccess?.()
            } else {
                toast.error(res.error || "Failed to save entity")
            }
        } catch (err: any) {
            console.error("[BrandForm] unexpected error:", err)
            toast.error(err?.message || "Unexpected error — check server logs")
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">

                {/* ── Left column ── */}
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            ID Prefix / Abbreviation <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            {...form.register("abbreviation")}
                            placeholder="e.g. FTS"
                            className="rounded-xl border-slate-200 font-black uppercase"
                            onChange={e => form.setValue("abbreviation", e.target.value.toUpperCase())}
                        />
                        {form.formState.errors.abbreviation && (
                            <p className="text-xs text-red-500">{form.formState.errors.abbreviation.message}</p>
                        )}
                        <p className="text-[10px] text-slate-400">Used for Projects, Invoices, NCR IDs (2–4 chars)</p>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Entity Name (English) <span className="text-red-500">*</span>
                        </Label>
                        <Input {...form.register("nameEn")} className="rounded-xl border-slate-200" />
                        {form.formState.errors.nameEn && (
                            <p className="text-xs text-red-500">{form.formState.errors.nameEn.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Entity Name (Arabic) <span className="text-red-500">*</span>
                        </Label>
                        <Input {...form.register("nameAr")} className="rounded-xl border-slate-200 text-right" dir="rtl" />
                        {form.formState.errors.nameAr && (
                            <p className="text-xs text-red-500">{form.formState.errors.nameAr.message}</p>
                        )}
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

                {/* ── Right column ── */}
                <div className="space-y-4">
                    {/* Logo upload */}
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Entity Logo</Label>
                        <div className="flex items-center gap-4">
                            {/* Preview circle */}
                            <div
                                className="h-20 w-20 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden flex-shrink-0 cursor-pointer hover:border-primary/50 transition-colors"
                                onClick={() => fileInputRef.current?.click()}
                                title="Click to upload logo"
                            >
                                {logoPreview ? (
                                    <img src={logoPreview} alt="Logo preview" className="h-full w-full object-contain p-1" />
                                ) : (
                                    <Building2 className="h-8 w-8 text-slate-300" />
                                )}
                            </div>

                            <div className="flex-1 space-y-2">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleFileChange}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="w-full rounded-xl border-slate-200 text-slate-600 font-semibold"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <Upload className="h-3.5 w-3.5 mr-2" />
                                    Choose Image
                                </Button>
                                {logoPreview && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="w-full rounded-xl text-slate-400 hover:text-red-500 text-xs"
                                        onClick={() => { 
                                            setLogoPreview(""); 
                                            setSelectedFile(null);
                                            form.setValue("logoUrl", "");
                                        }}
                                    >
                                        <X className="h-3 w-3 mr-1" /> Remove
                                    </Button>
                                )}
                                <p className="text-[10px] text-slate-400">PNG, JPG or SVG · max 2 MB</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Primary Branding Color</Label>
                        <div className="flex gap-3">
                            <Input type="color" {...form.register("primaryColor")} className="h-10 w-20 p-1 rounded-xl cursor-pointer" />
                            <Input {...form.register("primaryColor")} className="rounded-xl font-mono uppercase" placeholder="#10b981" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tax / VAT Number</Label>
                        <Input {...form.register("taxNumber")} className="rounded-xl border-slate-200 font-mono" />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">CR Number</Label>
                        <Input {...form.register("crNumber")} className="rounded-xl border-slate-200 font-mono" />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">National Address | العنوان الوطني</Label>
                        <Input {...form.register("nationalAddress")} placeholder="e.g. 1234 King Fahad Rd, Riyadh" className="rounded-xl border-slate-200 font-medium" />
                    </div>
                </div>
            </div>

            <div className="pt-4 flex justify-end">
                <Button
                    type="submit"
                    disabled={loading}
                    className="rounded-2xl h-12 px-8 bg-primary font-bold shadow-lg shadow-primary/20"
                >
                    <Save className="mr-2 h-4 w-4" />
                    {loading ? "Saving…" : isEdit ? "Update Entity" : "Create Entity"}
                </Button>
            </div>
        </form>
    )
}
