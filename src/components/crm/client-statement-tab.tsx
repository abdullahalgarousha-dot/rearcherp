"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Download, FileText, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { usePDFExport } from "@/hooks/use-pdf-export"

interface LedgerEntry {
    id: string
    date: Date
    type: 'INVOICE' | 'PAYMENT'
    description: string
    projectCode: string
    projectName: string
    debit: number
    credit: number
    balance: number
    status?: string
}

interface InvoiceRow {
    id: string
    invoiceNumber: string
    date: Date
    amount: number
    status: string
    projectCode: string
    projectName: string
}

interface PaymentRow {
    receiptRef: string
    invoiceNumber: string
    date: Date
    amount: number
    projectCode: string
}

interface Summary {
    totalContractValue: number
    totalInvoiced: number
    totalPaid: number
    totalOutstanding: number
    projectCount: number
}

// ── Formatters ────────────────────────────────────────────────────────────

const SAR = (n: number) =>
    n.toLocaleString('en-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const D = (d: Date | string) => format(new Date(d), 'dd/MM/yyyy')

// ── On-screen ledger (visible in the UI) ─────────────────────────────────

function OnScreenLedger({ entries }: { entries: LedgerEntry[] }) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-100/80">
                    <tr>
                        <th className="px-4 py-3 font-bold">
                            <div className="text-[10px] text-slate-400 mb-0.5">Date</div>
                            <div>التاريخ</div>
                        </th>
                        <th className="px-4 py-3 font-bold">
                            <div className="text-[10px] text-slate-400 mb-0.5">Ref / Project</div>
                            <div>المرجع</div>
                        </th>
                        <th className="px-4 py-3 font-bold">
                            <div className="text-[10px] text-slate-400 mb-0.5">Description</div>
                            <div>البيان</div>
                        </th>
                        <th className="px-4 py-3 font-bold text-right text-rose-600">
                            <div className="text-[10px] text-rose-400/70 mb-0.5">Debit</div>
                            <div>مدين</div>
                        </th>
                        <th className="px-4 py-3 font-bold text-right text-emerald-600">
                            <div className="text-[10px] text-emerald-400/70 mb-0.5">Credit</div>
                            <div>دائن</div>
                        </th>
                        <th className="px-4 py-3 font-bold text-right">
                            <div className="text-[10px] text-slate-400 mb-0.5">Balance</div>
                            <div>الرصيد</div>
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[13px]">
                    <tr className="bg-slate-50/50 text-slate-500 italic">
                        <td className="px-4 py-3 font-sans" colSpan={5}>Opening Balance | رصيد افتتاحي</td>
                        <td className="px-4 py-3 text-right font-bold">0.00</td>
                    </tr>
                    {entries.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="px-4 py-10 text-center text-slate-400 font-sans">
                                No financial activity found for this client.
                            </td>
                        </tr>
                    ) : entries.map((entry, idx) => (
                        <tr key={`${entry.id}-${idx}`} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 whitespace-nowrap">{D(entry.date)}</td>
                            <td className="px-4 py-3 font-sans">
                                <div className="font-semibold text-slate-700">{entry.projectCode}</div>
                                <div className="text-[11px] text-slate-400 truncate max-w-[140px]">{entry.projectName}</div>
                            </td>
                            <td className="px-4 py-3 font-sans w-1/3">
                                <div className="flex items-center gap-2">
                                    {entry.type === 'INVOICE'
                                        ? <FileText className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                        : <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-none h-5 px-1 text-[10px]">PAY</Badge>
                                    }
                                    <span className="truncate">{entry.description}</span>
                                </div>
                            </td>
                            <td className="px-4 py-3 text-right text-rose-600">
                                {entry.debit > 0 ? SAR(entry.debit) : '-'}
                            </td>
                            <td className="px-4 py-3 text-right text-emerald-600">
                                {entry.credit > 0 ? SAR(entry.credit) : '-'}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-slate-700">
                                {SAR(entry.balance)}
                            </td>
                        </tr>
                    ))}
                    {entries.length > 0 && (
                        <tr className="bg-slate-100/50 border-t-2 border-slate-200">
                            <td colSpan={3} className="px-4 py-4 font-bold text-right font-sans text-slate-700 uppercase tracking-wider text-xs">
                                Totals & Final Balance | الإجماليات والرصيد النهائي
                            </td>
                            <td className="px-4 py-4 text-right font-bold text-rose-700">
                                {SAR(entries.reduce((s, e) => s + e.debit, 0))}
                            </td>
                            <td className="px-4 py-4 text-right font-bold text-emerald-700">
                                {SAR(entries.reduce((s, e) => s + e.credit, 0))}
                            </td>
                            <td className="px-4 py-4 text-right font-black text-indigo-700 text-base">
                                {SAR(entries[entries.length - 1].balance)} <span className="text-xs font-normal">SAR</span>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    )
}

// ── Hidden PDF Template ───────────────────────────────────────────────────

function PDFTemplate({
    clientData,
    brand,
    companySettings,
    summary,
    invoices,
    payments,
    entries,
}: {
    clientData: any
    brand: any
    companySettings: any
    summary: Summary
    invoices: InvoiceRow[]
    payments: PaymentRow[]
    entries: LedgerEntry[]
}) {
    // Date formatted as "04 April 2026" and as "04/04/2026"
    const generatedDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
    // Brand identity: project brand takes priority over tenant system settings
    const companyName = brand?.nameEn || companySettings?.companyNameEn || 'Company'
    const companyNameAr = brand?.nameAr || companySettings?.companyNameAr || ''
    const logoUrl: string | null = brand?.logoUrl || companySettings?.logoUrl || null
    const primaryColor: string = brand?.primaryColor || '#4f46e5'
    const brandVat = brand?.vatNumber || companySettings?.vatNumber || null

    const summaryCards = [
        {
            labelEn: 'Total Project(s) Value',
            labelAr: 'إجمالي قيمة المشاريع',
            value: SAR(summary.totalContractValue),
            color: '#4f46e5',
            bg: '#eef2ff',
        },
        {
            labelEn: 'Total Issued Invoices',
            labelAr: 'الفواتير المصدرة',
            value: SAR(summary.totalInvoiced),
            color: '#d97706',
            bg: '#fffbeb',
        },
        {
            labelEn: 'Total Paid',
            labelAr: 'إجمالي المدفوعات',
            value: SAR(summary.totalPaid),
            color: '#059669',
            bg: '#ecfdf5',
        },
        {
            labelEn: 'Outstanding Balance',
            labelAr: 'المستحق غير المدفوع',
            value: SAR(summary.totalOutstanding),
            color: summary.totalOutstanding > 0 ? '#dc2626' : '#059669',
            bg: summary.totalOutstanding > 0 ? '#fef2f2' : '#ecfdf5',
        },
    ]

    return (
        // Fixed at 794px (A4 @ 96dpi). Positioned off-screen until capture.
        <div
            id="statement-print-template"
            data-pdf-hidden="true"
            dir="rtl"
            style={{
                position: 'fixed',
                left: '-9999px',
                top: 0,
                width: '794px',
                backgroundColor: '#ffffff',
                fontFamily: "'Segoe UI', 'Arial', 'Tahoma', sans-serif",
                fontSize: '12px',
                color: '#1e293b',
                visibility: 'hidden',
                zIndex: -1,
            }}
        >
            <div style={{ padding: '36px 40px 40px' }}>

                {/* ── Section 1: Letterhead ── */}
                <div style={{ borderBottom: '3px solid #1e293b', paddingBottom: '20px', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        {/* Right side: Company identity (RTL — renders first) */}
                        <div style={{ textAlign: 'right' }}>
                            {/* Logo: real image when available, branded monogram fallback */}
                            {logoUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={logoUrl}
                                    alt={companyName}
                                    crossOrigin="anonymous"
                                    style={{
                                        height: '64px', maxWidth: '160px', objectFit: 'contain',
                                        marginLeft: 'auto', marginBottom: '8px', display: 'block',
                                    }}
                                />
                            ) : (
                                <div style={{
                                    height: '64px', width: '64px', borderRadius: '8px',
                                    background: primaryColor,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    marginLeft: 'auto', marginBottom: '8px',
                                }}>
                                    <span style={{ color: '#fff', fontWeight: 900, fontSize: '20px', letterSpacing: '-1px' }}>
                                        {companyName.substring(0, 3).toUpperCase()}
                                    </span>
                                </div>
                            )}
                            <div style={{ fontSize: '16px', fontWeight: 800, color: '#1e293b' }}>{companyName}</div>
                            {companyNameAr && (
                                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>{companyNameAr}</div>
                            )}
                            {brandVat && (
                                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                                    الرقم الضريبي: {brandVat}
                                </div>
                            )}
                        </div>
                        {/* Left side: Document title */}
                        <div style={{ textAlign: 'left' }}>
                            <div style={{ fontSize: '22px', fontWeight: 900, color: primaryColor, lineHeight: 1.2 }}>
                                كشف حساب وموقف مالي
                            </div>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: '#475569', marginTop: '4px' }}>
                                Statement of Account &amp; Financial Position
                            </div>
                            <div className="flex flex-col gap-2 text-black text-sm mt-4">
                              <div className="flex justify-between w-72 border-b pb-1">
                                <span className="font-bold">Generated / تاريخ الإصدار:</span>
                                <span className="font-mono">{new Date().toLocaleDateString('en-GB')}</span>
                              </div>
                              <div className="flex justify-between w-72 border-b pb-1">
                                <span className="font-bold">Account / رقم الحساب:</span>
                                <span className="font-mono">{clientData?.clientCode ?? clientData?.id ?? 'N/A'}</span>
                              </div>
                            </div>
                        </div>
                    </div>

                    {/* Client info bar */}
                    <div style={{
                        marginTop: '16px', padding: '12px 16px', background: '#f8fafc',
                        borderRadius: '8px', border: '1px solid #e2e8f0',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px',
                    }}>
                        {/* Label (left in RTL = physically right) */}
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textAlign: 'left', flexShrink: 0 }}>
                            بيانات العميل<br />
                            <span style={{ fontSize: '10px', fontWeight: 400, color: '#94a3b8' }}>Client Details</span>
                        </div>
                        {/* Client data (right in RTL = physically left) */}
                        <div style={{ textAlign: 'right', flex: 1 }}>
                            <div style={{ fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>
                                {clientData?.name || '—'}
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                {"رقم الحساب:"}{' '}{clientData?.clientCode ?? clientData?.id ?? '—'}
                            </div>
                            {clientData?.taxNumber && (
                                <div style={{ fontSize: '11px', color: '#64748b' }}>
                                    الرقم الضريبي: {clientData.taxNumber}
                                </div>
                            )}
                            {clientData?.address && (
                                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                                    {clientData.address}
                                </div>
                            )}
                        </div>
                        {/* Stats badge */}
                        <div style={{
                            flexShrink: 0, textAlign: 'left', padding: '6px 12px',
                            background: `${primaryColor}15`, borderRadius: '8px',
                            border: `1px solid ${primaryColor}30`,
                        }}>
                            <div style={{ fontSize: '18px', fontWeight: 900, color: primaryColor }}>
                                {summary.projectCount}
                            </div>
                            <div style={{ fontSize: '9px', color: '#64748b' }}>مشاريع / Projects</div>
                        </div>
                    </div>
                </div>

                {/* ── Section 2: Summary Dashboard ── */}
                <div style={{ marginBottom: '24px' }}>
                    <div style={{
                        fontSize: '11px', fontWeight: 700, color: '#94a3b8',
                        textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px',
                        textAlign: 'right',
                    }}>
                        {"الملخص المالي"}{" — Financial Summary Dashboard"}
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        {summaryCards.map((card, i) => (
                            <div key={i} style={{
                                flex: 1, padding: '14px 12px', borderRadius: '10px',
                                background: card.bg, border: `1.5px solid ${card.color}22`,
                                textAlign: 'center',
                            }}>
                                <div style={{ fontSize: '9px', color: '#64748b', marginBottom: '3px' }}>{card.labelEn}</div>
                                <div style={{ fontSize: '11px', fontWeight: 800, color: card.color, marginBottom: '4px' }}>
                                    {card.labelAr}
                                </div>
                                <div style={{ fontSize: '14px', fontWeight: 900, color: card.color, fontVariantNumeric: 'tabular-nums' }}>
                                    {card.value}
                                </div>
                                <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '2px' }}>SAR</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Section 3a: Issued Invoices ── */}
                <div style={{ marginBottom: '20px' }}>
                    <div style={{
                        background: '#fef3c7', borderRadius: '6px 6px 0 0',
                        padding: '8px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                        <div style={{ fontSize: '11px', color: '#92400e' }}>Issued Invoices</div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#78350f' }}>
                            الفواتير المصدرة ({invoices.length})
                        </div>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                        <thead>
                            <tr style={{ background: '#fffbeb' }}>
                                <th style={{ ...thStyle, textAlign: 'right' }}>رقم الفاتورة / Invoice #</th>
                                <th style={{ ...thStyle, textAlign: 'right' }}>المشروع / Project</th>
                                <th style={{ ...thStyle, textAlign: 'right' }}>التاريخ / Date</th>
                                <th style={{ ...thStyle, textAlign: 'left' }}>المبلغ / Amount (SAR)</th>
                                <th style={{ ...thStyle, textAlign: 'left' }}>الحالة / Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoices.length === 0 ? (
                                <tr>
                                    <td colSpan={5} style={{ ...tdStyle, textAlign: 'center', color: '#94a3b8' }}>لا توجد فواتير</td>
                                </tr>
                            ) : invoices.map((inv, i) => (
                                <tr key={inv.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{inv.invoiceNumber}</td>
                                    <td style={{ ...tdStyle, textAlign: 'right', color: '#475569' }}>{inv.projectCode}</td>
                                    <td style={{ ...tdStyle, textAlign: 'right' }}>{D(inv.date)}</td>
                                    <td style={{ ...tdStyle, textAlign: 'left', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                                        {SAR(inv.amount)}
                                    </td>
                                    <td style={{ ...tdStyle, textAlign: 'left' }}>
                                        <span style={{
                                            padding: '2px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: 700,
                                            background: inv.status === 'PAID' ? '#dcfce7' : '#fee2e2',
                                            color: inv.status === 'PAID' ? '#166534' : '#991b1b',
                                        }}>
                                            {inv.status === 'PAID' ? 'مدفوعة PAID' : 'غير مدفوعة UNPAID'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* ── Section 3b: Payments Received ── */}
                <div style={{ marginBottom: '24px' }}>
                    <div style={{
                        background: '#d1fae5', borderRadius: '6px 6px 0 0',
                        padding: '8px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                        <div style={{ fontSize: '11px', color: '#065f46' }}>Payments Received</div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#064e3b' }}>
                            المدفوعات المستلمة ({payments.length})
                        </div>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                        <thead>
                            <tr style={{ background: '#ecfdf5' }}>
                                <th style={{ ...thStyle, textAlign: 'right' }}>رقم الإيصال / Receipt</th>
                                <th style={{ ...thStyle, textAlign: 'right' }}>الفاتورة المقابلة / For Invoice #</th>
                                <th style={{ ...thStyle, textAlign: 'right' }}>المشروع</th>
                                <th style={{ ...thStyle, textAlign: 'right' }}>التاريخ</th>
                                <th style={{ ...thStyle, textAlign: 'left' }}>المبلغ المستلم (SAR)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payments.length === 0 ? (
                                <tr>
                                    <td colSpan={5} style={{ ...tdStyle, textAlign: 'center', color: '#94a3b8' }}>لا توجد مدفوعات مسجلة</td>
                                </tr>
                            ) : payments.map((pay, i) => (
                                <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: '#059669' }}>{pay.receiptRef}</td>
                                    <td style={{ ...tdStyle, textAlign: 'right' }}>{pay.invoiceNumber}</td>
                                    <td style={{ ...tdStyle, textAlign: 'right', color: '#475569' }}>{pay.projectCode}</td>
                                    <td style={{ ...tdStyle, textAlign: 'right' }}>{D(pay.date)}</td>
                                    <td style={{ ...tdStyle, textAlign: 'left', fontWeight: 700, color: '#059669', fontVariantNumeric: 'tabular-nums' }}>
                                        {SAR(pay.amount)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* ── Section 4: Consolidated Ledger ── */}
                <div style={{ marginBottom: '24px' }}>
                    <div style={{
                        background: '#e0e7ff', borderRadius: '6px 6px 0 0',
                        padding: '8px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                        <div style={{ fontSize: '11px', color: '#3730a3' }}>Consolidated Ledger — Chronological</div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#312e81' }}>
                            دفتر الأستاذ الموحد — تسلسل زمني
                        </div>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                        <thead>
                            <tr style={{ background: '#eef2ff' }}>
                                <th style={{ ...thStyle, textAlign: 'right' }}>التاريخ / Date</th>
                                <th style={{ ...thStyle, textAlign: 'right' }}>المرجع / Ref</th>
                                <th style={{ ...thStyle, textAlign: 'right' }}>البيان / Description</th>
                                <th style={{ ...thStyle, textAlign: 'left', color: '#dc2626' }}>مدين / Debit</th>
                                <th style={{ ...thStyle, textAlign: 'left', color: '#059669' }}>دائن / Credit</th>
                                <th style={{ ...thStyle, textAlign: 'left', fontWeight: 800 }}>الرصيد / Balance</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* Opening balance row */}
                            <tr style={{ background: '#f8fafc', fontStyle: 'italic', color: '#64748b' }}>
                                <td colSpan={5} style={{ ...tdStyle, textAlign: 'right' }}>رصيد افتتاحي — Opening Balance</td>
                                <td style={{ ...tdStyle, textAlign: 'left', fontWeight: 700 }}>0.00</td>
                            </tr>
                            {entries.map((entry, idx) => (
                                <tr key={`${entry.id}-${idx}`} style={{ background: idx % 2 === 0 ? '#fff' : '#f8fafc' }}>
                                    <td style={{ ...tdStyle, textAlign: 'right' }}>{D(entry.date)}</td>
                                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{entry.projectCode}</td>
                                    <td style={{ ...tdStyle, textAlign: 'right', color: '#475569' }}>
                                        {entry.type === 'INVOICE' ? `فاتورة — ${entry.description.split('|')[0].trim()}` : `دفعة — ${entry.description.split('|')[0].trim()}`}
                                    </td>
                                    <td style={{ ...tdStyle, textAlign: 'left', color: '#dc2626', fontVariantNumeric: 'tabular-nums' }}>
                                        {entry.debit > 0 ? SAR(entry.debit) : '—'}
                                    </td>
                                    <td style={{ ...tdStyle, textAlign: 'left', color: '#059669', fontVariantNumeric: 'tabular-nums' }}>
                                        {entry.credit > 0 ? SAR(entry.credit) : '—'}
                                    </td>
                                    <td style={{
                                        ...tdStyle, textAlign: 'left', fontWeight: 800, fontVariantNumeric: 'tabular-nums',
                                        color: entry.balance > 0 ? '#dc2626' : '#059669',
                                    }}>
                                        {SAR(entry.balance)}
                                    </td>
                                </tr>
                            ))}
                            {entries.length > 0 && (() => {
                                const totalDebit = entries.reduce((s, e) => s + e.debit, 0)
                                const totalCredit = entries.reduce((s, e) => s + e.credit, 0)
                                const finalBalance = entries[entries.length - 1].balance
                                return (
                                    <tr style={{ background: '#e0e7ff', borderTop: '2px solid #6366f1' }}>
                                        <td colSpan={3} style={{ ...tdStyle, textAlign: 'right', fontWeight: 800, color: '#312e81' }}>
                                            الإجماليات والرصيد النهائي — Totals &amp; Final Balance
                                        </td>
                                        <td style={{ ...tdStyle, textAlign: 'left', fontWeight: 800, color: '#dc2626', fontVariantNumeric: 'tabular-nums' }}>
                                            {SAR(totalDebit)}
                                        </td>
                                        <td style={{ ...tdStyle, textAlign: 'left', fontWeight: 800, color: '#059669', fontVariantNumeric: 'tabular-nums' }}>
                                            {SAR(totalCredit)}
                                        </td>
                                        <td style={{
                                            ...tdStyle, textAlign: 'left', fontWeight: 900, fontSize: '13px',
                                            color: finalBalance > 0 ? '#dc2626' : '#059669', fontVariantNumeric: 'tabular-nums',
                                        }}>
                                            {SAR(finalBalance)} SAR
                                        </td>
                                    </tr>
                                )
                            })()}
                        </tbody>
                    </table>
                </div>

                {/* ── Footer ── */}
                <div style={{
                    marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e2e8f0',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                    <div style={{ fontSize: '9px', color: '#94a3b8', textAlign: 'left' }}>
                        {companySettings?.websiteUrl || 'www.fts.com'}
                    </div>
                    <div style={{ fontSize: '10px', color: '#94a3b8', textAlign: 'center' }}>
                        هذا المستند صادر إلكترونياً ولا يحتاج إلى توقيع
                        <br />
                        This is an electronically generated document and does not require a signature.
                    </div>
                    <div style={{ fontSize: '9px', color: '#94a3b8', textAlign: 'right' }}>
                        {generatedDate}
                    </div>
                </div>

            </div>
        </div>
    )
}

// Shared table cell styles for the PDF template (inline, not Tailwind)
const thStyle: React.CSSProperties = {
    padding: '7px 10px',
    fontWeight: 700,
    fontSize: '10px',
    borderBottom: '1px solid #e2e8f0',
    color: '#475569',
}

const tdStyle: React.CSSProperties = {
    padding: '6px 10px',
    borderBottom: '1px solid #f1f5f9',
    color: '#1e293b',
}

// ── Main Component ────────────────────────────────────────────────────────

export function ClientStatementTab({ clientId }: { clientId: string }) {
    const [entries, setEntries] = useState<LedgerEntry[]>([])
    const [invoices, setInvoices] = useState<InvoiceRow[]>([])
    const [payments, setPayments] = useState<PaymentRow[]>([])
    const [summary, setSummary] = useState<Summary>({
        totalContractValue: 0,
        totalInvoiced: 0,
        totalPaid: 0,
        totalOutstanding: 0,
        projectCount: 0,
    })
    const [loading, setLoading] = useState(true)
    const [clientData, setClientData] = useState<any>(null)
    const [brand, setBrand] = useState<any>(null)
    const [companySettings, setCompanySettings] = useState<any>(null)
    const { exportPDF, isExporting } = usePDFExport()

    useEffect(() => {
        async function fetchLedger() {
            try {
                const res = await fetch(`/api/crm/${clientId}/ledger`)
                if (!res.ok) throw new Error("Failed to fetch ledger")
                const data = await res.json()
                setEntries(data.entries)
                setInvoices(data.invoices)
                setPayments(data.payments)
                setSummary(data.summary)
                setClientData(data.client)
                setBrand(data.brand)
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
        exportPDF(
            'statement-print-template',
            `Statement_${clientData?.clientCode || clientId}_${format(new Date(), 'yyyyMMdd')}.pdf`
        )
    }

    if (loading) {
        return (
            <div className="py-20 flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <>
            {/* ── On-screen card ── */}
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
                        {isExporting
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Download className="w-4 h-4" />
                        }
                        Export PDF (كشف حساب)
                    </Button>
                </div>

                {/* Summary row */}
                {!loading && (
                    <div className="grid grid-cols-4 divide-x divide-slate-100 border-b border-slate-100">
                        {[
                            { label: 'Projects Value', labelAr: 'قيمة المشاريع', value: summary.totalContractValue, color: 'text-indigo-700' },
                            { label: 'Total Invoiced', labelAr: 'الفواتير المصدرة', value: summary.totalInvoiced, color: 'text-amber-700' },
                            { label: 'Total Paid', labelAr: 'المدفوعات', value: summary.totalPaid, color: 'text-emerald-700' },
                            { label: 'Outstanding', labelAr: 'المستحق', value: summary.totalOutstanding, color: summary.totalOutstanding > 0 ? 'text-rose-700' : 'text-emerald-700' },
                        ].map((item, i) => (
                            <div key={i} className="px-6 py-4">
                                <p className="text-xs text-slate-500">{item.label}</p>
                                <p className="text-xs text-slate-400 mb-1">{item.labelAr}</p>
                                <p className={`font-bold text-lg font-mono ${item.color}`}>
                                    {SAR(item.value)}
                                </p>
                                <p className="text-xs text-slate-400">SAR</p>
                            </div>
                        ))}
                    </div>
                )}

                <CardContent className="p-0">
                    <OnScreenLedger entries={entries} />
                </CardContent>
            </Card>

            {/* ── Hidden PDF template (always rendered, off-screen) ── */}
            {!loading && clientData && (
                <PDFTemplate
                    clientData={clientData}
                    brand={brand}
                    companySettings={companySettings}
                    summary={summary}
                    invoices={invoices}
                    payments={payments}
                    entries={entries}
                />
            )}
        </>
    )
}
