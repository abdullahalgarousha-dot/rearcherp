"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Upload, Plus, Trash2, Loader2, FileCheck, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { submitCustodySettlement } from "@/app/admin/hr/petty-cash/actions"
import { useRouter } from "next/navigation"

interface SettlementItem {
    amount: string
    description: string
    invoicePhotoUrl: string
}

interface Props {
    requestId: string
    custodyAmount: number
    projectName: string
}

export function CustodySettlementDialog({ requestId, custodyAmount, projectName }: Props) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [items, setItems] = useState<SettlementItem[]>([
        { amount: "", description: "", invoicePhotoUrl: "" }
    ])
    const router = useRouter()

    const totalSettled = items.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0)
    const difference = custodyAmount - totalSettled

    function addItem() {
        setItems(prev => [...prev, { amount: "", description: "", invoicePhotoUrl: "" }])
    }

    function removeItem(idx: number) {
        setItems(prev => prev.filter((_, i) => i !== idx))
    }

    function updateItem(idx: number, field: keyof SettlementItem, value: string) {
        setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        const validItems = items.filter(i => parseFloat(i.amount) > 0)
        if (validItems.length === 0) {
            toast.error("Add at least one invoice with a valid amount")
            return
        }
        setLoading(true)
        const res = await submitCustodySettlement(
            requestId,
            validItems.map(i => ({
                amount: parseFloat(i.amount),
                description: i.description || undefined,
                invoicePhotoUrl: i.invoicePhotoUrl || undefined,
            }))
        )
        setLoading(false)
        if ((res as any).success) {
            toast.success("Settlement submitted — pending accountant review")
            setOpen(false)
            router.refresh()
        } else {
            toast.error((res as any).error || "Failed to submit")
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" className="h-8 text-xs rounded-xl bg-blue-600 hover:bg-blue-700 gap-1.5 shadow-sm">
                    <Upload className="h-3.5 w-3.5" /> Settle Custody
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[560px] border-none shadow-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="font-black text-lg flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                            <FileCheck className="h-4 w-4" />
                        </div>
                        تسوية العهدة | Custody Settlement
                    </DialogTitle>
                    <p className="text-sm text-slate-500 mt-1">
                        Upload your invoices as proof of spend. These will be reviewed by the accountant.
                    </p>
                </DialogHeader>

                {/* Custody summary */}
                <div className="bg-slate-50 rounded-xl p-4 space-y-2 border border-slate-100">
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-500 font-medium">Project</span>
                        <span className="font-bold text-slate-900">{projectName}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-500 font-medium">Custody Amount</span>
                        <span className="font-black text-slate-900">SAR {custodyAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-500 font-medium">Total Settled</span>
                        <span className={`font-black ${totalSettled >= custodyAmount ? 'text-emerald-600' : 'text-amber-600'}`}>
                            SAR {totalSettled.toLocaleString()}
                        </span>
                    </div>
                    {difference !== 0 && (
                        <div className="flex justify-between text-sm pt-1 border-t border-slate-200">
                            <span className="text-slate-400 font-medium">{difference > 0 ? 'Remaining' : 'Excess'}</span>
                            <span className={`font-black text-xs ${difference > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                SAR {Math.abs(difference).toLocaleString()}
                            </span>
                        </div>
                    )}
                </div>

                {/* Info notice */}
                <div className="flex gap-2 bg-amber-50 border border-amber-100 rounded-xl p-3">
                    <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800 leading-relaxed">
                        This submission <strong>only clears your name</strong> from the custody record.
                        The accountant will review your invoices and manually post the expenses to the project.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Invoice items */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-black text-slate-700">Invoice Items</Label>
                            <Button type="button" variant="outline" size="sm" onClick={addItem}
                                className="h-7 text-xs rounded-lg gap-1">
                                <Plus className="h-3 w-3" /> Add Invoice
                            </Button>
                        </div>

                        {items.map((item, idx) => (
                            <div key={idx} className="border border-slate-200 rounded-xl p-3 space-y-3 bg-white">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-black text-slate-500 uppercase tracking-widest">
                                        Invoice #{idx + 1}
                                    </span>
                                    {items.length > 1 && (
                                        <button type="button" onClick={() => removeItem(idx)}
                                            className="text-rose-400 hover:text-rose-600 transition-colors">
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs text-slate-500">Amount (SAR) *</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            placeholder="0.00"
                                            value={item.amount}
                                            onChange={e => updateItem(idx, 'amount', e.target.value)}
                                            className="h-9 text-sm rounded-lg"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-slate-500">Invoice Photo URL</Label>
                                        <Input
                                            placeholder="https://... or file path"
                                            value={item.invoicePhotoUrl}
                                            onChange={e => updateItem(idx, 'invoicePhotoUrl', e.target.value)}
                                            className="h-9 text-sm rounded-lg"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-slate-500">Description / Vendor Name</Label>
                                    <Input
                                        placeholder="e.g. Stationery from Al-Maktaba, Invoice #456"
                                        value={item.description}
                                        onChange={e => updateItem(idx, 'description', e.target.value)}
                                        className="h-9 text-sm rounded-lg"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <Button type="submit" className="w-full rounded-xl font-bold" disabled={loading}>
                        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileCheck className="h-4 w-4 mr-2" />}
                        Submit for Accountant Review
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    )
}
