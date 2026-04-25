"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, DollarSign, Clock, AlertTriangle, Building2 } from "lucide-react"
import Link from "next/link"
import { ProjectInvoiceLedger } from "./project-invoice-ledger"
import { VariationOrdersPanel } from "./variation-orders-panel"
import { FinancialDashboard } from "./FinancialDashboard"
import { VendorContractsPanel } from "./vendor-contracts-panel"
import { isAfter, subDays } from "date-fns"

export function FinancialsTab({ project, invoices, variationOrders = [], subContracts = [], availableVendors = [], costReport, plData, laborCost, canEdit = false, canApproveFinance = false }: {
    project: any,
    invoices: any[],
    variationOrders?: any[],
    subContracts?: any[],
    availableVendors?: any[],
    costReport?: { totalCost: number, totalHours: number, breakdown?: any[] },
    plData?: any,
    laborCost?: { totalHours: number, totalCost: number },
    canEdit?: boolean,
    canApproveFinance?: boolean
}) {
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

            {/* LIVE COST CENTER — Internal Labor */}
            {laborCost && (
                <Card className="border-none shadow-lg bg-gradient-to-br from-rose-50/60 to-white backdrop-blur-xl">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg font-bold flex items-center gap-2 text-rose-700">
                            <Clock className="h-5 w-5" />
                            Internal Labor Cost (تكلفة العمالة الداخلية)
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">
                            Based on time logs × engineer hourly rates from HR profiles.
                        </p>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-white rounded-2xl p-4 border border-rose-100 shadow-sm text-center">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Logged Hours</p>
                                <p className="text-3xl font-black text-slate-900">{laborCost.totalHours.toFixed(1)}</p>
                                <p className="text-xs text-slate-400">hrs</p>
                            </div>
                            <div className="bg-white rounded-2xl p-4 border border-rose-100 shadow-sm text-center">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Labor Cost</p>
                                <p className="text-3xl font-black text-rose-700">{Math.round(laborCost.totalCost).toLocaleString()}</p>
                                <p className="text-xs text-slate-400">SAR</p>
                            </div>
                            <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-sm text-center">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Gross Margin</p>
                                {(() => {
                                    const margin = (project.contractValue || 0) - laborCost.totalCost
                                    const pct = project.contractValue > 0
                                        ? Math.round((margin / project.contractValue) * 100)
                                        : 0
                                    return (
                                        <>
                                            <p className={`text-3xl font-black ${margin >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                                                {pct}%
                                            </p>
                                            <p className="text-xs text-slate-400">
                                                {Math.round(margin).toLocaleString()} SAR
                                            </p>
                                        </>
                                    )
                                })()}
                            </div>
                        </div>
                    </CardContent>
                </Card>
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

            {/* 3. Invoices History with Traffic Light Indicators */}
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
                    serviceType={project.serviceType}
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

