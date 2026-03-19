"use client"

import { motion } from "framer-motion"
import { LucideIcon, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

interface EmptyStateProps {
    icon: LucideIcon
    title: string
    description: string
    actionLabel?: string
    onAction?: () => void
}

export function EmptyState({
    icon: Icon,
    title,
    description,
    actionLabel,
    onAction
}: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="relative mb-10">
                <div className="h-28 w-28 bg-slate-900 rounded-3xl flex items-center justify-center relative z-10 shadow-[0_20px_50px_rgba(15,23,42,0.15)] border border-slate-800 rotate-3">
                    <Icon className="h-14 w-14 text-white" />
                </div>
                <div className="absolute -bottom-3 -right-3 h-12 w-12 bg-white rounded-2xl flex items-center justify-center shadow-xl border border-slate-100 -rotate-12 z-20">
                    <Plus className="h-6 w-6 text-slate-900" />
                </div>
            </div>
            <div className="space-y-4 max-w-sm">
                <h3 className="text-3xl font-black text-slate-900 tracking-tight leading-tight uppercase font-heading">{title}</h3>
                <p className="text-slate-500 font-medium text-base leading-relaxed">
                    {description}
                </p>
            </div>
            {actionLabel && (
                <Button
                    onClick={onAction}
                    className="mt-10 h-14 px-10 rounded-xl bg-slate-900 text-white hover:bg-slate-800 font-black text-base shadow-2xl transition-all hover:-translate-y-1 active:scale-95 border-none uppercase tracking-widest"
                >
                    {actionLabel}
                </Button>
            )}
        </div>
    )
}
