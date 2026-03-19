import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BackButton } from "@/components/ui/back-button"
import { createInvoice } from "../actions"
import { format } from "date-fns"
import { Plus, FileText } from "lucide-react"
import { Badge } from "@/components/ui/badge"

async function getData() {
    const projects = await db.project.findMany({ select: { id: true, name: true, code: true } })
    const invoices = await db.invoice.findMany({
        include: { project: true },
        orderBy: { date: 'desc' }
    })
    return { projects, invoices }
}

export default async function InvoicesPage() {
    const session = await auth()
    if (!['ADMIN', 'ACCOUNTANT', 'GLOBAL_SUPER_ADMIN', 'SUPER_ADMIN'].includes((session?.user as any)?.role)) {
        redirect('/')
    }

    const { projects, invoices } = await getData()

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
                            إصدار فاتورة مشروع
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form action={createInvoice as any} className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="invoiceNumber">رقم الفاتورة (Invoice #)</Label>
                                <Input id="invoiceNumber" name="invoiceNumber" required placeholder="INV-2026-00x" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="description">الوصف / البيان</Label>
                                <Input id="description" name="description" required placeholder="دفعة مقدمة / مستخلص رقم 1" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="projectId">المشروع</Label>
                                <Select name="projectId" required>
                                    <SelectTrigger>
                                        <SelectValue placeholder="اختر المشروع" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {projects.map(p => (
                                            <SelectItem key={p.id} value={p.id}>{p.code} - {p.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="subtotal">قيمة الفاتورة (Base Amount)</Label>
                                <Input id="subtotal" name="subtotal" type="number" step="0.01" required placeholder="SAR" />
                                <p className="text-[10px] text-muted-foreground">سيتم إضافة 15% ضريبة تلقائياً</p>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="date">تاريخ الإصدار</Label>
                                <Input id="date" name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="file">ملف الفاتورة PDF (اختياري)</Label>
                                <Input id="file" name="file" type="file" accept="application/pdf" className="file:bg-primary/10 file:text-primary file:border-0 file:rounded-lg" />
                            </div>

                            <Button type="submit" className="w-full rounded-xl bg-primary hover:bg-primary/90">
                                حفظ وإصدار الفاتورة
                            </Button>
                        </form>
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
                                <div key={inv.id} className="flex justify-between items-center p-4 bg-white/40 rounded-xl border border-white/20 hover:bg-white/60 transition-colors group">
                                    <div className="flex gap-4 items-center">
                                        <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-emerald-50 text-emerald-500">
                                            <FileText className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-800">{inv.project.name}</h4>
                                            <div className="flex gap-2 text-xs text-muted-foreground">
                                                <span>{format(new Date(inv.date), 'dd/MM/yyyy')}</span>
                                                <Badge variant="secondary" className="text-[10px] h-4">{inv.status}</Badge>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-left">
                                        <p className="font-bold text-lg text-primary">{inv.totalAmount.toLocaleString()} SAR</p>
                                        <p className="text-[10px] text-emerald-600">VAT: {inv.vatAmount.toLocaleString()}</p>
                                        <p className="text-[9px] text-slate-400 font-bold">Base: {inv.baseAmount.toLocaleString()}</p>

                                        {inv.file && (
                                            <a href={inv.file} target="_blank" className="text-[10px] text-blue-600 hover:underline block mt-1">
                                                تحميل PDF
                                            </a>
                                        )}
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
