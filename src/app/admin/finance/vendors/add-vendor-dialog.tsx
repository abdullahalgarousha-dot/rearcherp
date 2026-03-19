"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, ShieldCheck, ShieldOff } from "lucide-react"
import { useRouter } from "next/navigation"
import { createVendor } from "@/app/admin/finance/vendors/actions"

const SPECIALTIES = [
    "Surveying", "Soil Testing", "MEP", "Structural", "Architecture",
    "Interior Design", "Landscape", "IT", "Legal", "Environmental", "Geotechnical", "Other"
]

export function AddVendorDialog() {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [isVatRegistered, setIsVatRegistered] = useState(false)
    const [form, setForm] = useState({
        companyName: '', specialty: '', taxNumber: '',
        contactPerson: '', phone: '', email: '', bankAccountDetails: ''
    })

    async function handleSubmit() {
        if (!form.companyName || !form.specialty) return
        setLoading(true)
        const res = await createVendor({
            companyName: form.companyName,
            specialty: form.specialty,
            isVatRegistered,
            taxNumber: isVatRegistered ? (form.taxNumber || undefined) : undefined,
            contactPerson: form.contactPerson || undefined,
            phone: form.phone || undefined,
            email: form.email || undefined,
            bankAccountDetails: form.bankAccountDetails || undefined,
        })
        setLoading(false)
        if (res.success) {
            setOpen(false)
            setForm({ companyName: '', specialty: '', taxNumber: '', contactPerson: '', phone: '', email: '', bankAccountDetails: '' })
            setIsVatRegistered(false)
            router.refresh()
        } else {
            alert(res.error)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-bold gap-2 h-11 shadow-xl shadow-orange-500/20">
                    <Plus className="h-4 w-4" /> Add Vendor
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="font-black text-xl">New Sub-Consultant / Vendor</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">

                    {/* VAT Registration Toggle */}
                    <button
                        type="button"
                        onClick={() => setIsVatRegistered(v => !v)}
                        className={`w-full flex items-center justify-between p-3 rounded-2xl border-2 transition-all text-left ${isVatRegistered
                                ? 'border-orange-300 bg-orange-50'
                                : 'border-slate-200 bg-slate-50'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            {isVatRegistered
                                ? <ShieldCheck className="h-5 w-5 text-orange-500" />
                                : <ShieldOff className="h-5 w-5 text-slate-400" />
                            }
                            <div>
                                <p className="font-black text-sm text-slate-800">
                                    {isVatRegistered ? "مسجل ضريبياً (VAT Registered)" : "غير مسجل ضريبياً (No VAT)"}
                                </p>
                                <p className="text-xs text-slate-500">
                                    {isVatRegistered
                                        ? "سيُطلب فاتورة ضريبية عند كل دفعة — ZATCA تلقائي"
                                        : "لا تُطلب فاتورة ضريبية — فقط إيصال الحوالة"}
                                </p>
                            </div>
                        </div>
                        <div className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${isVatRegistered ? 'bg-orange-500' : 'bg-slate-200'}`}>
                            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isVatRegistered ? 'translate-x-5' : ''}`} />
                        </div>
                    </button>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2 space-y-1.5">
                            <Label className="font-bold">Company Name *</Label>
                            <Input className="rounded-xl h-11" placeholder="e.g. Al-Madar Surveying Co."
                                value={form.companyName}
                                onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))} />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="font-bold">Specialty / Discipline *</Label>
                            <Select value={form.specialty} onValueChange={v => setForm(f => ({ ...f, specialty: v }))}>
                                <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="Select..." /></SelectTrigger>
                                <SelectContent>
                                    {SPECIALTIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        {isVatRegistered ? (
                            <div className="space-y-1.5">
                                <Label className="font-bold flex items-center gap-1 text-orange-700">
                                    <ShieldCheck className="h-3.5 w-3.5" /> VAT Number (ZATCA) *
                                </Label>
                                <Input className="rounded-xl h-11 font-mono border-orange-200 bg-orange-50"
                                    placeholder="300xxxxxxxxxx"
                                    value={form.taxNumber}
                                    onChange={e => setForm(f => ({ ...f, taxNumber: e.target.value }))} />
                            </div>
                        ) : (
                            <div className="space-y-1.5">
                                <Label className="font-bold text-slate-400">VAT Number</Label>
                                <Input className="rounded-xl h-11 font-mono bg-slate-50 text-slate-300 cursor-not-allowed" disabled
                                    placeholder="لا ينطبق — غير مسجل ضريبياً" />
                            </div>
                        )}
                        <div className="space-y-1.5">
                            <Label className="font-bold">Contact Person</Label>
                            <Input className="rounded-xl h-11" placeholder="Full name"
                                value={form.contactPerson}
                                onChange={e => setForm(f => ({ ...f, contactPerson: e.target.value }))} />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="font-bold">Phone</Label>
                            <Input className="rounded-xl h-11" placeholder="+966 5x xxx xxxx"
                                value={form.phone}
                                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                        </div>
                        <div className="col-span-2 space-y-1.5">
                            <Label className="font-bold">Email</Label>
                            <Input type="email" className="rounded-xl h-11" placeholder="vendor@example.com"
                                value={form.email}
                                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                        </div>
                        <div className="col-span-2 space-y-1.5">
                            <Label className="font-bold">Bank Account / IBAN</Label>
                            <Input className="rounded-xl h-11" placeholder="SA00 0000 0000 0000 — Bank Name"
                                value={form.bankAccountDetails}
                                onChange={e => setForm(f => ({ ...f, bankAccountDetails: e.target.value }))} />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button
                        disabled={loading || !form.companyName || !form.specialty}
                        onClick={handleSubmit}
                        className="bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold"
                    >
                        {loading ? "Creating..." : "Add Vendor"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
