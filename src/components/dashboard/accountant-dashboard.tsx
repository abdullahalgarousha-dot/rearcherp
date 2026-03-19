"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { DollarSign, FileStack, Receipt, TrendingDown, TrendingUp } from "lucide-react"

type AccountantDashboardProps = {
    pendingInvoices: any[]
    projectsHealth: any[]
    expenses: any[]
    user: any
}

export function AccountantDashboard({ pendingInvoices, projectsHealth, expenses, user }: AccountantDashboardProps) {

    // Simple aggregations
    const totalPendingAmount = pendingInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    const totalVATAwaiting = pendingInvoices.reduce((sum, inv) => sum + (inv.vatAmount || 0), 0);

    // Expenses (Last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentExpenses = expenses.filter(e => new Date(e.date) >= thirtyDaysAgo);
    const totalRecentExpenses = recentExpenses.reduce((sum, e) => sum + (e.totalAmount || 0), 0);

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-gradient-to-br from-emerald-50 to-white border-emerald-100 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-bold text-emerald-800">Pending Receivables</CardTitle>
                        <DollarSign className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-emerald-900">{totalPendingAmount.toLocaleString()} SAR</div>
                        <p className="text-xs text-emerald-600 mt-1 font-medium">{pendingInvoices.length} unpaid invoices</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-indigo-50 to-white border-indigo-100 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-bold text-indigo-800">VAT Expected</CardTitle>
                        <FileStack className="h-4 w-4 text-indigo-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-indigo-900">{totalVATAwaiting.toLocaleString()} SAR</div>
                        <p className="text-xs text-indigo-600 mt-1 font-medium">Standard 15% calculation</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-rose-50 to-white border-rose-100 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-bold text-rose-800">30-Day Expenses</CardTitle>
                        <TrendingDown className="h-4 w-4 text-rose-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-rose-900">{totalRecentExpenses.toLocaleString()} SAR</div>
                        <p className="text-xs text-rose-600 mt-1 font-medium">{recentExpenses.length} transactions logged</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-cyan-50 to-white border-cyan-100 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-bold text-cyan-800">Active Contracts</CardTitle>
                        <Receipt className="h-4 w-4 text-cyan-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-cyan-900">{projectsHealth.length}</div>
                        <p className="text-xs text-cyan-600 mt-1 font-medium">Projects generating revenue</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="shadow-lg border-slate-200">
                    <CardHeader className="bg-slate-50 border-b border-slate-100 rounded-t-xl">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <TrendingUp className="h-5 w-5 text-emerald-500" />
                            Outstanding Invoices (Action Required)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {pendingInvoices.length === 0 ? (
                            <div className="p-8 text-center text-emerald-500 font-medium tracking-wide">All invoices paid! Great job!</div>
                        ) : (
                            <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                                {pendingInvoices.map((inv) => {
                                    const isLate = new Date(inv.date) < new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days overdue trigger
                                    return (
                                        <div key={inv.id} className="p-4 hover:bg-slate-50 transition-colors flex justify-between items-center group">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h4 className="font-bold text-slate-900">{inv.invoiceNumber || 'DRAFT'}</h4>
                                                    <Badge variant={inv.status === 'ISSUED' ? 'secondary' : 'default'} className="text-[10px] uppercase font-black tracking-widest">
                                                        {inv.status}
                                                    </Badge>
                                                </div>
                                                <p className="text-xs text-slate-500 line-clamp-1">{inv.project?.name}</p>
                                            </div>
                                            <div className="text-right flex flex-col items-end gap-1">
                                                <span className="font-black text-slate-900">
                                                    {inv.totalAmount?.toLocaleString()} SAR
                                                </span>
                                                <span className={`text-[10px] uppercase font-bold ${isLate ? "text-rose-600" : "text-slate-400"}`}>
                                                    Issued: {new Date(inv.date).toLocaleDateString()}
                                                </span>
                                                <Link href={`/admin/finance/invoices/${inv.id}`}>
                                                    <Button variant="link" size="sm" className="h-4 p-0 text-xs font-bold text-emerald-600">Review →</Button>
                                                </Link>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="shadow-lg border-slate-200">
                    <CardHeader className="bg-slate-50 border-b border-slate-100 rounded-t-xl">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Receipt className="h-5 w-5 text-slate-500" />
                            Project Budget Variance
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {projectsHealth.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 font-medium">No project financial data available.</div>
                        ) : (
                            <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                                {projectsHealth.map((project) => {
                                    const totalInvoiced = project.invoices?.reduce((sum: number, i: any) => sum + (i.baseAmount || 0), 0) || 0;
                                    const budget = project.contractValue || 0;
                                    const invoicedPercent = budget > 0 ? Math.min(100, Math.round((totalInvoiced / budget) * 100)) : 0;

                                    return (
                                        <div key={project.id} className="p-5 hover:bg-slate-50 transition-colors">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <h4 className="font-bold text-slate-900">{project.code}</h4>
                                                    <p className="text-xs text-slate-500 mt-1 line-clamp-1">{project.name}</p>
                                                </div>
                                                <span className="text-sm font-black text-slate-800 tracking-tight">
                                                    {budget.toLocaleString()} SAR
                                                </span>
                                            </div>

                                            <div className="space-y-2">
                                                <div className="flex justify-between text-xs mb-1 font-bold">
                                                    <span className="text-slate-500">Invoiced vs Budget</span>
                                                    <span className="text-indigo-600">{invoicedPercent}%</span>
                                                </div>
                                                <div className="w-full bg-slate-100 rounded-full h-2">
                                                    <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${invoicedPercent}%` }}></div>
                                                </div>
                                                <div className="text-[10px] text-right text-slate-400 font-bold uppercase tracking-wider">
                                                    Remaining to invoice: {(budget - totalInvoiced).toLocaleString()} SAR
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
