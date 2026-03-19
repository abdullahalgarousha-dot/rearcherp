"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Download, FileText, Loader2, Calendar } from "lucide-react"
import { format } from "date-fns"
import { usePDFExport } from "@/hooks/use-pdf-export"

interface LedgerEntry {
    id: string
    date: Date
    type: 'INVOICE' | 'PAYMENT'
    description: string
    projectCode: string
    projectName: string
    debit: number // Invoice Amount
    credit: number // Payment Amount
    balance: number // Running Balance
    status?: string
}

export function ClientStatementTab({ clientId }: { clientId: string }) {
    const [entries, setEntries] = useState<LedgerEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [clientData, setClientData] = useState<any>(null)
    const [companySettings, setCompanySettings] = useState<any>(null)
    const { exportPDF, isExporting } = usePDFExport()

    useEffect(() => {
        async function fetchLedger() {
            try {
                // Fetch Statement Data via API route
                const res = await fetch(`/api/crm/${clientId}/ledger`)
                if (!res.ok) throw new Error("Failed to fetch ledger")
                const data = await res.json()

                setEntries(data.entries)
                setClientData(data.client)
                setCompanySettings(data.settings)
            } catch (e) {
                console.error("Failed to fetch ledger", e)
            } finally {
                setLoading(false)
            }
        }
        fetchLedger()
    }, [clientId])

    const handleExport = () => {
        exportPDF('client-statement-container', `Statement_Of_Account_${clientData?.clientCode || clientId}.pdf`)
    }

    if (loading) {
        return <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
    }

    return (
        <Card className="border-none shadow-sm overflow-hidden bg-white">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50">
                <div>
                    <h3 className="text-lg font-bold text-slate-800">Consolidated Ledger</h3>
                    <p className="text-sm text-slate-500">Statement of Account across all projects</p>
                </div>
                <Button
                    onClick={handleExport}
                    disabled={isExporting || entries.length === 0}
                    className="gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200"
                >
                    {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    Export PDF (كشف حساب)
                </Button>
            </div>

            <CardContent className="p-0">
                {/* PDF Container */}
                <div id="client-statement-container" className="p-8 bg-white min-h-[A4]">
                    {/* Header for PDF */}
                    <div className="hidden print:block mb-8">
                        <div className="flex justify-between items-start border-b-2 border-slate-800 pb-6">
                            <div>
                                <h1 className="text-3xl font-black text-slate-900">{companySettings?.companyNameEn || 'Company'}</h1>
                                <p className="text-slate-500">Architectural & Engineering Consultancy</p>
                                {companySettings?.vatNumber && <p className="text-sm text-slate-500 mt-1">VAT: {companySettings.vatNumber}</p>}
                            </div>
                            <div className="text-right">
                                <h2 className="text-2xl font-bold text-indigo-700">Statement of Account</h2>
                                <h3 className="text-xl font-bold text-slate-800 arabic" dir="rtl">كشف حساب عميل</h3>
                                <p className="text-slate-500 mt-2 text-sm">{format(new Date(), 'dd MMM yyyy')}</p>
                            </div>
                        </div>

                        <div className="flex justify-between mt-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Bill To</p>
                                <h3 className="text-lg font-bold text-slate-800">{clientData?.name}</h3>
                                {clientData?.taxNumber && <p className="text-sm text-slate-600">VAT: {clientData.taxNumber}</p>}
                                {clientData?.address && <p className="text-sm text-slate-600 max-w-xs">{clientData.address}</p>}
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Account Info</p>
                                <p className="font-mono font-medium text-slate-800">{clientData?.clientCode}</p>
                            </div>
                        </div>
                    </div>

                    {/* Ledger Table */}
                    <div className="overflow-x-auto mt-6">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-100/80 print:bg-slate-100 pb-2">
                                <tr>
                                    <th className="px-4 py-3 font-bold rounded-tl-lg text-left">
                                        <div className="text-[10px] text-slate-400 mb-0.5">Date</div>
                                        <div>التاريخ</div>
                                    </th>
                                    <th className="px-4 py-3 font-bold text-left">
                                        <div className="text-[10px] text-slate-400 mb-0.5">Ref / Project</div>
                                        <div>المرجع / المشروع</div>
                                    </th>
                                    <th className="px-4 py-3 font-bold text-left">
                                        <div className="text-[10px] text-slate-400 mb-0.5">Description</div>
                                        <div>البيان</div>
                                    </th>
                                    <th className="px-4 py-3 font-bold text-right text-rose-600">
                                        <div className="text-[10px] text-rose-400/70 mb-0.5">Debit (Invoice)</div>
                                        <div>مدين (فاتورة)</div>
                                    </th>
                                    <th className="px-4 py-3 font-bold text-right text-emerald-600">
                                        <div className="text-[10px] text-emerald-400/70 mb-0.5">Credit (Payment)</div>
                                        <div>دائن (دفعة)</div>
                                    </th>
                                    <th className="px-4 py-3 font-bold text-right rounded-tr-lg">
                                        <div className="text-[10px] text-slate-400 mb-0.5">Balance</div>
                                        <div>الرصيد</div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-mono text-[13px]">
                                {/* Opening Balance Row */}
                                <tr className="bg-slate-50/50 print:bg-white text-slate-500 italic">
                                    <td className="px-4 py-3 font-sans" colSpan={5}>Opening Balance | رصيد افتتاحي</td>
                                    <td className="px-4 py-3 text-right font-bold">0.00</td>
                                </tr>

                                {entries.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-10 text-center text-slate-400 font-sans">
                                            No financial activity found for this client.
                                        </td>
                                    </tr>
                                ) : (
                                    entries.map((entry, idx) => (
                                        <tr key={`${entry.id}-${idx}`} className="hover:bg-slate-50 transition-colors print:border-b print:border-slate-100">
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                {format(new Date(entry.date), 'dd/MM/yyyy')}
                                            </td>
                                            <td className="px-4 py-3 font-sans">
                                                <div className="font-semibold text-slate-700">{entry.projectCode}</div>
                                                <div className="text-[11px] text-slate-400 truncate max-w-[150px]">{entry.projectName}</div>
                                            </td>
                                            <td className="px-4 py-3 font-sans w-1/3">
                                                <div className="flex items-center gap-2">
                                                    {entry.type === 'INVOICE' ?
                                                        <FileText className="w-3.5 h-3.5 text-rose-500 shrink-0" /> :
                                                        <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-none shrink-0 h-5 px-1 py-0 text-[10px]">PAY</Badge>
                                                    }
                                                    <span className="truncate">{entry.description}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right text-rose-600">
                                                {entry.debit > 0 ? entry.debit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-right text-emerald-600">
                                                {entry.credit > 0 ? entry.credit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-right font-bold text-slate-700">
                                                {entry.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    ))
                                )}

                                {/* Totals Row */}
                                {entries.length > 0 && (
                                    <tr className="bg-slate-100/50 print:bg-slate-50 border-t-2 border-slate-200">
                                        <td colSpan={3} className="px-4 py-4 font-bold text-right font-sans text-slate-700 uppercase tracking-wider text-xs">
                                            Totals & Final Balance | الإجماليات والرصيد النهائي
                                        </td>
                                        <td className="px-4 py-4 text-right font-bold text-rose-700">
                                            {entries.reduce((sum, e) => sum + e.debit, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-4 py-4 text-right font-bold text-emerald-700">
                                            {entries.reduce((sum, e) => sum + e.credit, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-4 py-4 text-right font-black text-indigo-700 text-base">
                                            {entries[entries.length - 1].balance.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-xs font-normal">SAR</span>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer for PDF */}
                    <div className="hidden print:block mt-16 pt-8 border-t border-slate-200 text-center text-sm text-slate-500">
                        <p>This is an electronically generated statement of account and does not require a signature.</p>
                        <p className="mt-1 font-mono text-xs">{companySettings?.websiteUrl || 'www.fts.com'}</p>
                    </div>
                </div>
            </CardContent>
        </Card >
    )
}
