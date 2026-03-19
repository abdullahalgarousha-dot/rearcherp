"use client"

import { useState, useEffect } from "react"
import { useFormStatus } from "react-dom"
import { PlusCircle, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { createRole, updateRole } from "./actions"

const DEFAULT_MATRIX = {
    projects: { view: 'NONE', createEdit: false, approve: false, delete: false, canAccessDrive: false },
    supervision: { view: 'NONE', manageDSR: false, manageIR: false, manageNCR: false, deleteReports: false },
    hr: { view: 'NONE', createEdit: false, approveLeaves: false, delete: false, viewOfficialDocs: false, viewMedicalLeaves: false },
    finance: { masterVisible: false, viewContracts: false, viewVATReports: false, viewSalarySheets: false, manageLoans: false },
    system: { manageSettings: false, manageRoles: false, viewLogs: false, viewAnalytics: false }
}

function SubmitButton({ isEdit }: { isEdit: boolean }) {
    const { pending } = useFormStatus()
    return (
        <Button type="submit" className="w-full font-bold bg-indigo-600 hover:bg-indigo-700 text-white" disabled={pending}>
            {pending ? "جاري الحفظ..." : isEdit ? "حفظ التعديلات" : "إنشاء المسمى الوظيفي"}
        </Button>
    )
}

export function RoleModal({ existingRole, open, setOpen, presetName }: { existingRole?: any, open?: boolean, setOpen?: (val: boolean) => void, presetName?: string }) {
    const [isOpen, setIsOpen] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const isControlled = open !== undefined && setOpen !== undefined
    const dialogOpen = isControlled ? open : isOpen
    const setDialogOpen = isControlled ? setOpen : setIsOpen

    const [matrix, setMatrix] = useState<any>(DEFAULT_MATRIX)

    useEffect(() => {
        if (existingRole && existingRole.permissionMatrix) {
            try {
                const parsed = JSON.parse(existingRole.permissionMatrix)
                // Merge with DEFAULT_MATRIX to ensure all keys exist
                setMatrix({
                    projects: { ...DEFAULT_MATRIX.projects, ...(parsed.projects || {}) },
                    supervision: { ...DEFAULT_MATRIX.supervision, ...(parsed.supervision || {}) },
                    hr: { ...DEFAULT_MATRIX.hr, ...(parsed.hr || {}) },
                    finance: { ...DEFAULT_MATRIX.finance, ...(parsed.finance || {}) },
                    system: { ...DEFAULT_MATRIX.system, ...(parsed.system || {}) }
                })
            } catch (e) {
                setMatrix(DEFAULT_MATRIX)
            }
        } else {
            setMatrix(DEFAULT_MATRIX)
        }
    }, [existingRole, dialogOpen])

    const handleToggle = (module: string, key: string, value: boolean | string) => {
        setMatrix((prev: any) => ({
            ...prev,
            [module]: {
                ...prev[module],
                [key]: value
            }
        }))
    }

    async function submitAction(formData: FormData) {
        setError(null)
        formData.append("permissionMatrix", JSON.stringify(matrix))

        const res = existingRole && !presetName // If presetName is provided, we are duplicating
            ? await updateRole(existingRole.id, formData)
            : await createRole(formData)

        if (res.error) {
            setError(res.error)
        } else {
            setDialogOpen(false)
        }
    }

    const isSuperAdmin = existingRole?.name === 'SUPER_ADMIN' || existingRole?.name === 'ADMIN'

    return (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            {!isControlled && (
                <DialogTrigger asChild>
                    <Button className="font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm px-6">
                        <PlusCircle className="mr-2 h-5 w-5" />
                        إضافة مسمى وظيفي
                    </Button>
                </DialogTrigger>
            )}
            <DialogContent className="sm:max-w-4xl font-sans rtl:text-right overflow-y-auto max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black text-slate-800 flex items-center gap-2">
                        {existingRole && !presetName ? existingRole.name : presetName ? "نسخ المسمى إلى جديد" : "إنشاء مسمى وظيفي جديد"}
                    </DialogTitle>
                    <DialogDescription>
                        حدد اسم الصلاحية وصلاحيات الوصول للوحدات المختلفة في النظام بوضوح.
                    </DialogDescription>
                </DialogHeader>

                <form action={submitAction} className="space-y-6 mt-4">
                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-bold flex items-center gap-2">
                            <ShieldAlert className="h-4 w-4" /> {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-slate-700 font-bold">المسمى الوظيفي (Job Title)</Label>
                            <Input
                                id="name"
                                name="name"
                                defaultValue={presetName ? presetName : existingRole?.name}
                                placeholder="e.g. HR_MANAGER, SITE_ENGINEER"
                                required
                                className="bg-slate-50 border-slate-200"
                                readOnly={isSuperAdmin && !presetName}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description" className="text-slate-700 font-bold">الوصف التعريفي</Label>
                            <Input
                                id="description"
                                name="description"
                                defaultValue={existingRole?.description}
                                placeholder="مختص بإدارة الموارد البشرية..."
                                className="bg-slate-50 border-slate-200"
                            />
                        </div>
                    </div>

                    {isSuperAdmin && !presetName ? (
                        <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl text-orange-800 flex items-start gap-2">
                            <ShieldAlert className="h-5 w-5 mt-0.5" />
                            <div>
                                <p className="font-bold text-sm">مسمى إداري أساسي (System Default Role)</p>
                                <p className="text-xs mt-1">يتمتع بصلاحيات عبور وتخطي افتراضية من الخادم الأساسي ولا يتأثر بهذه المصفوفة كلياً.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 border border-slate-100 rounded-2xl bg-slate-50 p-4">
                            {/* HR Section */}
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 space-y-4">
                                <h3 className="font-bold text-indigo-700 border-b pb-2">الموارد البشرية (HR)</h3>
                                <div className="space-y-3">
                                    <div className="flex flex-col gap-2">
                                        <Label className="text-xs text-slate-500 font-bold">نطاق المشاهدة والإدارة</Label>
                                        <Select value={matrix.hr.view} onValueChange={(v) => handleToggle('hr', 'view', v)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="ALL_BRANCHES">جميع الفروع</SelectItem>
                                                <SelectItem value="ASSIGNED_BRANCH">فرع الموظف فقط</SelectItem>
                                                <SelectItem value="NONE">مخفي بالكامل</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Label>إضافة/تعديل الموظفين</Label>
                                        <Switch checked={matrix.hr.createEdit} onCheckedChange={(c: boolean) => handleToggle('hr', 'createEdit', c)} />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Label>اعتماد الإجازات (Approve)</Label>
                                        <Switch checked={matrix.hr.approveLeaves} onCheckedChange={(c: boolean) => handleToggle('hr', 'approveLeaves', c)} />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Label className="text-blue-600">الوصول للأوراق الرسمية (Drive)</Label>
                                        <Switch checked={matrix.hr.viewOfficialDocs} onCheckedChange={(c: boolean) => handleToggle('hr', 'viewOfficialDocs', c)} />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Label className="text-blue-600">الوصول للتقارير الطبية (Drive)</Label>
                                        <Switch checked={matrix.hr.viewMedicalLeaves} onCheckedChange={(c: boolean) => handleToggle('hr', 'viewMedicalLeaves', c)} />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Label className="text-red-500">حذف السجلات</Label>
                                        <Switch checked={matrix.hr.delete} onCheckedChange={(c: boolean) => handleToggle('hr', 'delete', c)} />
                                    </div>
                                </div>
                            </div>

                            {/* Finance Section */}
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 space-y-4">
                                <h3 className="font-bold text-emerald-700 border-b pb-2">المالية والحسابات (Finance)</h3>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between bg-emerald-50 p-2 rounded-lg">
                                        <Label className="font-bold text-emerald-800">إظهار الدفتر المالي كاملاً (Master View)</Label>
                                        <Switch checked={matrix.finance.masterVisible} onCheckedChange={(c: boolean) => handleToggle('finance', 'masterVisible', c)} />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Label>الاطلاع على العقود والفواتير</Label>
                                        <Switch checked={matrix.finance.viewContracts} onCheckedChange={(c: boolean) => handleToggle('finance', 'viewContracts', c)} />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Label>تقارير القيمة المضافة (VAT)</Label>
                                        <Switch checked={matrix.finance.viewVATReports} onCheckedChange={(c: boolean) => handleToggle('finance', 'viewVATReports', c)} />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Label>مسيرات الرواتب (Salary Sheets)</Label>
                                        <Switch checked={matrix.finance.viewSalarySheets} onCheckedChange={(c: boolean) => handleToggle('finance', 'viewSalarySheets', c)} />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Label className="text-orange-600 font-bold">اعتماد القروض (خصم آلي من الرواتب)</Label>
                                        <Switch checked={matrix.finance.manageLoans} onCheckedChange={(c: boolean) => handleToggle('finance', 'manageLoans', c)} />
                                    </div>
                                </div>
                            </div>

                            {/* Projects Section */}
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 space-y-4">
                                <h3 className="font-bold text-blue-700 border-b pb-2">إدارة المشاريع (Projects)</h3>
                                <div className="space-y-3">
                                    <div className="flex flex-col gap-2">
                                        <Label className="text-xs text-slate-500 font-bold">نطاق مشاهدة المشاريع</Label>
                                        <Select value={matrix.projects.view} onValueChange={(v) => handleToggle('projects', 'view', v)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="ALL">جميع المشاريع</SelectItem>
                                                <SelectItem value="ASSIGNED">المشاريع المعين فيها فقط</SelectItem>
                                                <SelectItem value="NONE">لا شيء</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Label>إنشاء وتعديل المشاريع/المهام</Label>
                                        <Switch checked={matrix.projects.createEdit} onCheckedChange={(c: boolean) => handleToggle('projects', 'createEdit', c)} />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Label className="text-blue-600">تحميل الصور والمرفقات (Drive Access)</Label>
                                        <Switch checked={matrix.projects.canAccessDrive} onCheckedChange={(c: boolean) => handleToggle('projects', 'canAccessDrive', c)} />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Label className="text-red-500">حذف المشاريع والملفات</Label>
                                        <Switch checked={matrix.projects.delete} onCheckedChange={(c: boolean) => handleToggle('projects', 'delete', c)} />
                                    </div>
                                </div>
                            </div>

                            {/* Supervision Section */}
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 space-y-4">
                                <h3 className="font-bold text-amber-700 border-b pb-2">الإشراف الميداني والتنفيذ</h3>
                                <div className="space-y-3">
                                    <div className="flex flex-col gap-2">
                                        <Label className="text-xs text-slate-500 font-bold">نطاق الوصول للتقارير</Label>
                                        <Select value={matrix.supervision.view} onValueChange={(v) => handleToggle('supervision', 'view', v)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="ALL">جميع التقارير المعمارية</SelectItem>
                                                <SelectItem value="ASSIGNED">تقارير مشاريعه فقط</SelectItem>
                                                <SelectItem value="NONE">لا شيء</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Label>إدارة التقارير اليومية (DSR)</Label>
                                        <Switch checked={matrix.supervision.manageDSR} onCheckedChange={(c: boolean) => handleToggle('supervision', 'manageDSR', c)} />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Label>إدارة طلبات الفحص (IR)</Label>
                                        <Switch checked={matrix.supervision.manageIR} onCheckedChange={(c: boolean) => handleToggle('supervision', 'manageIR', c)} />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Label>إدارة مخالفات الجودة (NCR)</Label>
                                        <Switch checked={matrix.supervision.manageNCR} onCheckedChange={(c: boolean) => handleToggle('supervision', 'manageNCR', c)} />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Label className="text-red-500">حذف التقارير المعتمدة</Label>
                                        <Switch checked={matrix.supervision.deleteReports} onCheckedChange={(c: boolean) => handleToggle('supervision', 'deleteReports', c)} />
                                    </div>
                                </div>
                            </div>

                            {/* System & Analytics Section */}
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 space-y-4 lg:col-span-2">
                                <h3 className="font-bold text-slate-700 border-b pb-2">إدارة النظام والتحليلات (System & Admin)</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <Label className="font-bold text-slate-800">إدارة إعدادات النظام (Settings)</Label>
                                            <Switch checked={matrix.system.manageSettings} onCheckedChange={(c: boolean) => handleToggle('system', 'manageSettings', c)} />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <Label className="font-bold text-slate-800">إدارة الأدوار والصلاحيات (Roles)</Label>
                                            <Switch checked={matrix.system.manageRoles} onCheckedChange={(c: boolean) => handleToggle('system', 'manageRoles', c)} />
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <Label className="font-bold text-slate-800">عرض سجلات النظام (Audit Logs)</Label>
                                            <Switch checked={matrix.system.viewLogs} onCheckedChange={(c: boolean) => handleToggle('system', 'viewLogs', c)} />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <Label className="font-bold text-slate-800">عرض تحليلات الإدارة (Analytics)</Label>
                                            <Switch checked={matrix.system.viewAnalytics} onCheckedChange={(c: boolean) => handleToggle('system', 'viewAnalytics', c)} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <SubmitButton isEdit={!!existingRole && !presetName} />
                </form>
            </DialogContent>
        </Dialog>
    )
}

