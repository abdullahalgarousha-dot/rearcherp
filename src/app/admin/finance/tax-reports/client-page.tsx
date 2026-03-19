'use client'

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import { DateRange } from "react-day-picker"
import { getTaxReports } from "./actions"
import { Loader2, TrendingUp, TrendingDown, Scale } from "lucide-react"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"

interface TaxReportsClientProps {
    initialData: {
        invoices: any[]
        expenses: any[]
        totalRevenue: number
        totalSalesVat: number
        totalPurchaseVat: number
        netVatLiability: number
        grandTotal: number
        totalVat: number
    }
    initialDate: DateRange
    currentYear?: number
    currentQuarter?: number
}

const QUARTERS = [
    { label: 'Q1', months: 'Jan – Mar', q: 1 },
    { label: 'Q2', months: 'Apr – Jun', q: 2 },
    { label: 'Q3', months: 'Jul – Sep', q: 3 },
    { label: 'Q4', months: 'Oct – Dec', q: 4 },
]

export function TaxReportsClient({ initialData, initialDate, currentYear, currentQuarter }: TaxReportsClientProps) {
    const [date, setDate] = useState<DateRange | undefined>(initialDate)
    const [data, setData] = useState(initialData)
    const [loading, setLoading] = useState(false)
    const [activeQuarter, setActiveQuarter] = useState<number | null>(currentQuarter || null)
    const year = currentYear || new Date().getFullYear()

    async function fetchData(from: Date, to: Date) {
        setLoading(true)
        try {
            const result = await getTaxReports(from, to)
            setData(result as any)
        } catch (error) {
            console.error(error)
        }
        setLoading(false)
    }

    async function handleQuarterClick(q: number) {
        setActiveQuarter(q)
        const startMonth = (q - 1) * 3
        const from = new Date(year, startMonth, 1)
        const to = new Date(year, startMonth + 3, 0, 23, 59, 59)
        setDate({ from, to })
        await fetchData(from, to)
    }

    async function handleCustomRange() {
        if (!date?.from || !date?.to) return
        setActiveQuarter(null)
        await fetchData(date.from, date.to)
    }

    const salesVat = data.totalSalesVat ?? data.totalVat ?? 0
    const purchaseVat = data.totalPurchaseVat ?? 0
    const netLiability = data.netVatLiability ?? (salesVat - purchaseVat)

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900">ZATCA Tax / VAT Reports</h1>
                    <p className="text-sm text-slate-500 mt-1">Quarterly VAT reconciliation — Sales VAT vs. Purchase VAT</p>
                </div>
                <div className="flex items-center gap-2">
                    <DatePickerWithRange date={date} setDate={setDate} />
                    <button
                        onClick={handleCustomRange}
                        disabled={loading || !date?.from || !date?.to}
                        className="h-10 px-4 bg-primary text-white font-bold rounded-md hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center min-w-[100px]"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
                    </button>
                </div>
            </div>

            {/* Quarter Selector */}
            <div className="flex gap-2 flex-wrap">
                {QUARTERS.map(({ label, months, q }) => (
                    <button
                        key={q}
                        onClick={() => handleQuarterClick(q)}
                        disabled={loading}
                        className={`flex flex-col items-center px-6 py-3 rounded-2xl border-2 font-black text-sm transition-all ${activeQuarter === q
                            ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-primary/40 hover:bg-primary/5'
                            }`}
                    >
                        <span className="text-lg leading-none">{label}</span>
                        <span className={`text-[10px] font-medium mt-0.5 ${activeQuarter === q ? 'text-white/70' : 'text-slate-400'}`}>
                            {months}
                        </span>
                        <span className={`text-[9px] font-bold uppercase tracking-widest ${activeQuarter === q ? 'text-white/60' : 'text-slate-300'}`}>
                            {year}
                        </span>
                    </button>
                ))}
            </div>

            {/* VAT Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Sales VAT (Output VAT) */}
                <div className="relative overflow-hidden rounded-2xl bg-[#1e293b] p-6 shadow-xl">
                    <TrendingUp className="absolute right-5 top-5 h-8 w-8 text-emerald-500/20" />
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-2">Output VAT (Sales)</p>
                    <p className="text-3xl font-black text-white leading-none">
                        {salesVat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-white/40 mt-1 font-medium">SAR · Charged to clients</p>
                    <div className="mt-3 text-[10px] text-white/30 font-bold">
                        Revenue (excl. VAT): SAR {(data.totalRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                </div>

                {/* Purchase VAT (Input VAT) */}
                <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
                    <TrendingDown className="absolute right-5 top-5 h-8 w-8 text-rose-400/30" />
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Input VAT (Purchases)</p>
                    <p className="text-3xl font-black text-rose-600 leading-none">
                        {purchaseVat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-slate-400 mt-1 font-medium">SAR · Recoverable from ZATCA</p>
                    <div className="mt-3 text-[10px] text-slate-400 font-bold">
                        {data.expenses?.length || 0} tax-recoverable expense(s)
                    </div>
                </div>

                {/* Net VAT Liability */}
                <div className={`relative overflow-hidden rounded-2xl p-6 shadow-sm border ${netLiability >= 0 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
                    <Scale className={`absolute right-5 top-5 h-8 w-8 ${netLiability >= 0 ? 'text-amber-400/40' : 'text-emerald-400/40'}`} />
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">Net VAT Liability</p>
                    <p className={`text-3xl font-black leading-none ${netLiability >= 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                        {netLiability.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 font-medium">SAR · {netLiability >= 0 ? 'Payable to ZATCA' : 'Refundable from ZATCA'}</p>
                    <div className="mt-3 flex items-center gap-1.5">
                        <Badge className={`text-[9px] font-black ${netLiability >= 0 ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-emerald-100 text-emerald-800 border-emerald-200'}`}>
                            ✓ ZATCA Compliant
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Invoices Table */}
            <Card className="shadow-lg border-white/20 bg-white/60 backdrop-blur-xl">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-emerald-500" /> Output VAT — Issued Invoices
                    </CardTitle>
                </CardHeader>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-500">
                        <thead className="text-[10px] text-slate-400 uppercase bg-slate-50/50">
                            <tr>
                                <th className="px-6 py-3 font-black tracking-wider">Date</th>
                                <th className="px-6 py-3 font-black tracking-wider">Invoice / Project</th>
                                <th className="px-6 py-3 font-black tracking-wider text-right">Base Amount</th>
                                <th className="px-6 py-3 font-black tracking-wider text-right">Output VAT (15%)</th>
                                <th className="px-6 py-3 font-black tracking-wider text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {data.invoices.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-10 text-center text-slate-400">No invoices found for this period.</td></tr>
                            ) : (
                                data.invoices.map((inv: any) => (
                                    <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-3 whitespace-nowrap font-medium text-slate-900">
                                            {format(new Date(inv.date), 'dd MMM yyyy')}
                                        </td>
                                        <td className="px-6 py-3">
                                            <div className="font-bold text-slate-900">{inv.invoiceNumber || 'Manual'}</div>
                                            <div className="text-[10px] text-slate-400 uppercase">{inv.project?.name || 'General'}</div>
                                        </td>
                                        <td className="px-6 py-3 text-right tabular-nums font-medium text-slate-900">
                                            {inv.baseAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-3 text-right tabular-nums font-bold text-emerald-600">
                                            {inv.vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-3 text-right tabular-nums font-black text-slate-900">
                                            {inv.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Expenses Table (Input VAT) */}
            {(data.expenses?.length > 0) && (
                <Card className="shadow-lg border-white/20 bg-white/60 backdrop-blur-xl">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                            <TrendingDown className="h-4 w-4 text-rose-500" /> Input VAT — Recoverable Expenses
                        </CardTitle>
                    </CardHeader>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-slate-500">
                            <thead className="text-[10px] text-slate-400 uppercase bg-slate-50/50">
                                <tr>
                                    <th className="px-6 py-3 font-black tracking-wider">Date</th>
                                    <th className="px-6 py-3 font-black tracking-wider">Description / Project</th>
                                    <th className="px-6 py-3 font-black tracking-wider">Category</th>
                                    <th className="px-6 py-3 font-black tracking-wider text-right">Base Amount</th>
                                    <th className="px-6 py-3 font-black tracking-wider text-right">Input VAT</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {data.expenses.map((exp: any) => (
                                    <tr key={exp.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-3 whitespace-nowrap font-medium text-slate-900">
                                            {format(new Date(exp.date), 'dd MMM yyyy')}
                                        </td>
                                        <td className="px-6 py-3">
                                            <div className="font-bold text-slate-900">{exp.description}</div>
                                            <div className="text-[10px] text-slate-400 uppercase">{exp.project?.name || 'General'}</div>
                                        </td>
                                        <td className="px-6 py-3">
                                            <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{exp.category}</span>
                                        </td>
                                        <td className="px-6 py-3 text-right tabular-nums font-medium text-slate-900">
                                            {(exp.amountBeforeTax || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-3 text-right tabular-nums font-bold text-rose-600">
                                            {(exp.taxAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}
        </div>
    )
}
