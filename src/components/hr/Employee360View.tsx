"use client"

import { motion } from "framer-motion"
import {
    Bell,
    Globe,
    UserX,
    AlertTriangle,
    Stethoscope,
    Palmtree,
    LogOut,
    Clock,
    Zap,
    ShieldAlert,
    Wallet,
    Plus
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { StatCard } from "@/components/hr/StatCard"
import { BottomNav } from "@/components/hr/BottomNav"
import { cn } from "@/lib/utils"
import { ProfileInfoWidget } from "@/components/hr/profile-info-widget"
import { EventsWidget } from "@/components/hr/events-widget"

const IconMap: Record<string, any> = {
    Globe,
    UserX,
    AlertTriangle,
    Stethoscope,
    Palmtree,
    LogOut,
    Clock,
    Zap,
    ShieldAlert
}

export function Employee360View({ data }: { data: any }) {
    if (!data) return null

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

    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="max-w-7xl mx-auto bg-slate-50 min-h-screen pb-32 font-sans px-4 md:px-8"
        >
            {/* 1. Desktop & Mobile Header */}
            <header className="flex justify-between items-center py-8 mb-4">
                <div className="flex items-center gap-4 md:gap-6">
                    <Avatar className="h-14 w-14 md:h-16 md:w-16 ring-4 ring-white shadow-xl">
                        <AvatarImage src={data.user.image} />
                        <AvatarFallback className="bg-primary text-white text-xl font-black">
                            {data.user.name?.[0]}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <h2 className="text-xl md:text-2xl font-black text-slate-800 leading-tight">أهلاً بك، {data.user.name} 👋</h2>
                        <p className="text-xs md:text-sm font-bold text-slate-400 uppercase tracking-widest">{data.user.position} | {data.user.department}</p>
                    </div>
                </div>

                {/* Desktop Quick Actions Header */}
                <div className="hidden md:flex items-center gap-4">
                    <button className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 hover:text-primary transition-all hover:shadow-md">
                        <Bell size={24} />
                    </button>
                </div>

                {/* Mobile Notification Button */}
                <button className="md:hidden w-10 h-10 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-400">
                    <Bell size={20} />
                </button>
            </header>

            <div className="space-y-8">
                {/* 2. Top Banner (Full Width) */}
                <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="md:col-span-2 lg:col-span-4 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[2.5rem] p-8 md:p-12 text-white shadow-2xl shadow-indigo-100 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-1000">
                            <Zap size={200} />
                        </div>
                        <div className="relative z-10 max-w-2xl">
                            <p className="text-indigo-100 text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Clock size={16} />
                                {data.mainPerformance.label}
                            </p>
                            <div className="flex items-baseline gap-3 mb-8">
                                <span className="text-5xl md:text-7xl font-black">{data.mainPerformance.value}</span>
                                <span className="text-xl md:text-2xl text-indigo-100 font-bold opacity-80">/ {data.mainPerformance.total} ساعة</span>
                            </div>

                            <div className="space-y-4">
                                <div className="h-4 w-full bg-black/10 rounded-full overflow-hidden backdrop-blur-sm">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${data.mainPerformance.percent}%` }}
                                        transition={{ duration: 1.5, ease: "anticipate" }}
                                        className="h-full bg-white shadow-[0_0_20px_rgba(255,255,255,0.6)]"
                                    />
                                </div>
                                <div className="flex justify-between text-xs md:text-sm font-black text-indigo-50">
                                    <span className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                                        أداء الشهر الحالي
                                    </span>
                                    <span>{data.mainPerformance.percent}% مكتمل</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 3. Stats Grid (Responsive Columns) */}
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

                    {/* Loan Card (Integration with Grid) */}
                    {data.loan && (
                        <div className="md:col-span-2 bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group border border-white/5">
                            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-700">
                                <Wallet size={120} />
                            </div>
                            <div className="flex justify-between items-center mb-8">
                                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                                    <Wallet size={24} className="text-indigo-400" />
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] md:text-xs font-black uppercase text-slate-500 tracking-widest mb-1">القروض والتمويل</p>
                                    <p className="text-2xl md:text-3xl font-black tabular-nums">{data.loan.paid} <span className="text-sm text-slate-500">SAR</span></p>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                                    <span>المتبقي: {parseInt(data.loan.total) - parseInt(data.loan.paid)} SAR</span>
                                    <span>{data.loan.percent}%</span>
                                </div>
                                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${data.loan.percent}%` }}
                                        transition={{ duration: 1, delay: 0.5 }}
                                        className="h-full bg-indigo-500"
                                    />
                                </div>
                                <p className="text-xs font-bold text-slate-500">إجمالي القرض: {data.loan.total} SAR</p>
                            </div>
                        </div>
                    )}
                </motion.div>

                {/* 4. Events Feed & Profile Management */}
                <motion.div variants={item} className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <EventsWidget />
                    <ProfileInfoWidget user={data.user} />
                </motion.div>
            </div>

            <BottomNav />
        </motion.div>
    )
}
