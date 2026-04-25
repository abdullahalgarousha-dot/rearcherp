"use client"

import { useState, useEffect, useRef } from "react"
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
import { Pencil, Trash2, KeyRound, Loader2, ShieldCheck } from "lucide-react"
import { updateStaffProfile, deleteStaff, adminForcePasswordChange } from "@/app/admin/hr/actions"
import { toast } from "sonner"
import { computeMonthlyCost } from "@/lib/payroll-utils"
import { useRouter, usePathname } from "next/navigation"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { formatRoleName } from "@/lib/role-utils"
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

const SUPER_ADMIN_ROLES = ['GLOBAL_SUPER_ADMIN', 'SUPER_ADMIN']

export function EditStaffDialog({
    staff,
    managers,
    branches = [],
    roles = [],
    currentUserRole,
}: {
    staff: any
    managers: { id: string, name: string }[]
    branches?: any[]
    roles?: { id: string, name: string }[]
    currentUserRole?: string
}) {
    const canEditRBAC = SUPER_ADMIN_ROLES.includes(currentUserRole ?? '')
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [deleteLoading, setDeleteLoading] = useState(false)
    const [passwordLoading, setPasswordLoading] = useState(false)
    const [newAdminPass, setNewAdminPass] = useState("")
    const [branchId, setBranchId] = useState(staff.branchId || "")
    const [selectedRoleId, setSelectedRoleId] = useState(staff.roleId || "")
    const [selectedAccessScope, setSelectedAccessScope] = useState(staff.accessScope || "ALL")
    const [photoPreview, setPhotoPreview] = useState<string | null>(staff.photo || null)
    const fileInputRef = useRef<HTMLInputElement>(null)
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

    const totalCost = computeMonthlyCost({
        basicSalary: finances.basic,
        housingAllowance: finances.housing,
        transportAllowance: finances.transport,
        otherAllowance: finances.other,
        gosiDeduction: finances.gosi,
    })

    useEffect(() => {
        if (staff.branchId) {
            setBranchId(staff.branchId)
        }
        setSelectedRoleId(staff.roleId || "")
        setSelectedAccessScope(staff.accessScope || "ALL")
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

        // Enforce RBAC selects (shadcn Select doesn't write to FormData natively)
        if (canEditRBAC) {
            formData.set("roleId", selectedRoleId)
            formData.set("accessScope", selectedAccessScope)
        }

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
                toast.success(res.message || "Password updated successfully")
                setNewAdminPass("")
            } else {
                toast.error(res.error || "Failed to reset password")
            }
        } catch (error: any) {
            toast.error(error.message || "An unexpected error occurred")
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
                <form key={staff.updatedAt?.toString?.() || staff.id} onSubmit={handleSubmit}>
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
                                    <Input id="name" name="name" defaultValue={staff.name ?? ''} required className="rounded-xl border-slate-200" />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="nationality">Nationality</Label>
                                    <Input id="nationality" name="nationality" defaultValue={staff.nationality ?? staff.profile?.nationality ?? ''} className="rounded-xl border-slate-200" />
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
                                    <Input id="googleEmail" name="googleEmail" type="email" defaultValue={staff.googleEmail ?? staff.profile?.googleEmail ?? ''} className="rounded-xl border-slate-200" />
                                </div>
                            </div>
                        </div>

                        {/* Role & Access Scope — SUPER ADMIN ONLY */}
                        {canEditRBAC && (
                            <div className="mt-2 p-3 rounded-xl border border-indigo-100 bg-indigo-50/50 space-y-3">
                                <p className="text-xs font-bold text-indigo-700 flex items-center gap-1.5">
                                    <ShieldCheck className="h-3.5 w-3.5" />
                                    Role & Access Scope (Admin Only)
                                </p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="roleId" className="text-xs text-indigo-900">Role (الدور)</Label>
                                        <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                                            <SelectTrigger className="rounded-xl border-indigo-200 bg-white">
                                                <SelectValue placeholder="Select role..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {roles.map(r => (
                                                    <SelectItem key={r.id} value={r.id}>{formatRoleName(r.name)}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="accessScope" className="text-xs text-indigo-900">Access Scope (نطاق الصلاحية)</Label>
                                        <Select value={selectedAccessScope} onValueChange={setSelectedAccessScope}>
                                            <SelectTrigger className="rounded-xl border-indigo-200 bg-white">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="ALL">ALL — كافة الفروع</SelectItem>
                                                <SelectItem value="BRANCH">BRANCH — محدود بفرع الموظف</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Section 1b: Avatar */}
                        <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 space-y-3">
                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-violet-500"></span>
                                Profile Photo
                            </h3>
                            <div className="flex items-center gap-4">
                                <div className="h-16 w-16 rounded-2xl bg-slate-200 flex items-center justify-center text-2xl font-black text-slate-400 overflow-hidden flex-shrink-0 ring-2 ring-offset-2 ring-violet-100">
                                    {photoPreview
                                        ? <img src={photoPreview} alt="avatar preview" className="h-full w-full object-cover" />
                                        : (staff.name?.charAt(0)?.toUpperCase() || '?')
                                    }
                                </div>
                                <div className="flex-1 grid gap-2">
                                    <Label htmlFor="photo">Upload Photo</Label>
                                    <input
                                        ref={fileInputRef}
                                        id="photo"
                                        name="photo"
                                        type="file"
                                        accept="image/*"
                                        className="block w-full text-sm text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100 rounded-xl border border-slate-200 cursor-pointer"
                                        onChange={e => {
                                            const file = e.target.files?.[0]
                                            if (file) {
                                                const url = URL.createObjectURL(file)
                                                setPhotoPreview(url)
                                            }
                                        }}
                                    />
                                    <p className="text-[10px] text-slate-400 font-medium">JPG, PNG, WebP — max 5 MB. Leave empty to keep existing photo.</p>
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
                                    {/* name="passportNumber" → server maps to DB field passportNum */}
                                    <Input id="passportNumber" name="passportNumber" defaultValue={staff.passportNum ?? staff.profile?.passportNum ?? ''} className="rounded-xl border-slate-200" />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="passportIssueDate">Issue Date</Label>
                                    <Input id="passportIssueDate" name="passportIssueDate" type="date" className="rounded-xl border-slate-200" />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="passportExpiryDate">Expiry Date</Label>
                                    {/* name="passportExpiryDate" → server maps to DB field passportExpiry */}
                                    <Input id="passportExpiryDate" name="passportExpiryDate" type="date" defaultValue={formatDateForInput(staff.passportExpiry ?? staff.profile?.passportExpiry)} className="rounded-xl border-slate-200" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="iqamaNumber">Iqama / National ID</Label>
                                    {/* name="iqamaNumber" → server maps to DB field idNumber */}
                                    <Input id="iqamaNumber" name="iqamaNumber" defaultValue={staff.idNumber ?? staff.profile?.idNumber ?? ''} className="rounded-xl border-slate-200" />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="iqamaExpiryDate">ID Expiry Date</Label>
                                    {/* name="iqamaExpiryDate" → server maps to DB field idExpiry */}
                                    <Input id="iqamaExpiryDate" name="iqamaExpiryDate" type="date" defaultValue={formatDateForInput(staff.idExpiry ?? staff.profile?.idExpiry)} className="rounded-xl border-slate-200" />
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
                                    {/* name="insuranceCompany" → server maps to DB field insuranceProvider */}
                                    <Input id="insuranceCompany" name="insuranceCompany" defaultValue={staff.insuranceProvider ?? staff.profile?.insuranceProvider ?? ''} className="rounded-xl border-slate-200" />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="policyNumber">Policy Number</Label>
                                    {/* name="policyNumber" → server maps to DB field insurancePolicy */}
                                    <Input id="policyNumber" name="policyNumber" defaultValue={staff.insurancePolicy ?? staff.profile?.insurancePolicy ?? ''} className="rounded-xl border-slate-200" />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="insuranceExpiryDate">Expiry Date</Label>
                                    {/* name="insuranceExpiryDate" → server maps to DB field insuranceExpiry */}
                                    <Input id="insuranceExpiryDate" name="insuranceExpiryDate" type="date" defaultValue={formatDateForInput(staff.insuranceExpiry ?? staff.profile?.insuranceExpiry)} className="rounded-xl border-slate-200" />
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
                                    <Input id="hireDate" name="hireDate" type="date" defaultValue={formatDateForInput(staff.hireDate ?? staff.profile?.hireDate)} className="rounded-xl border-slate-200" />
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
