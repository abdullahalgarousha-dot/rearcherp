"use client"

import { useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Clock,
    ShieldAlert,
    Wallet,
    Settings2,
    Save,
    CreditCard
} from "lucide-react"
import { toast } from "sonner"
import { updateAttendance, issuePenalty, manageLoan, deductLoanInstallment } from "@/app/admin/hr/actions"

interface EmployeeControlDialogProps {
    employee: any
    trigger?: React.ReactNode
}

export function EmployeeControlDialog({ employee, trigger }: EmployeeControlDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    // Form States
    const [attendance, setAttendance] = useState({
        workHoursMonth: employee.profile?.hrStats?.workHoursMonth?.toString() || "",
        lateMinutes: employee.profile?.hrStats?.lateMinutes?.toString() || "",
        absentDays: employee.profile?.hrStats?.absentDays?.toString() || "",
    })

    const [penalty, setPenalty] = useState({
        type: "LATE",
        amount: "",
        reason: ""
    })

    const [loan, setLoan] = useState({
        amount: "",
        installments: "6",
        reason: ""
    })

    const handleUpdateAttendance = async () => {
        setLoading(true)
        const payload = {
            workHoursMonth: parseFloat(attendance.workHoursMonth as string) || 0,
            lateMinutes: parseInt(attendance.lateMinutes as string) || 0,
            absentDays: parseInt(attendance.absentDays as string) || 0
        }
        const res = await updateAttendance(employee.profile.id, payload)
        setLoading(false)
        if (res.success) {
            toast.success("Attendance updated successfully")
        } else {
            toast.error(res.error || "Failed to update attendance")
        }
    }

    const handleIssuePenalty = async () => {
        if (!penalty.amount || !penalty.reason) return toast.error("Please fill all fields")
        setLoading(true)
        const res = await issuePenalty(employee.profile.id, {
            ...penalty,
            amount: parseFloat(penalty.amount)
        })
        setLoading(false)
        if (res.success) {
            toast.success("Penalty issued")
            setPenalty({ type: "LATE", amount: "", reason: "" })
        } else {
            toast.error(res.error || "Failed")
        }
    }

    const handleManageLoan = async () => {
        if (!loan.amount || !loan.reason) return toast.error("Please fill all fields")
        setLoading(true)
        const res = await manageLoan(employee.profile.id, {
            amount: parseFloat(loan.amount),
            installments: parseInt(loan.installments),
            reason: loan.reason
        })
        setLoading(false)
        if (res.success) {
            toast.success("Loan granted")
            setLoan({ amount: "", installments: "6", reason: "" })
        } else {
            toast.error(res.error || "Failed")
        }
    }

    const handleDeductLoan = async (loanId: string, amount: number) => {
        if (!amount || amount <= 0) return toast.error("Invalid amount")
        setLoading(true)
        const res = await deductLoanInstallment(loanId, amount)
        setLoading(false)
        if (res.success) {
            toast.success("Installment deducted successfully and receipt generated in Drive")
            setOpen(false) // Close to refresh data from server
        } else {
            toast.error(res.error || "Failed to deduct")
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="sm" className="h-8 rounded-lg gap-2">
                        <Settings2 className="h-3.5 w-3.5" />
                        Manage
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden border-none shadow-2xl rounded-[2rem]">
                <div className="bg-slate-900 p-8 text-white relative">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <Settings2 size={120} />
                    </div>
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black flex items-center gap-3">
                            إدارة الموظف | Manage Employee
                        </DialogTitle>
                        <p className="text-slate-400 font-medium">{employee.name} - {employee.profile?.position}</p>
                    </DialogHeader>
                </div>

                <div className="bg-white p-6">
                    <Tabs defaultValue="attendance" className="w-full">
                        <TabsList className="grid grid-cols-3 bg-slate-100 p-1 rounded-xl mb-8">
                            <TabsTrigger value="attendance" className="rounded-lg gap-2 font-bold text-xs">
                                <Clock size={14} />
                                الحضور
                            </TabsTrigger>
                            <TabsTrigger value="penalties" className="rounded-lg gap-2 font-bold text-xs">
                                <ShieldAlert size={14} />
                                الجزاءات
                            </TabsTrigger>
                            <TabsTrigger value="loans" className="rounded-lg gap-2 font-bold text-xs">
                                <Wallet size={14} />
                                القروض
                            </TabsTrigger>
                        </TabsList>

                        <div className="min-h-[300px]">
                            {/* 1. Attendance Tab */}
                            <TabsContent value="attendance" className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-black text-slate-500 uppercase">ساعات العمل (الشهر الحالي)</Label>
                                        <Input
                                            type="number"
                                            value={attendance.workHoursMonth}
                                            onChange={(e) => setAttendance({ ...attendance, workHoursMonth: e.target.value })}
                                            className="rounded-xl border-slate-200"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-black text-slate-500 uppercase">دقائق التأخير</Label>
                                        <Input
                                            type="number"
                                            value={attendance.lateMinutes}
                                            onChange={(e) => setAttendance({ ...attendance, lateMinutes: e.target.value })}
                                            className="rounded-xl border-slate-200"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-black text-slate-500 uppercase">أيام الغياب</Label>
                                        <Input
                                            type="number"
                                            value={attendance.absentDays}
                                            onChange={(e) => setAttendance({ ...attendance, absentDays: e.target.value })}
                                            className="rounded-xl border-slate-200"
                                        />
                                    </div>
                                </div>
                                <Button
                                    onClick={handleUpdateAttendance}
                                    disabled={loading}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 rounded-xl h-12 font-bold gap-2"
                                >
                                    <Save size={18} />
                                    تحديث البيانات | Save Changes
                                </Button>
                            </TabsContent>

                            {/* 2. Penalties Tab */}
                            <TabsContent value="penalties" className="space-y-6">
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-black text-slate-500 uppercase">نوع الجزاء</Label>
                                            <Select
                                                value={penalty.type}
                                                onValueChange={(v) => setPenalty({ ...penalty, type: v })}
                                            >
                                                <SelectTrigger className="rounded-xl">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="LATE">تأخير</SelectItem>
                                                    <SelectItem value="ABSENCE">غياب</SelectItem>
                                                    <SelectItem value="VIOLATION">مخالفة نظام</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-black text-slate-500 uppercase">المبلغ المخصوم (SAR)</Label>
                                            <Input
                                                type="number"
                                                placeholder="0.00"
                                                value={penalty.amount}
                                                onChange={(e) => setPenalty({ ...penalty, amount: e.target.value })}
                                                className="rounded-xl"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-black text-slate-500 uppercase">سبب الجزاء</Label>
                                        <Textarea
                                            placeholder="اكتب السبب هنا..."
                                            value={penalty.reason}
                                            onChange={(e) => setPenalty({ ...penalty, reason: e.target.value })}
                                            className="rounded-xl min-h-[100px]"
                                        />
                                    </div>
                                    <Button
                                        onClick={handleIssuePenalty}
                                        disabled={loading}
                                        className="w-full bg-red-600 hover:bg-red-700 rounded-xl h-12 font-bold gap-2"
                                    >
                                        <ShieldAlert size={18} />
                                        إصدار الجزاء | Issue Penalty
                                    </Button>
                                </div>
                            </TabsContent>

                            {/* 3. Loans Tab */}
                            <TabsContent value="loans" className="space-y-6">
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-black text-slate-500 uppercase">مبلغ القرض (SAR)</Label>
                                            <Input
                                                type="number"
                                                placeholder="5000"
                                                value={loan.amount}
                                                onChange={(e) => setLoan({ ...loan, amount: e.target.value })}
                                                className="rounded-xl"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-black text-slate-500 uppercase">عدد الاشهر</Label>
                                            <Select
                                                value={loan.installments}
                                                onValueChange={(v) => setLoan({ ...loan, installments: v })}
                                            >
                                                <SelectTrigger className="rounded-xl">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="3">3 أشهر</SelectItem>
                                                    <SelectItem value="6">6 أشهر</SelectItem>
                                                    <SelectItem value="12">12 شهر</SelectItem>
                                                    <SelectItem value="24">24 شهر</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-black text-slate-500 uppercase">الغرض من القرض</Label>
                                        <Textarea
                                            placeholder="اكتب التوضيح هنا..."
                                            value={loan.reason}
                                            onChange={(e) => setLoan({ ...loan, reason: e.target.value })}
                                            className="rounded-xl h-[80px]"
                                        />
                                    </div>
                                    <Button
                                        onClick={handleManageLoan}
                                        disabled={loading}
                                        className="w-full bg-emerald-600 hover:bg-emerald-700 rounded-xl h-12 font-bold gap-2"
                                    >
                                        <Wallet size={18} />
                                        منح القرض | Grant Loan
                                    </Button>

                                    {/* Active Loans List & Deduction */}
                                    {employee.profile?.loans && employee.profile.loans.length > 0 && (
                                        <div className="mt-8 border-t pt-6">
                                            <h4 className="text-sm font-bold text-slate-800 mb-4">القروض النشطة | Active Loans</h4>
                                            <div className="space-y-4">
                                                {employee.profile.loans.filter((l: any) => l.status === 'ACTIVE').map((activeLoan: any) => (
                                                    <div key={activeLoan.id} className="bg-slate-50 p-4 rounded-xl border flex items-center justify-between">
                                                        <div>
                                                            <div className="font-bold text-emerald-700">{activeLoan.totalAmount} SAR Total</div>
                                                            <div className="text-xs text-slate-500">
                                                                Paid: {activeLoan.paidAmount} / Remaining: {activeLoan.totalAmount - activeLoan.paidAmount} SAR
                                                            </div>
                                                            <div className="text-xs text-slate-400 mt-1">
                                                                Suggested Deduction: {activeLoan.monthlyInstallment.toFixed(2)} SAR/mo
                                                            </div>
                                                        </div>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="border-amber-200 text-amber-700 hover:bg-amber-50"
                                                            disabled={loading}
                                                            onClick={() => {
                                                                const amtStr = prompt("Enter deduction amount (SAR):", activeLoan.monthlyInstallment.toString());
                                                                if (amtStr) {
                                                                    const amt = parseFloat(amtStr);
                                                                    if (!isNaN(amt)) handleDeductLoan(activeLoan.id, amt);
                                                                }
                                                            }}
                                                        >
                                                            <CreditCard size={14} className="mr-2" />
                                                            Deduct Now
                                                        </Button>
                                                    </div>
                                                ))}
                                                {employee.profile.loans.filter((l: any) => l.status === 'ACTIVE').length === 0 && (
                                                    <div className="text-sm text-slate-500 italic">No active loans found.</div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>
            </DialogContent>
        </Dialog>
    )
}
