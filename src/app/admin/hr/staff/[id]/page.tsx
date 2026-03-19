import { auth } from "@/auth"
import { notFound, redirect } from "next/navigation"
import { db } from "@/lib/db"
import { BackButton } from "@/components/ui/back-button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Mail, Globe, Calendar, Briefcase, MapPin, User, FileText, CreditCard, Building2, Wallet } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { EditStaffDialog } from "@/components/hr/edit-staff-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { format } from "date-fns"
import { calculateNetSalary } from "@/lib/payroll-engine"

export default async function StaffProfilePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const session = await auth()
    const currentUser = (session?.user as any)
    const canViewSensitive = currentUser?.role === 'ADMIN' || currentUser?.role === 'HR'
    const isOwnProfile = currentUser?.id === id

    if (!canViewSensitive && !isOwnProfile) {
        redirect('/admin/hr')
    }

    const employee = await (db as any).user.findUnique({
        where: { id },
        include: { profile: { include: { assignedBranch: true } } }
    })

    if (!employee) notFound()

    const payroll = await calculateNetSalary(id)

    const allStaff = await (db as any).user.findMany({
        where: { profile: { isNot: null } },
        include: { profile: { select: { id: true } } }
    })

    const managers = allStaff.map((s: any) => ({ id: s.profile.id, name: s.name }))

    const branches = await (db as any).branch.findMany({
        orderBy: { nameEn: 'asc' }
    })

    // Spread profile first so that employee's core fields (like 'id', which is User ID) override profile fields
    const composedStaff = { ...employee.profile, ...employee, branchId: employee.profile?.branchId || '' }

    return (
        <div className="space-y-8 rtl:text-right pb-20">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <BackButton />
                        <h1 className="text-3xl font-black tracking-tight text-slate-900">Staff Profile | ملف الموظف</h1>
                    </div>
                </div>
                {canViewSensitive && (
                    <EditStaffDialog staff={composedStaff} managers={managers} branches={branches} />
                )}
            </div>

            <div className="grid gap-8 lg:grid-cols-12">
                {/* Left Sidebar (Persistent Profile Card) */}
                <div className="lg:col-span-4 space-y-6">
                    <Card className="border-none shadow-xl bg-white sticky top-24 overflow-hidden">
                        <div className={`h-24 w-full ${employee.profile?.legacyBranch === 'Cairo' || employee.profile?.assignedBranch?.currencyCode === 'EGP' ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
                        <div className="px-6 relative">
                            <div className="h-24 w-24 rounded-full bg-white p-1 absolute -top-12 border-4 border-slate-50 shadow-sm flex items-center justify-center text-slate-400">
                                <User className="h-12 w-12" />
                            </div>
                        </div>
                        <CardContent className="pt-16 pb-8 space-y-6">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900">{employee.name}</h2>
                                <p className="text-sm text-slate-500 font-medium">{employee.role}</p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <Badge variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-slate-200">
                                    {employee.profile?.assignedBranch?.nameEn || employee.profile?.legacyBranch || "Unassigned"} Branch
                                </Badge>
                                <Badge variant="outline" className={`
                                    ${(employee.profile?.assignedBranch?.currencyCode || employee.profile?.legacyCurrency) === 'SAR' ? 'text-emerald-600 border-emerald-200 bg-emerald-50' : ''}
                                    ${(employee.profile?.assignedBranch?.currencyCode || employee.profile?.legacyCurrency) === 'EGP' ? 'text-amber-600 border-amber-200 bg-amber-50' : ''}
                                `}>
                                    {employee.profile?.assignedBranch?.currencyCode || employee.profile?.legacyCurrency || "No Currency"}
                                </Badge>
                            </div>

                            <Separator />

                            <div className="space-y-3 text-sm">
                                <div className="flex items-center gap-3 text-slate-600">
                                    <Mail className="h-4 w-4 text-slate-400" />
                                    <span className="truncate">{employee.email}</span>
                                </div>
                                {employee.googleEmail && (
                                    <div className="flex items-center gap-3 text-slate-600">
                                        <Globe className="h-4 w-4 text-slate-400" />
                                        <span className="truncate">{employee.googleEmail}</span>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right ContentTabs */}
                <div className="lg:col-span-8">
                    <Tabs defaultValue="personal" className="w-full">
                        <TabsList className="bg-white p-1 rounded-xl shadow-sm mb-6 border border-slate-100 w-full justify-start h-auto flex-wrap">
                            <TabsTrigger value="personal" className="rounded-lg py-2.5 px-4 data-[state=active]:bg-slate-900 data-[state=active]:text-white flex gap-2">
                                <User className="h-4 w-4" />
                                Personal Info
                            </TabsTrigger>
                            <TabsTrigger value="legal" className="rounded-lg py-2.5 px-4 data-[state=active]:bg-slate-900 data-[state=active]:text-white flex gap-2">
                                <FileText className="h-4 w-4" />
                                Legal Documents
                            </TabsTrigger>
                            {canViewSensitive && (
                                <TabsTrigger value="financial" className="rounded-lg py-2.5 px-4 data-[state=active]:bg-slate-900 data-[state=active]:text-white flex gap-2">
                                    <CreditCard className="h-4 w-4" />
                                    Financial & Contract
                                </TabsTrigger>
                            )}
                        </TabsList>

                        {/* 1. Personal Tab */}
                        <TabsContent value="personal" className="space-y-6">
                            <Card className="border-none shadow-sm bg-white">
                                <CardHeader>
                                    <CardTitle>Personal Details</CardTitle>
                                    <CardDescription>Basic information and contact details.</CardDescription>
                                </CardHeader>
                                <CardContent className="grid gap-6 md:grid-cols-2">
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground uppercase">Full Name</Label>
                                        <p className="font-medium text-slate-900">{employee.name}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground uppercase">Nationality</Label>
                                        <p className="font-medium text-slate-900">{employee.nationality || "—"}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground uppercase">Official Email</Label>
                                        <p className="font-medium text-slate-900">{employee.googleEmail || "—"}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground uppercase">System Email</Label>
                                        <p className="font-medium text-slate-900">{employee.email}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* 2. Legal Tab */}
                        <TabsContent value="legal" className="space-y-6">
                            {/* Passport */}
                            <Card className="border-none shadow-md bg-white overflow-hidden">
                                <div className="h-1 bg-slate-900"></div>
                                <CardHeader>
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <Globe className="h-4 w-4 text-slate-500" />
                                        Passport Details
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="grid gap-6 md:grid-cols-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground uppercase">Passport No.</Label>
                                        <p className="font-mono font-bold text-slate-900">{employee.profile?.passportNum || "—"}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground uppercase">Issue Date</Label>
                                        <p className="text-sm">—</p>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground uppercase">Expiry Date</Label>
                                        <p className={`text-sm font-bold ${employee.profile?.passportExpiry && new Date(employee.profile?.passportExpiry) < new Date() ? 'text-red-600' : 'text-slate-900'}`}>
                                            {employee.profile?.passportExpiry ? format(employee.profile?.passportExpiry, 'dd/MM/yyyy') : "—"}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Iqama/ID */}
                            <Card className="border-none shadow-md bg-white overflow-hidden">
                                <div className="h-1 bg-slate-900"></div>
                                <CardHeader>
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-slate-500" />
                                        Iqama / National ID
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="grid gap-6 md:grid-cols-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground uppercase">ID Number</Label>
                                        <p className="font-mono font-bold text-slate-900">{employee.profile?.idNumber || "—"}</p>
                                    </div>
                                    <div className="space-y-1 col-span-2">
                                        <Label className="text-xs text-muted-foreground uppercase">Expiry Date</Label>
                                        <p className={`text-sm font-bold ${employee.profile?.idExpiry && new Date(employee.profile?.idExpiry) < new Date() ? 'text-red-600' : 'text-slate-900'}`}>
                                            {employee.profile?.idExpiry ? format(employee.profile?.idExpiry, 'dd/MM/yyyy') : "—"}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Insurance */}
                            <Card className="border-none shadow-md bg-white overflow-hidden">
                                <div className="h-1 bg-emerald-500"></div>
                                <CardHeader>
                                    <CardTitle className="text-base flex items-center gap-2 text-emerald-700">
                                        <Building2 className="h-4 w-4" />
                                        Health Insurance
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="grid gap-6 md:grid-cols-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground uppercase">Provider</Label>
                                        <p className="font-bold text-slate-900">{employee.profile?.insuranceProvider || "—"}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground uppercase">Policy No.</Label>
                                        <p className="font-mono text-sm">{employee.profile?.insurancePolicy || "—"}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground uppercase">Expiry Date</Label>
                                        <p className={`text-sm font-bold ${employee.profile?.insuranceExpiry && new Date(employee.profile?.insuranceExpiry) < new Date() ? 'text-red-600' : 'text-slate-900'}`}>
                                            {employee.profile?.insuranceExpiry ? format(employee.profile?.insuranceExpiry, 'dd/MM/yyyy') : "—"}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* 3. Financial Tab (Protected) */}
                        {canViewSensitive && (
                            <TabsContent value="financial" className="space-y-6">
                                <Card className="border-none shadow-xl bg-gradient-to-br from-slate-900 to-slate-800 text-white">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-slate-200">
                                            <Briefcase className="h-5 w-5" />
                                            Employment Contract
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="grid gap-6 md:grid-cols-3">
                                        <div className="space-y-1">
                                            <Label className="text-xs text-slate-400 uppercase">Current Role</Label>
                                            <p className="font-bold text-xl">{employee.role}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs text-slate-400 uppercase">Hire Date</Label>
                                            <p className="font-bold text-xl">{employee.hireDate ? format(employee.hireDate, 'MMM d, yyyy') : "—"}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs text-slate-400 uppercase">Assigned Branch</Label>
                                            <div className="flex items-center gap-2">
                                                <MapPin className="h-4 w-4 text-slate-400" />
                                                <span className="font-bold text-xl">{employee.branch || "Headquarters"}</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <div className="grid gap-6 md:grid-cols-1">
                                    <Card className="border-none shadow-md bg-slate-50">
                                        <CardHeader>
                                            <CardTitle className="text-sm font-bold uppercase text-muted-foreground">Basic Contract Salary</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-4xl font-black text-slate-900 tracking-tight">
                                                {employee.profile?.basicSalary?.toLocaleString() ?? 0} <span className="text-sm font-medium text-slate-400">{employee.profile?.currency || "SAR"}</span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                <Card className="border-none shadow-xl bg-slate-50 overflow-hidden mt-6">
                                    <div className="h-2 bg-indigo-500"></div>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Wallet className="h-5 w-5 text-indigo-500" />
                                            Live Payroll Preview (Current Month)
                                        </CardTitle>
                                        <CardDescription>Estimated net salary based on current data.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            {/* Income Section */}
                                            <div className="space-y-4">
                                                <h3 className="text-sm font-bold uppercase text-emerald-600 border-b pb-2">Income</h3>
                                                <div className="space-y-2 text-sm">
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-500">Basic Salary</span>
                                                        <span className="font-medium">{payroll?.income.basic.toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-500">Housing Allowance</span>
                                                        <span className="font-medium">{payroll?.income.housing.toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-500">Transport Allowance</span>
                                                        <span className="font-medium">{payroll?.income.transport.toLocaleString()}</span>
                                                    </div>
                                                    {(payroll?.income?.other ?? 0) > 0 && (
                                                        <div className="flex justify-between">
                                                            <span className="text-slate-500">Other Allowances</span>
                                                            <span className="font-medium">{payroll?.income.other.toLocaleString()}</span>
                                                        </div>
                                                    )}
                                                    <div className="flex justify-between pt-2 border-t font-bold text-slate-900">
                                                        <span>Total Income</span>
                                                        <span>{payroll?.income.total.toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Deductions Section */}
                                            <div className="space-y-4">
                                                <h3 className="text-sm font-bold uppercase text-rose-600 border-b pb-2">Deductions</h3>
                                                <div className="space-y-2 text-sm">
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-500">GOSI / Insurance</span>
                                                        <span className="font-medium text-rose-600">-{payroll?.deductions.gosi.toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-500">Penalties ({payroll?.meta.penaltyCount})</span>
                                                        <span className="font-medium text-rose-600">-{payroll?.deductions.penalties.toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-500">Loan Installments ({payroll?.meta.loanCount})</span>
                                                        <span className="font-medium text-rose-600">-{payroll?.deductions.loans.toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-500">Absence ({payroll?.meta.absentDays} Days)</span>
                                                        <span className="font-medium text-rose-600">-{payroll?.deductions.absence.toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex justify-between pt-2 border-t font-bold text-slate-900">
                                                        <span>Total Deductions</span>
                                                        <span className="text-rose-600">-{payroll?.deductions.total.toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-slate-900 text-white p-6 rounded-xl flex justify-between items-center shadow-lg">
                                            <div>
                                                <p className="text-sm text-slate-400 font-medium uppercase tracking-wider">Estimated Net Salary</p>
                                                <p className="text-xs text-rose-400 mt-1 font-bold">* Internal Estimated Payroll for cost tracking, not the official Mudad submission.</p>
                                            </div>
                                            <div className="text-3xl font-black tracking-tight">
                                                {payroll?.netSalary.toLocaleString()} <span className="text-lg font-medium text-indigo-400">{payroll?.meta.currency}</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        )}
                    </Tabs>
                </div>
            </div>
        </div>
    )
}
