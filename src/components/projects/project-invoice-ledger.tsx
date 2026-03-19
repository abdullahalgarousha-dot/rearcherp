"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, FileText, ExternalLink, CheckCircle2, Clock, AlertTriangle, XCircle, DollarSign, Loader2, Trash2 } from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"
import { createProjectInvoice, updateInvoiceStatus, deleteInvoice } from "@/app/admin/projects/[projectId]/finance-actions"
import { useRouter } from "next/navigation"

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
    ISSUED: { label: "Issued", color: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock },
    PAID: { label: "Paid", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
    OVERDUE: { label: "Overdue", color: "bg-red-100 text-red-700 border-red-200", icon: AlertTriangle },
    CANCELLED: { label: "Cancelled", color: "bg-slate-100 text-slate-500 border-slate-200", icon: XCircle },
}

interface Props {
    projectId: string
    invoices: any[]
    contractValue: number
    canEdit: boolean
}

export function ProjectInvoiceLedger({ projectId, invoices, contractValue, canEdit }: Props) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const totalBilled = invoices.reduce((s, i) => s + i.totalAmount, 0)
    const totalPaid = invoices.filter(i => i.status === 'PAID').reduce((s, i) => s + i.totalAmount, 0)
    const totalPending = invoices.filter(i => i.status === 'ISSUED').reduce((s, i) => s + i.totalAmount, 0)
    const billingPercent = contractValue > 0 ? Math.min((totalBilled / contractValue) * 100, 100) : 0

    async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        const fd = new FormData(e.currentTarget)
        const res = await createProjectInvoice(projectId, {
            invoiceNumber: fd.get("invoiceNumber") as string,
            description: fd.get("description") as string,
            baseAmount: parseFloat(fd.get("baseAmount") as string),
            dueDate: fd.get("dueDate") as string,
            date: fd.get("date") as string,
        })
        setLoading(false)
        if (res.success) {
            toast.success("Invoice created successfully")
            setOpen(false)
            router.refresh()
        } else {
            toast.error(res.error)
        }
    }

    async function handleMarkPaid(id: string) {
        const res = await updateInvoiceStatus(id, 'PAID')
        if (res.success) { toast.success("Marked as Paid"); router.refresh() }
        else toast.error(res.error)
    }

    async function handleDelete(id: string) {
        if (!confirm("Delete this invoice permanently?")) return
        const res = await deleteInvoice(id)
        if (res.success) { toast.success("Invoice deleted"); router.refresh() }
        else toast.error(res.error)
    }

    return (
        <div className="space-y-4">
            {/* Summary KPI Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: "Contract Value", val: contractValue, color: "text-slate-900" },
                    { label: "Total Billed", val: totalBilled, color: "text-indigo-700" },
                    { label: "Collected", val: totalPaid, color: "text-emerald-700" },
                    { label: "Outstanding", val: totalPending, color: "text-amber-700" },
                ].map(({ label, val, color }) => (
                    <Card key={label} className="border-none shadow-sm bg-white">
                        <CardContent className="p-4">
                            <p className="text-xs text-muted-foreground uppercase font-bold">{label}</p>
                            <p className={`text-xl font-black ${color}`}>
                                {val.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                <span className="text-xs font-normal text-muted-foreground ml-1">SAR</span>
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Billing Progress */}
            <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
                <div className="flex justify-between mb-2">
                    <span className="text-xs font-bold text-slate-600">Billing Progress</span>
                    <span className="text-xs font-bold text-indigo-700">{billingPercent.toFixed(1)}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${billingPercent}%` }} />
                </div>
            </div>

            {/* Header + Add Button */}
            <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-indigo-500" />
                    Invoice Ledger
                </h3>
                {canEdit && (
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm" className="h-8 gap-2 rounded-lg">
                                <Plus className="h-3.5 w-3.5" /> Add Invoice
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px] border-none shadow-2xl">
                            <DialogHeader>
                                <DialogTitle className="font-black flex items-center gap-2">
                                    <DollarSign className="h-5 w-5 text-indigo-500" />
                                    Create New Invoice
                                </DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleCreate} className="space-y-4 pt-2">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label>Invoice Number</Label>
                                        <Input name="invoiceNumber" placeholder="INV-001" required />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>Invoice Date</Label>
                                        <Input name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} required />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Description</Label>
                                    <Input name="description" placeholder="e.g. Design Phase 1 — 50% Milestone" required />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label>Amount (excl. VAT)</Label>
                                        <Input name="baseAmount" type="number" step="0.01" placeholder="0.00" required />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>Due Date</Label>
                                        <Input name="dueDate" type="date" />
                                    </div>
                                </div>
                                <p className="text-[10px] text-muted-foreground">VAT (15%) will be automatically calculated and added.</p>
                                <Button type="submit" className="w-full" disabled={loading}>
                                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                    {loading ? "Creating..." : "Create Invoice"}
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            {/* Invoice Table */}
            {invoices.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                    <FileText className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">No invoices yet. Add your first invoice.</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    {["Invoice #", "Description", "Amount (SAR)", "VAT (SAR)", "Total (SAR)", "Date", "Due Date", "Status", ""].map(h => (
                                        <th key={h} className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {invoices.map((inv) => {
                                    const cfg = STATUS_CONFIG[inv.status] || STATUS_CONFIG.ISSUED
                                    const Icon = cfg.icon
                                    const isOverdue = inv.status === 'ISSUED' && inv.dueDate && new Date(inv.dueDate) < new Date()
                                    return (
                                        <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-4 py-3 font-mono font-bold text-slate-900">{inv.invoiceNumber}</td>
                                            <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate">{inv.description || "—"}</td>
                                            <td className="px-4 py-3 font-medium">{inv.baseAmount.toLocaleString()}</td>
                                            <td className="px-4 py-3 text-amber-600">{inv.vatAmount.toLocaleString()}</td>
                                            <td className="px-4 py-3 font-bold text-slate-900">{inv.totalAmount.toLocaleString()}</td>
                                            <td className="px-4 py-3 text-slate-500">{format(new Date(inv.date), 'dd/MM/yy')}</td>
                                            <td className="px-4 py-3">
                                                {inv.dueDate ? (
                                                    <span className={isOverdue ? 'text-red-600 font-bold' : 'text-slate-500'}>
                                                        {format(new Date(inv.dueDate), 'dd/MM/yy')}
                                                    </span>
                                                ) : "—"}
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge className={`border text-xs gap-1 ${isOverdue ? 'bg-red-100 text-red-700 border-red-200' : cfg.color}`}>
                                                    <Icon className="h-3 w-3" />
                                                    {isOverdue ? "Overdue" : cfg.label}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex gap-1">
                                                    {canEdit && inv.status === 'ISSUED' && (
                                                        <Button size="sm" variant="ghost" onClick={() => handleMarkPaid(inv.id)}
                                                            className="h-7 text-xs text-emerald-600 hover:bg-emerald-50">
                                                            Mark Paid
                                                        </Button>
                                                    )}
                                                    {inv.driveFileId && (
                                                        <a href={`https://drive.google.com/file/d/${inv.driveFileId}/view`} target="_blank" rel="noopener noreferrer">
                                                            <Button size="sm" variant="ghost" className="h-7 text-xs text-blue-600 hover:bg-blue-50 gap-1">
                                                                <ExternalLink className="h-3 w-3" /> Drive
                                                            </Button>
                                                        </a>
                                                    )}
                                                    {canEdit && !inv.isLocked && (
                                                        <Button size="sm" variant="ghost" onClick={() => handleDelete(inv.id)}
                                                            className="h-7 text-xs text-red-500 hover:bg-red-50">
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}
