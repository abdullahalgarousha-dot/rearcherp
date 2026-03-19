import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BackButton } from "@/components/ui/back-button"
import { createExpense } from "../actions"
import { format } from "date-fns"
import { Plus, Wallet, FileText } from "lucide-react"

export default async function ExpensesPage() {
    const session = await auth()
    if (!['ADMIN', 'ACCOUNTANT', 'GLOBAL_SUPER_ADMIN'].includes((session?.user as any)?.role)) {
        redirect('/')
    }

    const tenantId = (session?.user as any)?.tenantId
    const isGlobalAdmin = (session?.user as any)?.role === 'GLOBAL_SUPER_ADMIN'
    const tenantFilter = isGlobalAdmin ? {} : { tenantId }

    const [expenses, projects] = await Promise.all([
        db.expense.findMany({
            where: tenantFilter,
            include: { project: true },
            orderBy: { date: 'desc' }
        }),
        db.project.findMany({
            where: tenantFilter,
            select: { id: true, name: true, code: true }
        })
    ])

    return (
        <div className="space-y-6 rtl:text-right pb-20">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <BackButton />
                    <h1 className="text-3xl font-bold tracking-tight text-primary">المصروفات التشغيلية</h1>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {/* New Expense Form */}
                <Card className="border-none shadow-lg bg-white/60 backdrop-blur-xl md:col-span-1 h-fit">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Plus className="h-5 w-5 text-primary" />
                            تسجيل مصروف جديد
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form action={createExpense as any} className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="description">الوصف</Label>
                                <Input id="description" name="description" required placeholder="مثال: فاتورة كهرباء يناير" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="amountBeforeTax">القيمة (قبل الضريبة)</Label>
                                <Input id="amountBeforeTax" name="amountBeforeTax" type="number" step="0.01" required />
                            </div>
                            <div className="flex items-center gap-2 border p-3 rounded-xl bg-white/50">
                                <input type="checkbox" name="isTaxRecoverable" id="isTaxRecoverable" defaultChecked className="h-4 w-4 accent-primary" />
                                <Label htmlFor="isTaxRecoverable" className="cursor-pointer">ضريبة مستردة (Recoverable VAT 15%)</Label>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="category">التصنيف</Label>
                                <Select name="category" defaultValue="Office">
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Rent">إيجار (Rent)</SelectItem>
                                        <SelectItem value="Utilities">مرافق (Utilities)</SelectItem>
                                        <SelectItem value="Salaries">رواتب (Salaries)</SelectItem>
                                        <SelectItem value="Software">برمجيات (Software)</SelectItem>
                                        <SelectItem value="Office">مكتب (Office)</SelectItem>
                                        <SelectItem value="Travel">انتقالات (Travel)</SelectItem>
                                        <SelectItem value="Other">أخرى (Other)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="date">التاريخ</Label>
                                <Input id="date" name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="projectId">المشروع المرتبط (اختياري)</Label>
                                <Select name="projectId">
                                    <SelectTrigger>
                                        <SelectValue placeholder="اختر المشروع (إن وجد)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">بدون مشروع (عام)</SelectItem>
                                        {projects.map(p => (
                                            <SelectItem key={p.id} value={p.id}>{p.code} - {p.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="receipt">صورة الإيصال (اختياري)</Label>
                                <Input id="receipt" name="receipt" type="file" className="file:bg-primary/10 file:text-primary file:border-0 file:rounded-lg" />
                            </div>

                            <Button type="submit" className="w-full rounded-xl bg-primary hover:bg-primary/90">
                                حفظ المصروف
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Expenses List */}
                <Card className="border-none shadow-lg bg-white/60 backdrop-blur-xl md:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Wallet className="h-5 w-5 text-red-500" />
                            سجل المصروفات
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {expenses.map((exp: any) => (
                                <div key={exp.id} className="flex justify-between items-center p-4 bg-white/40 rounded-xl border border-white/20 hover:bg-white/60 transition-colors group">
                                    <div className="flex gap-4 items-center">
                                        <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-red-50 text-red-500">
                                            <FileText className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-800">{exp.description}</h4>
                                            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                                <span>{format(new Date(exp.date), 'dd/MM/yyyy')}</span>
                                                <span>•</span>
                                                <span className="bg-gray-100 px-2 rounded-md">{exp.category}</span>
                                                {exp.project && (
                                                    <>
                                                        <span>•</span>
                                                        <span className="text-primary font-medium">{exp.project.name}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-left">
                                        <p className="font-bold text-lg text-primary">{exp.totalAmount.toLocaleString()} SAR</p>
                                        <p className="text-[10px] text-slate-400">Base: {exp.amountBeforeTax.toLocaleString()}</p>
                                        {exp.taxAmount > 0 && (
                                            <p className={`text-[10px] ${exp.isTaxRecoverable ? 'text-emerald-600' : 'text-rose-500'}`}>
                                                VAT: {exp.taxAmount.toLocaleString()} {exp.isTaxRecoverable ? '(Recoverable)' : '(Non-Recoverable)'}
                                            </p>
                                        )}
                                        {exp.receipt && (
                                            <a href={exp.receipt} target="_blank" className="text-[10px] text-blue-600 hover:underline block mt-1">
                                                عرض الإيصال
                                            </a>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {expenses.length === 0 && (
                                <div className="text-center py-10 text-muted-foreground">
                                    لا توجد مصروفات مسجلة
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
