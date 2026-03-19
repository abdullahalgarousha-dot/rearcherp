"use client"

import { Progress } from "@/components/ui/progress"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatCardProps {
    icon: LucideIcon
    label: string
    value: string | number
    total?: string | number
    percent: number
    color?: "default" | "danger" | "warning" | "success"
    iconColor?: string
}

export function StatCard({
    icon: Icon,
    label,
    value,
    total,
    percent,
    color = "default",
    iconColor
}: StatCardProps) {
    const colorClasses = {
        default: "from-blue-500/10 to-transparent text-blue-600",
        danger: "from-red-500/10 to-transparent text-red-600",
        warning: "from-amber-500/10 to-transparent text-amber-600",
        success: "from-emerald-500/10 to-transparent text-emerald-600",
    }

    const progressColors = {
        default: "bg-blue-600",
        danger: "bg-red-600",
        warning: "bg-amber-600",
        success: "bg-emerald-600",
    }

    return (
        <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-slate-100/50 hover:shadow-md transition-all group overflow-hidden relative">
            <div className="flex justify-between items-start mb-4">
                <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110",
                    iconColor ? `bg-${iconColor}/10` : "bg-slate-50"
                )}>
                    <Icon className={cn("w-8 h-8", iconColor ? `text-${iconColor}` : "text-slate-400")} />
                </div>
                <div className="text-right">
                    <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-1 md:text-sm">{label}</p>
                    <div className="flex items-baseline justify-end gap-1">
                        <span className={cn("text-3xl font-black md:text-4xl",
                            color === "danger" ? "text-red-600" :
                                color === "warning" ? "text-amber-600" :
                                    color === "success" ? "text-emerald-600" : "text-slate-900"
                        )}>
                            {value}
                        </span>
                        {total && (
                            <span className="text-xs font-bold text-slate-400">/ {total}</span>
                        )}
                    </div>
                </div>
            </div>

            <div className="space-y-1">
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                        className={cn("h-full transition-all duration-1000", progressColors[color])}
                        style={{ width: `${Math.min(percent, 100)}%` }}
                    />
                </div>
                <p className="text-xs font-bold text-slate-400 text-right">{percent}% complete</p>
            </div>
        </div>
    )
}
