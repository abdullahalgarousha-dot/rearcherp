"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
    Users,
    ShieldAlert,
    FileWarning,
    Calendar,
    Mail,
    Building2,
    MapPin,
    Briefcase,
    ArrowRight,
    DollarSign,
    TrendingUp
} from "lucide-react"
import Link from "next/link"
import { NewStaffDialog } from "@/components/hr/new-staff-dialog"
import { EmployeeControlDialog } from "@/components/hr/EmployeeControlDialog"
import { cn } from "@/lib/utils"

interface HRDashboardViewProps {
    totalStaff: number
    branchStats: { id: string; name: string; count: number }[]
    pendingLeaves: number
    financials: {
        totalSAR: number
        totalEGP: number
        egpInSar: number
        grandTotal: number
    }
    alerts: {
        critical: any[]
        warning: any[]
    }
    staff: any[]
    roles: { id: string, name: string }[]
    managers: { id: string, name: string }[]
    branches: any[]
    departmentLookups: { id: string; value: string; labelEn: string; labelAr: string }[]
}

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
}

const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
}

export function HRDashboardView({
    totalStaff,
    branchStats,
    pendingLeaves,
    financials,
    alerts,
    staff,
    roles,
    managers,
    branches,
    departmentLookups
}: HRDashboardViewProps) {

    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-8 pb-20"
        >
            {/* 1. Header & Actions */}
            <motion.div variants={item} className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                        <Users className="h-8 w-8 text-primary" />
                        Staff Directory
                    </h1>
                    <p className="text-slate-500 font-medium">Manage your team, track expiration dates, and oversee payroll.</p>
                </div>
                <div className="flex gap-3">
                    <NewStaffDialog roles={roles} managers={managers} branches={branches} departmentLookups={departmentLookups} />
                </div>
            </motion.div>

            {/* 2. Stats & Financials */}
            <motion.div variants={item} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Total Staff */}
                <Card className="bg-white/60 backdrop-blur-xl border-slate-200/60 shadow-xl overflow-hidden relative group">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Total Workforce</CardTitle>
                        <Users className="h-4 w-4 text-indigo-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-slate-900">{totalStaff}</div>
                        <p className="text-xs text-slate-400 mt-1 font-medium">Active Employees</p>
                    </CardContent>
                </Card>

                {/* Dynamic Branch Stats (first 2 branches) */}
                {branchStats.length === 0 ? (
                    <Card className="bg-white/60 backdrop-blur-xl border-slate-200/60 shadow-sm col-span-2">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-slate-500">Branches</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-slate-400 italic">No branches defined</p>
                        </CardContent>
                    </Card>
                ) : (
                    branchStats.slice(0, 2).map((b, idx) => (
                        <Card key={b.id} className="bg-white/60 backdrop-blur-xl border-slate-200/60 shadow-sm hover:shadow-md transition-all">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-slate-500">{b.name} Team</CardTitle>
                                <MapPin className={cn("h-4 w-4", idx === 0 ? "text-emerald-500" : "text-amber-500")} />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-slate-900">{b.count}</div>
                                <p className="text-xs text-muted-foreground mt-1">Staff Members</p>
                            </CardContent>
                        </Card>
                    ))
                )}

                {/* Consolidated Payroll */}
                <Card className="bg-slate-900 text-white border-none shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 opacity-10">
                        <DollarSign className="h-24 w-24" />
                    </div>
                    <CardHeader className="pb-2 relative z-10">
                        <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-emerald-400" />
                            Est. Monthly Payroll
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="relative z-10">
                        <div className="text-2xl font-black tracking-tight">SAR {financials.grandTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                        <p className="text-xs text-slate-500 mt-1">Consolidated (Exch. Rate Applied)</p>
                    </CardContent>
                </Card>
            </motion.div>

            {/* 3. Alerts Section */}
            {(alerts.critical.length > 0 || alerts.warning.length > 0) && (
                <motion.div variants={item} className="grid md:grid-cols-2 gap-6">
                    {/* Critical Alert Card */}
                    <Card className={cn("border-l-4 shadow-sm", alerts.critical.length > 0 ? "border-l-red-500 bg-red-50/30" : "border-none bg-slate-50")}>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base font-bold flex items-center gap-2 text-red-700">
                                <ShieldAlert className="h-5 w-5" />
                                Critical Action Items ({alerts.critical.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {alerts.critical.length === 0 ? (
                                <p className="text-sm text-muted-foreground italic">No critical issues found. Good job!</p>
                            ) : (
                                alerts.critical.map((alert: any, i) => (
                                    <div key={i} className="flex justify-between items-center bg-white p-3 rounded-lg border border-red-100 shadow-sm hover:shadow-md transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center text-red-700 font-bold text-xs ring-4 ring-red-50">
                                                {alert.daysRemaining}d
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-900">{alert.user.name}</p>
                                                <p className="text-[10px] uppercase font-bold text-red-500">{alert.document} Expiring</p>
                                            </div>
                                        </div>
                                        <Link href={`/admin/hr/staff/${alert.user.id}`}>
                                            <Button size="sm" variant="ghost" className="h-8 text-red-600 hover:bg-red-50">Resolve</Button>
                                        </Link>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    {/* Warning Alert Card */}
                    <Card className={cn("border-l-4 shadow-sm", alerts.warning.length > 0 ? "border-l-amber-500 bg-amber-50/30" : "border-none bg-slate-50")}>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base font-bold flex items-center gap-2 text-amber-700">
                                <FileWarning className="h-5 w-5" />
                                Upcoming Expirations ({alerts.warning.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {alerts.warning.length === 0 ? (
                                <p className="text-sm text-muted-foreground italic">No upcoming expirations in the next 60 days.</p>
                            ) : (
                                alerts.warning.slice(0, 3).map((alert: any, i) => (
                                    <div key={i} className="flex justify-between items-center bg-white p-3 rounded-lg border border-amber-100 shadow-sm hover:shadow-md transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-xs ring-4 ring-amber-50">
                                                {alert.daysRemaining}d
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-900">{alert.user.name}</p>
                                                <p className="text-[10px] uppercase font-bold text-amber-600">{alert.document}</p>
                                            </div>
                                        </div>
                                        <Link href={`/admin/hr/staff/${alert.user.id}`}>
                                            <Button size="sm" variant="ghost" className="h-8 text-amber-600 hover:bg-amber-50">View</Button>
                                        </Link>
                                    </div>
                                ))
                            )}
                            {alerts.warning.length > 3 && (
                                <p className="text-center text-xs text-muted-foreground pt-2">+{alerts.warning.length - 3} more items</p>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>
            )}

            {/* 4. Staff Grid */}
            <motion.div variants={item}>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {staff.map((employee) => (
                        <motion.div
                            key={employee.id}
                            whileHover={{ y: -5 }}
                            className="group relative bg-white/70 backdrop-blur-md border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all overflow-hidden flex flex-col justify-between"
                        >
                            <Link href={`/admin/hr/staff/${employee.id}`} className="absolute inset-0 z-0" />

                            <div className="relative z-10 w-full">
                                <div className={cn("absolute -top-6 -right-6 px-4 py-1 rounded-bl-2xl text-[10px] font-bold text-white shadow-sm",
                                    branchStats.findIndex(b => b.name === employee.branch) === 1 ? "bg-amber-500" : "bg-indigo-600"
                                )}>
                                    {employee.branch || "Unassigned"}
                                </div>

                                <div className="flex flex-col items-center">
                                    <Avatar className="h-20 w-20 mb-4 ring-4 ring-white shadow-lg">
                                        <AvatarImage src={employee.image} />
                                        <AvatarFallback className="bg-slate-100 text-slate-400 text-xl font-bold">
                                            {employee.name?.[0]}
                                        </AvatarFallback>
                                    </Avatar>

                                    <h3 className="text-lg font-bold text-slate-900 text-center leading-tight mb-1">{employee.name}</h3>
                                    <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-4">{employee.role}</p>

                                    <div className="w-full space-y-2 border-t border-slate-100 pt-4">
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            <Mail className="h-3.5 w-3.5 text-slate-400" />
                                            <span className="truncate">{employee.email}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            <Building2 className="h-3.5 w-3.5 text-slate-400" />
                                            <span>{employee.branch} Branch</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="relative z-20 mt-4 pt-4 border-t border-slate-50 flex justify-center gap-2">
                                <EmployeeControlDialog employee={employee} />
                                <Link href={`/admin/hr/staff/${employee.id}`}>
                                    <Button variant="outline" size="sm" className="h-8 rounded-lg gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200">
                                        <Users className="h-3.5 w-3.5" />
                                        Profile
                                    </Button>
                                </Link>
                            </div>
                        </motion.div>
                    ))}

                    {/* Add New Card (Always Last) */}
                </div>
            </motion.div>
        </motion.div>
    )
}
