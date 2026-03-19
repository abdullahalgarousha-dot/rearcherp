"use client"

import { useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Plus, Pencil, Trash2, CheckCircle2 } from "lucide-react"
import { BrandForm } from "./brand-form"
import { deleteBrand, setDefaultBrand } from "@/app/admin/brands/actions"
import { toast } from "sonner"

export function BrandAddDialog({ tenantId }: { tenantId: string }) {
    const [open, setOpen] = useState(false)
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="rounded-2xl h-12 px-6 bg-primary font-bold shadow-xl shadow-primary/20">
                    <Plus className="mr-2 h-5 w-5" /> Add New Entity
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] border-none rounded-[2.5rem] shadow-2xl p-0 overflow-hidden">
                <DialogHeader className="p-8 bg-slate-50 border-b border-slate-100">
                    <DialogTitle className="text-2xl font-black">Register New Brand/Entity</DialogTitle>
                    <DialogDescription className="font-medium text-slate-500">
                        Create a new internal brand for project and invoice segregation.
                    </DialogDescription>
                </DialogHeader>
                <div className="p-8">
                    <BrandForm tenantId={tenantId} onSuccess={() => setOpen(false)} />
                </div>
            </DialogContent>
        </Dialog>
    )
}

export function BrandEditDialog({ brand, tenantId }: { brand: any, tenantId: string }) {
    const [open, setOpen] = useState(false)
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200">
                    <Pencil className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] border-none rounded-[2.5rem] shadow-2xl p-0 overflow-hidden">
                <DialogHeader className="p-8 bg-slate-50 border-b border-slate-100">
                    <DialogTitle className="text-2xl font-black">Edit Entity Details</DialogTitle>
                    <DialogDescription className="font-medium text-slate-500">
                        Update registration, colors, and abbreviations for {brand.nameEn}.
                    </DialogDescription>
                </DialogHeader>
                <div className="p-8">
                    <BrandForm brand={brand} tenantId={tenantId} onSuccess={() => setOpen(false)} />
                </div>
            </DialogContent>
        </Dialog>
    )
}

export function BrandDeleteDialog({ brandId, name }: { brandId: string, name: string }) {
    const [loading, setLoading] = useState(false)

    async function handleDelete() {
        setLoading(true)
        const res = await deleteBrand(brandId)
        setLoading(false)
        if (res.success) {
            toast.success("Brand deleted successfully")
        } else {
            toast.error(res.error || "Failed to delete brand")
        }
    }

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200">
                    <Trash2 className="h-4 w-4" />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-[2rem] border-none shadow-2xl">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-xl font-black">Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription className="font-medium">
                        This will permanently delete the brand **{name}**. This action cannot be undone and may affect associated projects.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-xl border-slate-200 font-bold">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleDelete}
                        className="rounded-xl bg-rose-600 hover:bg-rose-700 font-bold"
                        disabled={loading}
                    >
                        {loading ? "Deleting..." : "Yes, Delete Entity"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}

export function SetDefaultBrandButton({ brandId, tenantId, isDefault }: { brandId: string, tenantId: string, isDefault: boolean }) {
    const [loading, setLoading] = useState(false)

    async function handleSet() {
        if (isDefault) return
        setLoading(true)
        const res = await setDefaultBrand(brandId, tenantId)
        setLoading(false)
        if (res.success) {
            toast.success("Primary entity updated")
        } else {
            toast.error(res.error || "Failed to set default")
        }
    }

    return (
        <Button
            variant={isDefault ? "secondary" : "ghost"}
            size="sm"
            className={`rounded-xl gap-2 font-bold ${isDefault ? 'bg-emerald-50 text-emerald-700 cursor-default px-4' : 'text-slate-400 hover:text-emerald-600'}`}
            onClick={handleSet}
            disabled={loading || isDefault}
        >
            <CheckCircle2 className={`h-4 w-4 ${isDefault ? 'fill-emerald-500 text-white' : ''}`} />
            {isDefault ? "Primary Entity" : "Set as Primary"}
        </Button>
    )
}
