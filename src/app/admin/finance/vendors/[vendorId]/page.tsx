import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getVendorStatement } from "@/app/admin/finance/vendors/actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Building2, Phone, Mail, User, CreditCard, CheckCircle2,
    Clock, FileText, ExternalLink, ArrowLeft
} from "lucide-react"
import Link from "next/link"
import { BackButton } from "@/components/ui/back-button"

export default async function VendorStatementPage({ params }: { params: Promise<{ vendorId: string }> }) {
    const session = await auth()
    const user = session?.user as any
    if (!user) return redirect('/login')

    const { vendorId } = await params

    const canView = ['GLOBAL_SUPER_ADMIN', 'SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'].includes(user?.role)
    if (!canView) return redirect('/admin/finance')

    const vendor = await getVendorStatement(vendorId)
    if (!vendor) return redirect('/admin/finance/vendors')

    return (
        <div className="space-y-8 pb-20">
            {/* Header */}
            <div className="flex items-start gap-4">
                <BackButton />
                <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-3xl font-black tracking-tight text-slate-900">{vendor.companyName}</h1>
                        <Badge className="bg-orange-100 text-orange-700 border-orange-200 font-black text-sm px-3 py-1">
                            {vendor.specialty}
                        </Badge>
                    </div>
                    <p className="text-slate-500 font-medium mt-1">كشف حساب المورد — Consolidated Statement of Account</p>
                </div>
            </div>

            {/* Vendor Info & Summary Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Vendor Info Card */}
                <Card className="border-none shadow-xl bg-white rounded-3xl lg:col-span-1">
                    <CardHeader className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-t-3xl border-b border-orange-100">
                        <CardTitle className="flex items-center gap-2 font-black text-orange-700">
                            <Building2 className="h-5 w-5" /> Vendor Profile
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-5">
                        {vendor.taxNumber && (
                            <div className="flex items-start gap-3">
                                <CreditCard className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-[10px] uppercase font-black text-slate-400">VAT / Tax Number (ZATCA)</p>
                                    <p className="font-mono font-bold text-sm">{vendor.taxNumber}</p>
                                </div>
                            </div>
                        )}
                        {vendor.bankAccountDetails && (
                            <div className="flex items-start gap-3">
                                <CreditCard className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-[10px] uppercase font-black text-slate-400">Bank / IBAN</p>
                                    <p className="font-bold text-sm">{vendor.bankAccountDetails}</p>
                                </div>
                            </div>
                        )}
                        {vendor.contactPerson && (
                            <div className="flex items-center gap-3">
                                <User className="h-4 w-4 text-slate-400 flex-shrink-0" />
                                <div>
                                    <p className="text-[10px] uppercase font-black text-slate-400">Contact Person</p>
                                    <p className="font-bold text-sm">{vendor.contactPerson}</p>
                                </div>
                            </div>
                        )}
                        {vendor.phone && (
                            <div className="flex items-center gap-3">
                                <Phone className="h-4 w-4 text-slate-400 flex-shrink-0" />
                                <p className="font-semibold text-sm">{vendor.phone}</p>
                            </div>
                        )}
                        {vendor.email && (
                            <div className="flex items-center gap-3">
                                <Mail className="h-4 w-4 text-slate-400 flex-shrink-0" />
                                <a href={`mailto:${vendor.email}`} className="font-semibold text-sm text-blue-600 hover:underline">{vendor.email}</a>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Financial Summary */}
                <div className="lg:col-span-2 grid grid-cols-2 gap-4">
                    <Card className="border-none shadow-xl bg-orange-600 text-white rounded-3xl overflow-hidden relative">
                        <div className="absolute inset-0 flex items-end justify-end p-4 opacity-10">
                            <Building2 size={64} />
                        </div>
                        <CardHeader className="pb-2">
                            <p className="text-orange-100 text-xs font-black uppercase tracking-widest">Total Contracted</p>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-black">{vendor.totalContracted.toLocaleString()}</p>
                            <p className="text-xs text-orange-200 font-bold mt-1">SAR — across {vendor.subContracts.length} contract(s)</p>
                        </CardContent>
                    </Card>
                    <Card className="border-none shadow-xl bg-emerald-600 text-white rounded-3xl overflow-hidden relative">
                        <div className="absolute inset-0 flex items-end justify-end p-4 opacity-10">
                            <CheckCircle2 size={64} />
                        </div>
                        <CardHeader className="pb-2">
                            <p className="text-emerald-100 text-xs font-black uppercase tracking-widest">Total Paid</p>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-black">{vendor.totalPaid.toLocaleString()}</p>
                            <p className="text-xs text-emerald-200 font-bold mt-1">SAR — authorized payments</p>
                        </CardContent>
                    </Card>
                    <Card className="border-none shadow-xl bg-slate-800 text-white rounded-3xl overflow-hidden relative">
                        <CardHeader className="pb-2">
                            <p className="text-slate-300 text-xs font-black uppercase tracking-widest">Outstanding Balance</p>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-black">{vendor.balance.toLocaleString()}</p>
                            <p className="text-xs text-slate-400 font-bold mt-1">SAR — remaining owed</p>
                        </CardContent>
                    </Card>
                    <Card className="border-none shadow-xl bg-amber-500 text-white rounded-3xl overflow-hidden relative">
                        <CardHeader className="pb-2">
                            <p className="text-amber-100 text-xs font-black uppercase tracking-widest">Input VAT Paid (ZATCA)</p>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-black">{vendor.totalVatPaid.toLocaleString()}</p>
                            <p className="text-xs text-amber-100 font-bold mt-1">SAR — claimable as input VAT</p>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Sub-Contracts Across All Projects */}
            <div className="space-y-5">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                    All Sub-Contracts ({vendor.subContracts.length})
                </h2>

                {vendor.subContracts.map((sc: any) => {
                    const paid = sc.milestones.filter((m: any) => m.status === 'PAID').reduce((s: number, m: any) => s + m.amount, 0)
                    const remaining = sc.totalAmount - paid
                    const pct = sc.totalAmount > 0 ? (paid / sc.totalAmount) * 100 : 0

                    return (
                        <Card key={sc.id} className="border-none shadow-xl bg-white rounded-3xl overflow-hidden">
                            {/* Contract Header */}
                            <CardHeader className="bg-slate-50/70 border-b border-slate-100 pb-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <Link href={`/admin/projects/${sc.project.id}`} className="font-black text-lg text-slate-900 hover:text-orange-700 hover:underline flex items-center gap-1.5">
                                                {sc.project.name}
                                                <ExternalLink className="h-3.5 w-3.5" />
                                            </Link>
                                            <Badge variant="outline" className="text-[10px] font-black rounded-full border-slate-200">
                                                {sc.project.code}
                                            </Badge>
                                            <Badge className={`text-[10px] font-black rounded-full ${sc.project.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500'}`}>
                                                {sc.project.status}
                                            </Badge>
                                        </div>
                                        {sc.scopeOfWork && (
                                            <p className="text-sm text-slate-500 mt-1">{sc.scopeOfWork}</p>
                                        )}
                                        <p className="text-xs text-slate-400 mt-1">
                                            Contract Date: {new Date(sc.contractDate).toLocaleDateString('en-SA')}
                                        </p>
                                    </div>
                                    <div className="text-right flex-shrink-0 space-y-1">
                                        <p className="text-xs font-bold text-slate-400">Contract Value</p>
                                        <p className="text-xl font-black text-slate-900">{sc.totalAmount.toLocaleString()} SAR</p>
                                        <div className="flex gap-4 text-xs">
                                            <span className="text-emerald-600 font-bold">Paid: {paid.toLocaleString()}</span>
                                            <span className="text-rose-600 font-bold">Due: {remaining.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                                {/* Progress */}
                                <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-orange-400 to-emerald-500 rounded-full transition-all"
                                        style={{ width: `${Math.min(pct, 100)}%` }}
                                    />
                                </div>
                                <div className="flex justify-between text-[10px] text-slate-400 font-bold mt-1">
                                    <span>{pct.toFixed(0)}% Paid</span>
                                    <span>{sc.milestones.length} milestone(s)</span>
                                </div>
                            </CardHeader>

                            {/* Milestones Payment History */}
                            <CardContent className="p-0">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50/50 border-b border-slate-100">
                                        <tr>
                                            <th className="px-5 py-3 text-left text-xs font-black uppercase text-slate-400">Milestone</th>
                                            <th className="px-5 py-3 text-right text-xs font-black uppercase text-slate-400">Amount</th>
                                            <th className="px-5 py-3 text-right text-xs font-black uppercase text-slate-400">VAT</th>
                                            <th className="px-5 py-3 text-center text-xs font-black uppercase text-slate-400">Status</th>
                                            <th className="px-5 py-3 text-center text-xs font-black uppercase text-slate-400">Paid On</th>
                                            <th className="px-5 py-3 text-center text-xs font-black uppercase text-slate-400">Tax Invoice</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {sc.milestones.map((m: any) => (
                                            <tr key={m.id} className="hover:bg-slate-50/40 transition-colors">
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-2">
                                                        {m.status === 'PAID'
                                                            ? <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                                                            : <Clock className="h-4 w-4 text-amber-400 flex-shrink-0" />
                                                        }
                                                        <span className="font-semibold text-slate-800">{m.description}</span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4 text-right font-black text-slate-800">
                                                    {m.amount.toLocaleString()} SAR
                                                </td>
                                                <td className="px-5 py-4 text-right font-semibold text-amber-600 text-xs">
                                                    {(m.vatAmount || 0).toLocaleString()} SAR
                                                </td>
                                                <td className="px-5 py-4 text-center">
                                                    <Badge className={`text-[10px] font-black rounded-full px-3 ${m.status === 'PAID'
                                                        ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                                        : 'bg-amber-100 text-amber-700 border-amber-200'
                                                        }`}>
                                                        {m.status}
                                                    </Badge>
                                                </td>
                                                <td className="px-5 py-4 text-center text-xs text-slate-500">
                                                    {m.paidAt ? new Date(m.paidAt).toLocaleDateString('en-SA') : '—'}
                                                </td>
                                                <td className="px-5 py-4 text-center">
                                                    {m.taxInvoiceUrl
                                                        ? <a href={m.taxInvoiceUrl} target="_blank" rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline font-bold">
                                                            <FileText className="h-3 w-3" /> View PDF
                                                        </a>
                                                        : <span className="text-slate-300 text-xs">—</span>
                                                    }
                                                </td>
                                            </tr>
                                        ))}
                                        {sc.milestones.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="text-center py-6 text-muted-foreground text-sm">No milestones added yet.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </CardContent>
                        </Card>
                    )
                })}

                {vendor.subContracts.length === 0 && (
                    <div className="text-center py-16 border-2 border-dashed border-orange-100 rounded-3xl">
                        <Building2 className="h-12 w-12 text-orange-200 mx-auto mb-3" />
                        <p className="font-bold text-slate-400">No sub-contracts found for this vendor.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
