"use client"

import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { Printer, FileDown, Share2, ChevronDown, Loader2 } from "lucide-react"
import { useState } from "react"

interface ActionExportButtonProps {
    onPrint?: () => void
    onPdf?: () => void
    onShare?: () => void
    loading?: boolean
    label?: string
}

export function ActionExportButton({ onPrint, onPdf, onShare, loading, label = "Export" }: ActionExportButtonProps) {
    const handlePrint = () => {
        if (onPrint) {
            onPrint()
        } else {
            window.print()
        }
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2 print:hidden backdrop-blur-xl bg-white/50 border-white/20 hover:bg-white/80 transition-all shadow-sm">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                    {label}
                    <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl bg-white/90 backdrop-blur-xl border border-white/20 shadow-lg">
                <DropdownMenuItem onClick={handlePrint} className="cursor-pointer gap-2 py-2.5 hover:bg-slate-100/80 rounded-lg m-1 transition-colors">
                    <Printer className="h-4 w-4 text-slate-500" />
                    <span>Print Page</span>
                </DropdownMenuItem>

                {onPdf && (
                    <DropdownMenuItem onClick={onPdf} disabled={loading} className="cursor-pointer gap-2 py-2.5 hover:bg-slate-100/80 rounded-lg m-1 transition-colors">
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4 text-slate-500" />}
                        <span>Download PDF</span>
                    </DropdownMenuItem>
                )}

                {onShare && (
                    <DropdownMenuItem onClick={onShare} className="cursor-pointer gap-2 py-2.5 hover:bg-slate-100/80 rounded-lg m-1 transition-colors">
                        <Share2 className="h-4 w-4 text-slate-500" />
                        <span>Share Link</span>
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
