"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ShieldCheck, Loader2, ExternalLink, Image as ImageIcon } from "lucide-react"
import { toast } from "sonner"
import { closeCustody } from "@/app/admin/hr/petty-cash/actions"
import { useRouter } from "next/navigation"
import { format } from "date-fns"

interface SettlementItem {
    id: string
    amount: number
    description?: string | null
    invoicePhotoUrl?: string | null
    project?: { name: string } | null
    createdAt: string
}

interface Props {
    requestId: string
    employeeName: string
    custodyAmount: number
    projectName: string
    settlementItems: SettlementItem[]
}

export function CustodyCloseDialog({ requestId, employeeName, custodyAmount, projectName, settlementItems }: Props) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [notes, setNotes] = useState("")
    const router = useRouter()

    const totalSettled = settlementItems.reduce((s, i) => s + i.amount, 0)
    const difference = custodyAmount - totalSettled

    async function handleClose() {
        setLoading(true)
        const res = await closeCustody(requestId, notes)
        setLoading(false)
        if ((res as any).success) {
            toast.success("Custody closed. Clearance certificate is ready.")
            setOpen(false)
            router.refresh()
        } else {
            toast.error((res as any).error || "Failed to close custody")
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm"
                    className="h-8 text-xs rounded-xl bg-emerald-600 hover:bg-emerald-700 gap-1.5 shadow-sm">
                    <ShieldCheck className="h-3.5 w-3.5" /> Review & Close
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] border-none shadow-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="font-black text-lg flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                            <ShieldCheck className="h-4 w-4" />
                        </div>
                        Accountant Audit — Close Custody
                    </DialogTitle>
                    <p className="text-sm text-slate-500 mt-1">
                        Review the employee's submitted invoices, then close the custody to generate a clearance certificate.
                    </p>
                </DialogHeader>

                {/* Custody summary */}
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { label: 'Employee', value: employeeName },
                        { label: 'Project', value: projectName },
                        { label: 'Custody Amt', value: `SAR ${custodyAmount.toLocaleString()}` },
                    ].map(({ label, value }) => (
                        <div key={label} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                            <p className="text-sm font-black text-slate-900">{value}</p>
                        </div>
                    ))}
                </div>

                {/* Settlement items audit table */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label className="text-sm font-black text-slate-700">
                            Submitted Invoices ({settlementItems.length})
                        </Label>
                        <div className={`text-xs font-black px-2 py-1 rounded-full ${Math.abs(difference) < 1
                            ? 'bg-emerald-100 text-emerald-700'
                            : difference > 0
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                            {Math.abs(difference) < 1
                                ? '✓ Fully Settled'
                                : difference > 0
                                    ? `SAR ${difference.toFixed(2)} Short`
                                    : `SAR ${Math.abs(difference).toFixed(2)} Excess`
                            }
                        </div>
                    </div>

                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-3 py-2 text-left text-[10px] font-black text-slate-400 uppercase">#</th>
                                    <th className="px-3 py-2 text-left text-[10px] font-black text-slate-400 uppercase">Description</th>
                                    <th className="px-3 py-2 text-right text-[10px] font-black text-slate-400 uppercase">Amount</th>
                                    <th className="px-3 py-2 text-center text-[10px] font-black text-slate-400 uppercase">Proof</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {settlementItems.map((item, idx) => (
                                    <tr key={item.id} className="hover:bg-slate-50/50">
                                        <td className="px-3 py-2.5 text-slate-500 font-medium">{idx + 1}</td>
                                        <td className="px-3 py-2.5">
                                            <p className="font-medium text-slate-900 text-xs">{item.description || '—'}</p>
                                            <p className="text-[10px] text-slate-400">{format(new Date(item.createdAt), 'dd MMM yyyy')}</p>
                                        </td>
                                        <td className="px-3 py-2.5 text-right font-black text-slate-900">
                                            {item.amount.toLocaleString()} SAR
                                        </td>
                                        <td className="px-3 py-2.5 text-center">
                                            {item.invoicePhotoUrl ? (
                                                <a href={item.invoicePhotoUrl} target="_blank" rel="noreferrer"
                                                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-bold">
                                                    <ImageIcon className="h-3 w-3" /> View
                                                </a>
                                            ) : (
                                                <span className="text-slate-300 text-xs">—</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                <tr className="bg-slate-50 border-t-2 border-slate-200">
                                    <td colSpan={2} className="px-3 py-2 text-right text-xs font-black text-slate-500 uppercase">Total Settled</td>
                                    <td className="px-3 py-2 text-right font-black text-slate-900">{totalSettled.toLocaleString()} SAR</td>
                                    <td />
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Accountant notes */}
                <div className="space-y-1.5">
                    <Label className="text-sm font-bold text-slate-700">Closure Notes (optional)</Label>
                    <Textarea
                        placeholder="e.g. All invoices verified. Minor discrepancy of SAR 5 acknowledged."
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        className="rounded-xl text-sm resize-none"
                        rows={2}
                    />
                </div>

                {/* No-auto-expense notice */}
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-800 leading-relaxed">
                    <strong>Reminder:</strong> Closing this custody will NOT automatically create expense records.
                    You must manually create the formal expense entries in the <strong>Finance Hub → Expenses tab</strong> using the archived invoices above.
                </div>

                <div className="flex gap-3">
                    <Button variant="outline" className="flex-1 rounded-xl font-bold" onClick={() => setOpen(false)}>
                        Cancel
                    </Button>
                    <Button
                        className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-bold gap-2"
                        onClick={handleClose}
                        disabled={loading}
                    >
                        {loading
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <ShieldCheck className="h-4 w-4" />
                        }
                        Close & Issue Clearance
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
