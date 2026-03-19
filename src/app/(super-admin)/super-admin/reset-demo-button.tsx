"use client"

import { useState } from "react"
import { RefreshCw, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { resetDemoTenant } from "./actions"
import { toast } from "sonner"

export function ResetDemoButton() {
    const [loading, setLoading] = useState(false)

    async function handleReset() {
        if (!confirm("Are you sure you want to reset the Demo Environment? All data in the 'demo' tenant will be refreshed.")) return

        setLoading(true)
        const result = await resetDemoTenant()

        if (result.success) {
            toast.success("Demo environment reset successfully!")
        } else {
            toast.error(result.error || "Failed to reset demo")
        }
        setLoading(false)
    }

    return (
        <Button
            variant="outline"
            onClick={handleReset}
            disabled={loading}
            className="bg-slate-900 border-slate-800 text-slate-400 hover:text-emerald-400 hover:border-emerald-500/50"
        >
            {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Reset Demo
        </Button>
    )
}
