"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Pencil, Trash2, AlertCircle, KeyRound, Loader2 } from "lucide-react"
import { updateStaffProfile, deleteStaff, adminForcePasswordChange } from "@/app/admin/hr/actions"
import { useRouter, usePathname } from "next/navigation"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export function EditStaffDialog({ staff, managers, branches = [] }: { staff: any, managers: { id: string, name: string }[], branches?: any[] }) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [deleteLoading, setDeleteLoading] = useState(false)
    const [passwordLoading, setPasswordLoading] = useState(false)
    const [newAdminPass, setNewAdminPass] = useState("")
    const [branchId, setBranchId] = useState(staff.branchId || "")
    const router = useRouter()
    const pathname = usePathname()

    // Live Finance State for Cost Preview
    const [finances, setFinances] = useState({
        basic: staff.profile?.basicSalary || 0,
        housing: staff.profile?.housingAllowance || 0,
        transport: staff.profile?.transportAllowance || 0,
        other: staff.profile?.otherAllowance || 0,
        gosi: staff.profile?.gosiDeduction || 0,
    })

    const totalCost = finances.basic + finances.housing + finances.transport + finances.other - finances.gosi

    useEffect(() => {
        if (staff.branchId) {
            setBranchId(staff.branchId)
        }
        setFinances({
            basic: staff.basicSalary ?? staff.profile?.basicSalary ?? 0,
            housing: staff.housingAllowance ?? staff.profile?.housingAllowance ?? 0,
            transport: staff.transportAllowance ?? staff.profile?.transportAllowance ?? 0,
            other: staff.otherAllowance ?? staff.profile?.otherAllowance ?? 0,
            gosi: staff.gosiDeduction ?? staff.profile?.gosiDeduction ?? 0,
        })
    }, [staff])

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        const formData = new FormData(e.currentTarget)

        // Enforce branchId
        if (branchId) formData.set("branchId", branchId)

        try {
            const res = await updateStaffProfile(staff.id, formData)
            if (res.success) {
                setOpen(false)
                router.refresh()
            } else {
                alert(res.error || "Something went wrong")
            }
        } catch (error) {
            alert("An unexpected error occurred")
        } finally {
            setLoading(false)
        }
    }

    async function handleDelete() {
        if (!confirm("Are you sure you want to delete this user?")) return

        setDeleteLoading(true)
        try {
            const res = await deleteStaff(staff.id)
            if (res.success) {
                setOpen(false)
                // If on the profile page, redirect to HR dashboard
                if (pathname?.includes(staff.id)) {
                    router.push('/admin/hr')
                } else {
                    router.refresh()
                }
            } else {
                alert(res.error || "Failed to delete user")
            }
        } finally {
            setDeleteLoading(false)
        }
    }

    async function handlePasswordReset() {
        if (!newAdminPass || newAdminPass.length < 6) {
            alert("Password must be at least 6 characters")
            return
        }
        if (!confirm("Are you sure you want to force change this user's password?")) return

        setPasswordLoading(true)
        try {
            const res = await adminForcePasswordChange(staff.id, newAdminPass)
            if (res.success) {
                alert(res.message)
                setNewAdminPass("")
            } else {
                alert(res.error || "Failed to reset password")
            }
        } finally {
            setPasswordLoading(false)
        }
    }

    const formatDateForInput = (date: Date | null | string) => {
        if (!date) return ""
        const d = new Date(date)
        return d.toISOString().split('T')[0]
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-xl border-slate-200 hover:bg-slate-50 hover:text-primary transition-colors">
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit Profile
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto rtl:text-right border-none shadow-2xl bg-white/95 backdrop-blur-xl">
                <form key={staff.updatedAt || staff.id} onSubmit={handleSubmit}>
                    <DialogHeader className="border-b border-slate-100 pb-4 mb-6">
                        <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                                <Pencil className="h-4 w-4" />
                            </div>
                            Edit Staff Profile | تعديل بيانات الموظف
                        </DialogTitle>
                        <DialogDescription className="text-slate-500">
                            Update personal, legal, and financial information for <span className="font-bold text-slate-900">{staff.name}</span>.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-6 py-2">
                        {/* Section 1: Basic Info */}
                        <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 space-y-4">
                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                                Basic Information
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Full Name</Label>
                                    <Input id="name" name="name" defaultValue={staff.name} required className="rounded-xl border-slate-200" />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="nationality">Nationality</Label>
                                    <Input id="nationality" name="nationality" defaultValue={staff.nationality} className="rounded-xl border-slate-200" />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="branchId">Assigned Branch</Label>
                                    <Select value={branchId} onValueChange={setBranchId}>
                                        <SelectTrigger className="rounded-xl border-slate-200">
                                            <SelectValue placeholder="Select Branch" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {branches.map(b => (
                                                <SelectItem key={b.id} value={b.id}>{b.nameEn}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="directManagerId">Direct Manager</Label>
                                    <Select name="directManagerId" defaultValue={staff.directManagerId || "NONE"}>
                                        <SelectTrigger className="rounded-xl border-slate-200">
                                            <SelectValue placeholder="بدون مدير (اختياري)" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="NONE">بدون مدير مباشر</SelectItem>
                                            {managers.map(m => (
                                                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="googleEmail">Official Email</Label>
                                    <Input id="googleEmail" name="googleEmail" type="email" defaultValue={staff.googleEmail} className="rounded-xl border-slate-200" />
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Legal */}
                        <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 space-y-4">
                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                Legal Documents
                            </h3>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="passportNumber">Passport No.</Label>
                                    <Input id="passportNumber" name="passportNumber" defaultValue={staff.passportNumber} className="rounded-xl border-slate-200" />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="passportIssueDate">Issue Date</Label>
                                    <Input id="passportIssueDate" name="passportIssueDate" type="date" defaultValue={formatDateForInput(staff.passportIssueDate)} className="rounded-xl border-slate-200" />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="passportExpiryDate">Expiry Date</Label>
                                    <Input id="passportExpiryDate" name="passportExpiryDate" type="date" defaultValue={formatDateForInput(staff.passportExpiryDate)} className="rounded-xl border-slate-200" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="iqamaNumber">Iqama / National ID</Label>
                                    <Input id="iqamaNumber" name="iqamaNumber" defaultValue={staff.iqamaNumber} className="rounded-xl border-slate-200" />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="iqamaExpiryDate">ID Expiry Date</Label>
                                    <Input id="iqamaExpiryDate" name="iqamaExpiryDate" type="date" defaultValue={formatDateForInput(staff.iqamaExpiryDate)} className="rounded-xl border-slate-200" />
                                </div>
                            </div>
                        </div>

                        {/* Section 3: Financial */}
                        <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 space-y-4">
                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                Finance & Contract
                            </h3>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="insuranceCompany">Insurance Provider</Label>
                                    <Input id="insuranceCompany" name="insuranceCompany" defaultValue={staff.insuranceCompany} className="rounded-xl border-slate-200" />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="policyNumber">Policy Number</Label>
                                    <Input id="policyNumber" name="policyNumber" defaultValue={staff.policyNumber} className="rounded-xl border-slate-200" />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="insuranceExpiryDate">Expiry Date</Label>
                                    <Input id="insuranceExpiryDate" name="insuranceExpiryDate" type="date" defaultValue={formatDateForInput(staff.insuranceExpiryDate)} className="rounded-xl border-slate-200" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="basicSalary">Basic Salary</Label>
                                    <Input
                                        id="basicSalary"
                                        name="basicSalary"
                                        type="number"
                                        step="0.01"
                                        value={finances.basic}
                                        onChange={e => setFinances({ ...finances, basic: parseFloat(e.target.value) || 0 })}
                                        className="rounded-xl bg-slate-50 border-slate-200 font-bold"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="housingAllowance">Housing Allowance</Label>
                                    <Input
                                        id="housingAllowance"
                                        name="housingAllowance"
                                        type="number"
                                        step="0.01"
                                        value={finances.housing}
                                        onChange={e => setFinances({ ...finances, housing: parseFloat(e.target.value) || 0 })}
                                        className="rounded-xl bg-slate-50 border-slate-200 font-bold"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="transportAllowance">Transport Allowance</Label>
                                    <Input
                                        id="transportAllowance"
                                        name="transportAllowance"
                                        type="number"
                                        step="0.01"
                                        value={finances.transport}
                                        onChange={e => setFinances({ ...finances, transport: parseFloat(e.target.value) || 0 })}
                                        className="rounded-xl bg-slate-50 border-slate-200 font-bold"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="otherAllowance">Other Allowance</Label>
                                    <Input
                                        id="otherAllowance"
                                        name="otherAllowance"
                                        type="number"
                                        step="0.01"
                                        value={finances.other}
                                        onChange={e => setFinances({ ...finances, other: parseFloat(e.target.value) || 0 })}
                                        className="rounded-xl bg-slate-50 border-slate-200 font-bold"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="gosiDeduction">GOSI / Insurance Deduction</Label>
                                    <Input
                                        id="gosiDeduction"
                                        name="gosiDeduction"
                                        type="number"
                                        step="0.01"
                                        value={finances.gosi}
                                        onChange={e => setFinances({ ...finances, gosi: parseFloat(e.target.value) || 0 })}
                                        className="rounded-xl bg-red-50 border-red-200 text-red-600 font-bold"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="hireDate">Hire Date</Label>
                                    <Input id="hireDate" name="hireDate" type="date" defaultValue={formatDateForInput(staff.hireDate)} className="rounded-xl border-slate-200" />
                                </div>
                            </div>

                            {/* Live Cost Preview */}
                            <div className="mt-4 bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-bold text-indigo-900 uppercase">إجمالي كلفة التعديلات</p>
                                    <p className="text-[10px] text-indigo-600">Total Est. Monthly Cost</p>
                                </div>
                                <div className="text-2xl font-black text-indigo-700">
                                    {totalCost.toLocaleString()} <span className="text-sm font-bold text-indigo-400">SAR</span>
                                </div>
                            </div>
                        </div>

                        {/* Section 4: Security (Admin Only) */}
                        <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 space-y-4">
                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                                Security (Force Password Reset)
                            </h3>
                            <div className="flex gap-4 items-end">
                                <div className="grid gap-2 flex-1">
                                    <Label htmlFor="newAdminPass">New Password</Label>
                                    <Input
                                        id="newAdminPass"
                                        type="password"
                                        value={newAdminPass}
                                        onChange={(e) => setNewAdminPass(e.target.value)}
                                        placeholder="••••••••"
                                        className="rounded-xl border-slate-200"
                                    />
                                </div>
                                <Button
                                    type="button"
                                    onClick={handlePasswordReset}
                                    disabled={passwordLoading || !newAdminPass}
                                    className="rounded-xl h-10 bg-slate-900 text-white hover:bg-slate-800"
                                >
                                    {passwordLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <KeyRound className="h-4 w-4 mr-2" />}
                                    Reset Password
                                </Button>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="flex justify-between items-center sm:justify-between pt-4 border-t border-slate-100">
                        <Button
                            variant="destructive"
                            type="button"
                            onClick={handleDelete}
                            disabled={deleteLoading}
                            className="rounded-xl h-11 bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 shadow-none"
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {deleteLoading ? "Deleting..." : "Delete User"}
                        </Button>

                        <Button type="submit" disabled={loading} className="rounded-xl h-11 px-8 shadow-lg shadow-primary/20 hover:shadow-xl transition-all">
                            {loading ? "Saving Changes..." : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
