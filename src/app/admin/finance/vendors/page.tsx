import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { getAllVendors } from "@/app/admin/finance/vendors/actions"
import { hasPermission } from "@/lib/rbac"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Building2, TrendingDown, Wallet, ExternalLink, Plus, ArrowRight } from "lucide-react"
import Link from "next/link"
import { BackButton } from "@/components/ui/back-button"
import { AddVendorDialog } from "./add-vendor-dialog"

export default async function VendorsDirectoryPage() {
    const session = await auth()
    const user = session?.user as any
    if (!user) return redirect('/login')

    const canView = ['ADMIN', 'SUPER_ADMIN', 'GLOBAL_SUPER_ADMIN', 'ACCOUNTANT'].includes(user?.role)
    if (!canView) return redirect('/admin/finance')

    const vendors = await getAllVendors()
    const canManage = await hasPermission('finance', 'masterVisible')

    const totalOwedAllVendors = vendors.reduce((s: number, v: any) => s + v.balance, 0)
    const totalPaidAllVendors = vendors.reduce((s: number, v: any) => s + v.totalPaid, 0)

    const specialties = Array.from(new Set(vendors.map((v: any) => v.specialty))) as string[]

    return (
        <div className="space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <BackButton />
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                            <Building2 className="h-8 w-8 text-orange-500" />
                            Vendors Directory
                            <Badge className="bg-orange-100 text-orange-700 border-orange-200 font-black px-3">
                                {vendors.length} Vendors
                            </Badge>
                        </h1>
                        <p className="text-slate-500 font-medium text-sm mt-1">
                            دليل الموردين والمستشارين من الباطن — Global Sub-Consultant Ledger
                        </p>
                    </div>
                </div>
                {canManage && <AddVendorDialog />}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-none shadow-xl bg-orange-600 text-white rounded-3xl overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-6 opacity-10"><Building2 size={80} /></div>
                    <CardHeader className="pb-2">
                        <p className="text-orange-100 text-xs font-black uppercase tracking-widest">Total Outstanding (Company-Wide)</p>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black">{totalOwedAllVendors.toLocaleString()} <span className="text-lg font-bold opacity-80">SAR</span></div>
                        <p className="text-xs text-orange-200 mt-1 font-bold">Remaining balance owed to all vendors</p>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-xl bg-emerald-600 text-white rounded-3xl overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-6 opacity-10"><Wallet size={80} /></div>
                    <CardHeader className="pb-2">
                        <p className="text-emerald-100 text-xs font-black uppercase tracking-widest">Total Paid (All Time)</p>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black">{totalPaidAllVendors.toLocaleString()} <span className="text-lg font-bold opacity-80">SAR</span></div>
                        <p className="text-xs text-emerald-200 mt-1 font-bold">All authorized vendor payments</p>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-xl bg-slate-800 text-white rounded-3xl overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-6 opacity-10"><TrendingDown size={80} /></div>
                    <CardHeader className="pb-2">
                        <p className="text-slate-300 text-xs font-black uppercase tracking-widest">Active Specialties</p>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black">{specialties.length}</div>
                        <div className="flex flex-wrap gap-1 mt-2">
                            {specialties.slice(0, 4).map(s => (
                                <Badge key={s} className="text-[9px] bg-white/10 text-white border-white/20 rounded-full">{s}</Badge>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Vendors Table */}
            <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden">
                <CardHeader className="bg-slate-50/60 border-b border-slate-100">
                    <CardTitle className="flex items-center gap-2 font-black">
                        <Building2 className="h-5 w-5 text-orange-500" />
                        All Vendors
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    {["Company", "Specialty", "VAT Number", "Contact", "Contracts", "Total Contracted", "Paid", "Balance"].map(h => (
                                        <th key={h} className="px-5 py-3 text-left text-xs font-black uppercase text-slate-400">{h}</th>
                                    ))}
                                    <th className="px-5 py-3" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {vendors.map((v: any) => (
                                    <tr key={v.id} className="hover:bg-orange-50/40 transition-colors group">
                                        <td className="px-5 py-4">
                                            <Link href={`/admin/finance/vendors/${v.id}`} className="font-black text-slate-900 hover:text-orange-700 hover:underline">
                                                {v.companyName}
                                            </Link>
                                        </td>
                                        <td className="px-5 py-4">
                                            <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-[10px] font-black rounded-full">
                                                {v.specialty}
                                            </Badge>
                                        </td>
                                        <td className="px-5 py-4 font-mono text-xs text-slate-500">{v.taxNumber || '—'}</td>
                                        <td className="px-5 py-4 text-slate-600 text-xs">{v.contactPerson || '—'}</td>
                                        <td className="px-5 py-4 text-center">
                                            <Badge variant="outline" className="rounded-full font-bold">{v.activeContractsCount}</Badge>
                                        </td>
                                        <td className="px-5 py-4 font-bold text-slate-700">{v.totalContracted.toLocaleString()}</td>
                                        <td className="px-5 py-4 font-bold text-emerald-700">{v.totalPaid.toLocaleString()}</td>
                                        <td className="px-5 py-4 font-black text-orange-700">{v.balance.toLocaleString()}</td>
                                        <td className="px-5 py-4">
                                            <Button asChild variant="ghost" size="sm" className="h-8 rounded-xl text-orange-600 hover:bg-orange-50 font-bold gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Link href={`/admin/finance/vendors/${v.id}`}>
                                                    Statement <ArrowRight className="h-3 w-3" />
                                                </Link>
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                                {vendors.length === 0 && (
                                    <tr>
                                        <td colSpan={9} className="text-center py-16 text-muted-foreground">
                                            <Building2 className="h-12 w-12 text-slate-200 mx-auto mb-3" />
                                            <p className="font-bold text-slate-400">No vendors in the directory yet.</p>
                                            <p className="text-xs text-slate-300 mt-1">Add your first sub-consultant using the button above.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
