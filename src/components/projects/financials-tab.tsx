"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Badge } from "@/components/ui/badge"
import { Plus, FileText, CheckCircle2, DollarSign, Clock, AlertTriangle, Building2 } from "lucide-react"
import { createMilestone, generateInvoiceFromMilestone } from "@/app/admin/finance/revenue/actions"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ProjectInvoiceLedger } from "./project-invoice-ledger"
import { VariationOrdersPanel } from "./variation-orders-panel"
import { FinancialDashboard } from "./FinancialDashboard"
import { VendorContractsPanel } from "./vendor-contracts-panel"
import { isAfter, subDays } from "date-fns"

export function FinancialsTab({ project, milestones, invoices, variationOrders = [], subContracts = [], availableVendors = [], costReport, plData, canEdit = false, canApproveFinance = false }: {
    project: any,
    milestones: any[],
    invoices: any[],
    variationOrders?: any[],
    subContracts?: any[],
    availableVendors?: any[],
    costReport?: { totalCost: number, totalHours: number, breakdown?: any[] },
    plData?: any,
    canEdit?: boolean,
    canApproveFinance?: boolean
}) {
    const [openDesign, setOpenDesign] = useState(false)
    const [openSupervision, setOpenSupervision] = useState(false)
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const designMilestones = milestones.filter(m => m.category === 'DESIGN' || !m.category)
    const supervisionMilestones = milestones.filter(m => m.category === 'SUPERVISION')

    const designTotal = designMilestones.reduce((acc, m) => acc + m.amount, 0)
    const supervisionTotal = supervisionMilestones.reduce((acc, m) => acc + m.amount, 0)

    async function handleGenerateInvoice(milestoneId: string) {
        if (!confirm("هل أنت متأكد من إنشاء فاتورة لهذه الدفعة؟")) return
        setLoading(true)
        const res = await generateInvoiceFromMilestone(milestoneId)
        setLoading(false)
        if (res.success) {
            router.refresh()
        } else {
            alert(res.error)
        }
    }

    return (
        <div className="space-y-6">
            {/* 1. Real-time P&L Dashboard */}
            {plData && (
                <section className="space-y-4">
                    <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                        <DollarSign className="h-6 w-6 text-primary" />
                        Project Profitability (ربحية المشروع)
                    </h3>
                    <FinancialDashboard data={plData} />
                </section>
            )}

            {/* 2. Operational Cost Table (Manpower) */}
            {costReport?.breakdown && costReport.breakdown.length > 0 && (
                <Card className="border-none shadow-lg bg-white/60 backdrop-blur-xl">
                    <CardHeader>
                        <CardTitle className="text-lg font-bold flex items-center gap-2 text-rose-700">
                            <Clock className="h-5 w-5" />
                            Direct Labor Costs (تكاليف العمالة المباشرة)
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">Automatically calculated based on engineer time-logs and HR hourly rates.</p>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-slate-500 bg-slate-50 uppercase font-black">
                                    <tr>
                                        <th className="px-4 py-3 rounded-tl-lg">Task / Activity</th>
                                        <th className="px-4 py-3 text-center">Hours</th>
                                        <th className="px-4 py-3 text-right rounded-tr-lg">Internal Cost (SAR)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {costReport.breakdown.slice(0, 5).map((row: any, i: number) => (
                                        <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/50">
                                            <td className="px-4 py-3 font-semibold text-slate-900">{row.taskName}</td>
                                            <td className="px-4 py-3 text-center text-slate-600">
                                                <Badge variant="outline" className="bg-white">{row.totalHours}h</Badge>
                                            </td>
                                            <td className="px-4 py-3 text-right font-black text-rose-600">{(row.totalCost || 0).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 3. DESIGN SECTION */}
                <Card className="border-none shadow-lg bg-white/60 backdrop-blur-xl">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <FileText className="h-5 w-5 text-indigo-600" />
                            Design Payments
                        </CardTitle>
                        <p className="text-xs font-bold text-indigo-600">{designTotal.toLocaleString()} SAR</p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {designMilestones.map((ms: any) => (
                            <MilestoneItem key={ms.id} ms={ms} loading={loading} onInvoice={() => handleGenerateInvoice(ms.id)} />
                        ))}
                    </CardContent>
                </Card>

                {/* 4. SUPERVISION SECTION */}
                <Card className="border-none shadow-lg bg-white/60 backdrop-blur-xl">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-amber-600" />
                            Supervision Payments
                        </CardTitle>
                        <p className="text-xs font-bold text-amber-600">{supervisionTotal.toLocaleString()} SAR</p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {supervisionMilestones.map((ms: any) => (
                            <MilestoneItem key={ms.id} ms={ms} loading={loading} onInvoice={() => handleGenerateInvoice(ms.id)} />
                        ))}
                    </CardContent>
                </Card>
            </div>

            {/* 5. Invoices History with Traffic Light Indicators */}
            <Card className="border-none shadow-lg bg-white/60 backdrop-blur-xl">
                <CardHeader>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        Collection Status (حالة التحصيل)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {invoices.map((inv: any) => {
                            const isPaid = inv.status === 'PAID';
                            const isOverdue = !isPaid && isAfter(new Date(), subDays(new Date(inv.date), -30));

                            // Traffic Light Logic
                            const statusColor = isPaid ? 'bg-emerald-500' : isOverdue ? 'bg-rose-500 animate-pulse' : 'bg-amber-500';
                            const statusLabel = isPaid ? 'Collected' : isOverdue ? 'Overdue - متأخر' : 'Pending - معلق';

                            return (
                                <div key={inv.id} className="flex justify-between items-center p-4 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all">
                                    <div className="flex items-center gap-4">
                                        {/* Traffic Light Dot */}
                                        <div className={`h-3 w-3 rounded-full ${statusColor}`} title={statusLabel} />

                                        <div>
                                            <p className="font-black text-sm text-slate-900">{inv.invoiceNumber}</p>
                                            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {new Date(inv.date).toLocaleDateString()}
                                                {isOverdue && <span className="text-rose-600 font-bold ml-1">Critical</span>}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <p className="font-black text-slate-900">{(inv.totalAmount || inv.baseAmount || 0).toLocaleString()} <span className="text-[10px] font-normal text-muted-foreground">SAR</span></p>
                                            <p className="text-[10px] text-muted-foreground">{inv.isLocked ? "🔒 Locked (ZATCA)" : "Draft"}</p>
                                        </div>
                                        <Button asChild variant="ghost" size="sm" className="h-9 px-4 rounded-xl text-primary hover:bg-primary/5">
                                            <Link href={`/admin/finance/invoices/${inv.id}`}>
                                                Details ↗
                                            </Link>
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                        {invoices.length === 0 && <p className="text-center text-muted-foreground py-8 border-2 border-dashed rounded-3xl text-sm">No invoices found for this project.</p>}
                    </div>
                </CardContent>
            </Card>

            {/* 6. Invoice Ledger (NEW) */}
            <section className="space-y-4">
                <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <FileText className="h-6 w-6 text-indigo-500" />
                    Invoice Ledger (سجل الفواتير)
                </h3>
                <ProjectInvoiceLedger
                    projectId={project.id}
                    invoices={invoices}
                    contractValue={project.contractValue || 0}
                    canEdit={canEdit}
                />
            </section>

            {/* 7. Variation Orders (NEW) */}
            <section className="space-y-4">
                <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <AlertTriangle className="h-6 w-6 text-amber-500" />
                    Variation Orders (أوامر التغيير)
                </h3>
                <VariationOrdersPanel
                    projectId={project.id}
                    variationOrders={variationOrders}
                    baseContractValue={project.contractValue || 0}
                    canApprove={canEdit}
                />
            </section>

            {/* 8. Sub-Consultants & Vendor Payments */}
            <section className="space-y-4">
                <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <Building2 className="h-6 w-6 text-orange-500" />
                    Sub-Consultants & Vendors (مستشارون من الباطن)
                </h3>
                <VendorContractsPanel
                    projectId={project.id}
                    subContracts={subContracts}
                    canEdit={canEdit}
                    canApproveFinance={canApproveFinance}
                />
            </section>
        </div>
    )
}

function MilestoneItem({ ms, loading, onInvoice }: { ms: any, loading: boolean, onInvoice: () => void }) {
    return (
        <div className="flex justify-between items-center p-3 bg-white/40 rounded-xl border border-white/20 hover:bg-white transition-all group">
            <div className="flex items-center gap-3">
                <div className={`h-2 w-2 rounded-full ${ms.status === 'INVOICED' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                <div>
                    <h4 className="font-bold text-sm text-slate-800">{ms.name}</h4>
                    <p className="text-[10px] text-muted-foreground">{ms.percentage}% Payment</p>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <p className="font-bold text-sm text-slate-900">{ms.amount?.toLocaleString() || '0'} SAR</p>
                {ms.status === 'PENDING' && (
                    <Button
                        size="sm"
                        variant="ghost"
                        disabled={loading}
                        onClick={onInvoice}
                        className="h-7 text-[10px] font-bold text-emerald-600 hover:bg-emerald-50 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        Issue Invoice
                    </Button>
                )}
            </div>
        </div>
    )
}
