import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BackButton } from "@/components/ui/back-button"
import { format } from "date-fns"
import { Plus, FileText, Eye } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { IssueInvoiceForm } from "../invoice-form"
import Link from "next/link"

async function getData(tenantId: string, isGlobalAdmin: boolean) {
    const filter = isGlobalAdmin ? {} : { tenantId }
    
    const projects = await db.project.findMany({ 
        where: filter,
        include: { client: true } 
    })
    const invoices = await db.invoice.findMany({
        where: filter,
        include: { project: true },
        orderBy: { date: 'desc' }
    })
    return { projects, invoices }
}

export default async function InvoicesPage() {
    const session = await auth()
    const user = session?.user as any
    const role = user?.role
    const tenantId = user?.tenantId
    const isGlobalAdmin = role === 'GLOBAL_SUPER_ADMIN'

    if (!['ADMIN', 'ACCOUNTANT', 'GLOBAL_SUPER_ADMIN', 'SUPER_ADMIN'].includes(role)) {
        redirect('/')
    }

    const { projects, invoices } = await getData(tenantId, isGlobalAdmin)


    return (
        <div className="space-y-6 rtl:text-right pb-20">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <BackButton />
                    <h1 className="text-3xl font-bold tracking-tight text-primary">سجل الفواتير (Invoices)</h1>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {/* New Invoice Form */}
                <Card className="border-none shadow-lg bg-white/60 backdrop-blur-xl md:col-span-1 h-fit">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Plus className="h-5 w-5 text-primary" />
                            إصدار فاتورة (New Invoice)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <IssueInvoiceForm projectsForForm={projects} />
                    </CardContent>
                </Card>

                {/* Invoices List */}
                <Card className="border-none shadow-lg bg-white/60 backdrop-blur-xl md:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-emerald-600" />
                            سجل الفواتير الصادرة
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {invoices.map((inv: any) => (
                                <div key={inv.id} className="flex justify-between items-center p-4 bg-white/40 rounded-xl border border-white/20 hover:bg-white/60 transition-colors group relative">
                                    <div className="flex gap-4 items-center">
                                        <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-emerald-50 text-emerald-500">
                                            <FileText className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-800">{inv.project.name}</h4>
                                            <div className="flex gap-2 text-xs text-muted-foreground">
                                                <span>{format(new Date(inv.date), 'dd/MM/yyyy')}</span>
                                                <Badge variant="secondary" className="text-[10px] h-4">{inv.status}</Badge>
                                                <span className="text-[10px] font-bold text-slate-400">#{inv.invoiceNumber}</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-6">
                                        <div className="text-left">
                                            <p className="font-bold text-lg text-primary">{inv.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} SAR</p>
                                            <p className="text-[10px] text-emerald-600">VAT: {inv.vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                        </div>

                                        <div className="flex gap-2">
                                            <Link href={`./invoices/${inv.id}`}>
                                                <Button variant="outline" size="sm" className="h-8 gap-1 text-xs">
                                                    <Eye className="h-3 w-3" />
                                                    عرض
                                                </Button>
                                            </Link>
                                            {inv.file && (
                                                <a href={inv.file} target="_blank">
                                                    <Button variant="secondary" size="sm" className="h-8 text-[10px]">
                                                        PDF
                                                    </Button>
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {invoices.length === 0 && (
                                <div className="text-center py-10 text-muted-foreground">
                                    لا توجد فواتير صادرة
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
