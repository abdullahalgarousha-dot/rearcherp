"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, CheckCircle2, Clock, XCircle, TrendingUp, FileText, Loader2, ArrowRight } from "lucide-react"
import { toast } from "sonner"
import { createVariationOrder, approveVariationOrder } from "@/app/admin/projects/[projectId]/finance-actions"
import { useRouter } from "next/navigation"

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
    PENDING: { label: "Pending Approval", color: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock },
    APPROVED: { label: "Approved", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
    REJECTED: { label: "Rejected", color: "bg-red-100 text-red-700 border-red-200", icon: XCircle },
}

interface Props {
    projectId: string
    variationOrders: any[]
    baseContractValue: number
    canApprove: boolean
}

export function VariationOrdersPanel({ projectId, variationOrders, baseContractValue, canApprove }: Props) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const approvedVOs = variationOrders.filter(v => v.status === 'APPROVED')
    const approvedTotal = approvedVOs.reduce((s, v) => s + v.amount, 0)
    const effectiveContractValue = baseContractValue + approvedTotal
    const pendingVOs = variationOrders.filter(v => v.status === 'PENDING')

    async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        const fd = new FormData(e.currentTarget)
        const res = await createVariationOrder(projectId, {
            title: fd.get("title") as string,
            description: fd.get("description") as string,
            amount: parseFloat(fd.get("amount") as string),
            approvalDocUrl: fd.get("approvalDocUrl") as string || undefined,
        })
        setLoading(false)
        if (res.success) {
            toast.success("Variation Order created")
            setOpen(false)
            router.refresh()
        } else {
            toast.error(res.error)
        }
    }

    async function handleApprove(id: string, approve: boolean) {
        const res = await approveVariationOrder(id, approve)
        if (res.success) {
            toast.success(approve ? "VO Approved — Contract value updated" : "VO Rejected")
            router.refresh()
        } else {
            toast.error(res.error)
        }
    }

    return (
        <div className="space-y-4">
            {/* Contract Value Evolution */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6">
                <p className="text-xs text-slate-400 uppercase font-bold mb-4">Effective Contract Value</p>
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="text-center">
                        <p className="text-[10px] text-slate-500 uppercase">Base</p>
                        <p className="text-lg font-bold">{baseContractValue.toLocaleString()}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-500" />
                    {approvedVOs.map((vo) => (
                        <div key={vo.id} className="text-center">
                            <p className="text-[10px] text-emerald-400 uppercase">+ VO</p>
                            <p className="text-lg font-bold text-emerald-400">+{vo.amount.toLocaleString()}</p>
                        </div>
                    ))}
                    {approvedVOs.length > 0 && <ArrowRight className="h-4 w-4 text-slate-500" />}
                    <div className="text-center bg-white/10 px-4 py-2 rounded-xl">
                        <p className="text-[10px] text-slate-300 uppercase">Total Contract</p>
                        <p className="text-2xl font-black">{effectiveContractValue.toLocaleString()}
                            <span className="text-sm font-normal text-slate-400 ml-1">SAR</span>
                        </p>
                    </div>
                </div>
                {approvedTotal > 0 && (
                    <p className="text-xs text-emerald-400 mt-3 flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {((approvedTotal / baseContractValue) * 100).toFixed(1)}% increase via {approvedVOs.length} approved VO(s)
                    </p>
                )}
            </div>

            {/* Pending Alert */}
            {pendingVOs.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
                    <Clock className="h-5 w-5 text-amber-500 flex-shrink-0" />
                    <p className="text-sm font-medium text-amber-800">
                        {pendingVOs.length} Variation Order(s) pending customer approval
                    </p>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900">Variation Orders</h3>
                {canApprove && (
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm" className="h-8 gap-2 rounded-lg bg-amber-500 hover:bg-amber-600">
                                <Plus className="h-3.5 w-3.5" /> Add VO
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px] border-none shadow-2xl">
                            <DialogHeader>
                                <DialogTitle className="font-black">New Variation Order</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleCreate} className="space-y-4 pt-2">
                                <div className="space-y-1.5">
                                    <Label>Title</Label>
                                    <Input name="title" placeholder="e.g. Additional Meeting Room Design" required />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Description</Label>
                                    <Textarea name="description" placeholder="Detailed scope of work..." className="rounded-xl" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Amount (SAR)</Label>
                                    <Input name="amount" type="number" step="0.01" placeholder="0.00" required />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Customer Approval Doc URL (optional)</Label>
                                    <Input name="approvalDocUrl" type="url" placeholder="https://drive.google.com/..." />
                                </div>
                                <Button type="submit" className="w-full bg-amber-500 hover:bg-amber-600" disabled={loading}>
                                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                    Create Variation Order
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            {/* VO List */}
            {variationOrders.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                    <FileText className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">No Variation Orders yet.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {variationOrders.map((vo) => {
                        const cfg = STATUS_CONFIG[vo.status] || STATUS_CONFIG.PENDING
                        const Icon = cfg.icon
                        return (
                            <div key={vo.id} className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <p className="font-bold text-slate-900">{vo.title}</p>
                                            <Badge className={`border text-xs gap-1 ${cfg.color}`}>
                                                <Icon className="h-3 w-3" />
                                                {cfg.label}
                                            </Badge>
                                        </div>
                                        {vo.description && <p className="text-xs text-slate-500 mb-2">{vo.description}</p>}
                                        <div className="flex items-center gap-4 text-xs text-slate-500">
                                            <span className="font-bold text-slate-900 text-sm">
                                                +{vo.amount.toLocaleString()} SAR
                                            </span>
                                            {vo.approvalDate && <span>Approved: {new Date(vo.approvalDate).toLocaleDateString()}</span>}
                                            {vo.approvalDocUrl && (
                                                <a href={vo.approvalDocUrl} target="_blank" rel="noopener noreferrer"
                                                    className="text-blue-600 hover:underline flex items-center gap-1">
                                                    <FileText className="h-3 w-3" /> Approval Doc
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                    {canApprove && vo.status === 'PENDING' && (
                                        <div className="flex gap-2 flex-shrink-0">
                                            <Button size="sm" variant="outline"
                                                className="h-8 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                                onClick={() => handleApprove(vo.id, true)}>
                                                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                                            </Button>
                                            <Button size="sm" variant="outline"
                                                className="h-8 text-xs border-red-200 text-red-600 hover:bg-red-50"
                                                onClick={() => handleApprove(vo.id, false)}>
                                                <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
