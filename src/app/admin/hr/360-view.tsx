"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Bell, Globe, UserX, AlertTriangle, Stethoscope, Palmtree, LogOut, Clock, Zap, ShieldAlert, Wallet,
    Briefcase, Building, MapPin, CreditCard, FileText, UserCircle
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { StatCard } from "@/components/hr/StatCard"
import { BottomNav } from "@/components/hr/BottomNav"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

const IconMap: Record<string, any> = {
    Globe, UserX, AlertTriangle, Stethoscope, Palmtree, LogOut, Clock, Zap, ShieldAlert
}

export function Employee360View({ data }: { data: any }) {
    if (!data) return null

    const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } }
    const item = { hidden: { y: 20, opacity: 0 }, show: { y: 0, opacity: 1 } }

    // Use dummy data for new sections if not provided by backend yet
    const profile = data.profile || {}
    const jobInfo = data.jobInfo || {}
    const financial = data.financial || {}

    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="w-full max-w-2xl mx-auto bg-slate-50 min-h-screen pb-32 font-sans"
        >
            {/* 1. Header (Sticky) */}
            <header className="flex justify-between items-center p-6 bg-white/50 backdrop-blur-md sticky top-0 z-40 border-b border-slate-100">
                <div className="flex items-center gap-4">
                    <Avatar className="h-14 w-14 ring-4 ring-indigo-50 shadow-sm">
                        <AvatarImage src={data.user.image} />
                        <AvatarFallback className="bg-indigo-600 text-white font-bold text-lg">
                            {data.user.name?.[0]}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <h2 className="text-lg font-black text-slate-800 leading-tight">{data.user.name}</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase tracking-wider">
                                {data.user.position || "Staff"}
                            </span>
                            <span className="text-xs font-bold text-indigo-500">{profile.employeeCode || "EMP-XXX"}</span>
                        </div>
                    </div>
                </div>
                <button className="w-10 h-10 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-colors">
                    <Bell size={20} />
                </button>
            </header>

            <div className="px-4 py-6">
                <Tabs defaultValue="overview" className="w-full dir-rtl" dir="rtl">
                    <TabsList className="w-full grid grid-cols-4 bg-slate-200/50 p-1 rounded-2xl mb-8">
                        <TabsTrigger value="overview" className="rounded-xl text-xs font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">نظرة عامة</TabsTrigger>
                        <TabsTrigger value="personal" className="rounded-xl text-xs font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">شخصي</TabsTrigger>
                        <TabsTrigger value="job" className="rounded-xl text-xs font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">وظيفي</TabsTrigger>
                        <TabsTrigger value="finance" className="rounded-xl text-xs font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">مالي</TabsTrigger>
                    </TabsList>

                    <AnimatePresence mode="wait">
                        {/* TAB 1: OVERVIEW (Original Dashboard) */}
                        <TabsContent value="overview" className="space-y-6 outline-none">
                            <motion.div variants={item} className="bg-indigo-600 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-indigo-200 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform duration-700">
                                    <Zap size={120} />
                                </div>
                                <div className="relative z-10">
                                    <p className="text-indigo-100 text-xs font-black uppercase tracking-widest mb-2">{data.mainPerformance.label}</p>
                                    <div className="flex items-baseline gap-2 mb-6">
                                        <span className="text-4xl font-black">{data.mainPerformance.value}</span>
                                        <span className="text-indigo-200 font-bold">/ {data.mainPerformance.total} ساعة</span>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="h-3 w-full bg-white/20 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${data.mainPerformance.percent}%` }}
                                                transition={{ duration: 1, ease: "easeOut" }}
                                                className="h-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.5)]"
                                            />
                                        </div>
                                        <div className="flex justify-between text-[10px] font-black text-indigo-100/80">
                                            <span>أداء الشهر الحالي</span>
                                            <span>{data.mainPerformance.percent}%</span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>

                            <motion.div variants={item} className="grid grid-cols-2 gap-4">
                                {data.statsGrid.map((stat: any, idx: number) => (
                                    <StatCard
                                        key={idx}
                                        label={stat.label}
                                        value={stat.value}
                                        total={stat.total}
                                        percent={stat.percent}
                                        icon={IconMap[stat.icon] || Globe}
                                        iconColor={stat.iconColor}
                                        color={stat.color}
                                    />
                                ))}

                                {data.loan && (
                                    <div className="col-span-2 bg-slate-900 rounded-[2rem] p-6 text-white shadow-xl relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform">
                                            <Wallet size={80} />
                                        </div>
                                        <div className="flex justify-between items-center mb-4">
                                            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                                                <Wallet size={20} className="text-indigo-400" />
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-black uppercase text-slate-400">القروض الحالية</p>
                                                <p className="text-lg font-black">{data.loan.paid} <span className="text-[10px] text-slate-500">/ {data.loan.total} SAR</span></p>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-indigo-500 transition-all duration-1000"
                                                    style={{ width: `${data.loan.percent}%` }}
                                                />
                                            </div>
                                            <p className="text-[9px] font-bold text-slate-500 text-right">تم سداد {data.loan.percent}%</p>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        </TabsContent>

                        {/* TAB 2: PERSONAL INFO */}
                        <TabsContent value="personal" className="space-y-4 outline-none">
                            <Card className="rounded-3xl border-slate-100 shadow-sm overflow-hidden">
                                <CardHeader className="bg-slate-50/50 pb-4 border-b border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><UserCircle size={20} /></div>
                                        <div>
                                            <CardTitle className="text-lg font-black text-slate-800">البيانات الشخصية</CardTitle>
                                            <CardDescription className="text-xs font-medium">المعلومات الأساسية والهوية</CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-5 grid grid-cols-2 gap-y-6 gap-x-4">
                                    <div><p className="text-xs text-slate-500 font-bold mb-1">تاريخ الميلاد</p><p className="font-medium text-slate-800 text-sm">{profile.dob || "---"}</p></div>
                                    <div><p className="text-xs text-slate-500 font-bold mb-1">الجنسية</p><p className="font-medium text-slate-800 text-sm">{profile.nationality || "---"}</p></div>
                                    <div className="col-span-2"><p className="text-xs text-slate-500 font-bold mb-1">رقم الهوية / الإقامة</p><p className="font-mono bg-slate-50 px-3 py-1.5 rounded-lg text-slate-800 text-sm border border-slate-100 w-full">{profile.idNumber || "---"}</p></div>
                                    <div><p className="text-xs text-slate-500 font-bold mb-1">تاريخ الانتهاء</p><p className="font-medium text-slate-800 text-sm">{profile.idExpiry || "---"}</p></div>
                                    <div><p className="text-xs text-slate-500 font-bold mb-1">رقم الجواز</p><p className="font-medium text-slate-800 text-sm">{profile.passportNum || "---"}</p></div>
                                </CardContent>
                            </Card>

                            <Card className="rounded-3xl border-slate-100 shadow-sm overflow-hidden">
                                <CardHeader className="bg-slate-50/50 pb-4 border-b border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><Stethoscope size={20} /></div>
                                        <div>
                                            <CardTitle className="text-lg font-black text-slate-800">التأمين الطبي</CardTitle>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-5 grid grid-cols-2 gap-y-6 gap-x-4">
                                    <div className="col-span-2"><p className="text-xs text-slate-500 font-bold mb-1">شركة التأمين</p><p className="font-medium text-slate-800 text-sm">{profile.insuranceProvider || "---"}</p></div>
                                    <div><p className="text-xs text-slate-500 font-bold mb-1">رقم البوليصة</p><p className="font-medium text-slate-800 text-sm">{profile.insurancePolicy || "---"}</p></div>
                                    <div><p className="text-xs text-slate-500 font-bold mb-1">تاريخ الانتهاء</p><p className="font-medium text-red-600 text-sm">{profile.insuranceExpiry || "---"}</p></div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* TAB 3: JOB INFO */}
                        <TabsContent value="job" className="space-y-4 outline-none">
                            <Card className="rounded-3xl border-slate-100 shadow-sm overflow-hidden">
                                <CardHeader className="bg-slate-50/50 pb-4 border-b border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-orange-100 text-orange-600 rounded-lg"><Briefcase size={20} /></div>
                                        <div>
                                            <CardTitle className="text-lg font-black text-slate-800">معلومات الوظيفة</CardTitle>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-5 space-y-5">
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-slate-500 font-bold mb-1">القسم والإدارة</p>
                                            <p className="font-black text-slate-800">{jobInfo.department || "الإدارة الهندسية"}</p>
                                        </div>
                                        <Building className="text-slate-300" size={32} />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div><p className="text-xs text-slate-500 font-bold mb-1">المدير المباشر</p><p className="font-medium text-slate-800 text-sm">{jobInfo.directManagerName || "غير محدد"}</p></div>
                                        <div><p className="text-xs text-slate-500 font-bold mb-1">تاريخ المباشرة</p><p className="font-medium text-slate-800 text-sm">{profile.hireDate || "---"}</p></div>
                                        <div className="col-span-2"><p className="text-xs text-slate-500 font-bold mb-1">المسمى الوظيفي والدور (Role)</p><p className="font-bold text-indigo-600 text-sm bg-indigo-50 inline-block px-3 py-1 rounded-lg">{jobInfo.roleName || data.user.position}</p></div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* TAB 4: FINANCIALS (Admin/Self visible based on permissions handled later) */}
                        <TabsContent value="finance" className="space-y-4 outline-none">
                            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                                    {/* Abstract shapes here */}
                                    <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full border-4 border-white/20"></div>
                                    <div className="absolute right-20 top-20 w-10 h-10 rounded-full border-2 border-white/20"></div>
                                </div>
                                <div className="relative z-10 flex flex-col h-full justify-between min-h-[160px]">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-1">إجمالي الراتب (SAR)</p>
                                            <h3 className="text-3xl font-black tabular-nums">{financial.totalSalary?.toLocaleString() || "0.00"}</h3>
                                        </div>
                                        <CreditCard className="text-slate-500/50" size={40} />
                                    </div>

                                    <div className="mt-8 space-y-1">
                                        <p className="text-[10px] text-slate-400 font-mono uppercase">IBAN Number</p>
                                        <p className="font-mono text-sm tracking-widest text-slate-300 bg-black/20 px-3 py-2 rounded-lg">{financial.iban || "SA00 0000 0000 0000 0000 0000"}</p>
                                    </div>
                                </div>
                            </div>

                            <Card className="rounded-3xl border-slate-100 shadow-sm overflow-hidden mt-4">
                                <CardHeader className="bg-slate-50/50 pb-4 border-b border-slate-100">
                                    <CardTitle className="text-sm font-black text-slate-800">تفصيل الراتب (Breakdown)</CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="divide-y divide-slate-100">
                                        <div className="flex justify-between p-4 hover:bg-slate-50 transition-colors">
                                            <span className="text-sm font-bold text-slate-600">الراتب الأساسي</span>
                                            <span className="text-sm font-mono font-bold text-slate-800">{financial.basicSalary?.toLocaleString() || "0"}</span>
                                        </div>
                                        <div className="flex justify-between p-4 hover:bg-slate-50 transition-colors">
                                            <span className="text-sm font-bold text-slate-600">بدل سكن</span>
                                            <span className="text-sm font-mono font-bold text-slate-800">{financial.housingAllowance?.toLocaleString() || "0"}</span>
                                        </div>
                                        <div className="flex justify-between p-4 hover:bg-slate-50 transition-colors">
                                            <span className="text-sm font-bold text-slate-600">بدل مواصلات</span>
                                            <span className="text-sm font-mono font-bold text-slate-800">{financial.transportAllowance?.toLocaleString() || "0"}</span>
                                        </div>
                                        <div className="flex justify-between p-4 hover:bg-slate-50 transition-colors bg-red-50/50">
                                            <span className="text-sm font-bold text-red-600">خصم التأمينات (GOSI)</span>
                                            <span className="text-sm font-mono font-bold text-red-600">-{financial.gosiDeduction?.toLocaleString() || "0"}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </AnimatePresence>
                </Tabs>
            </div>

            {/* Bottom Navigation */}
            <BottomNav />
        </motion.div>
    )
}
