"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { approveDailyReport } from "@/app/admin/supervision/actions"
import { CheckCircle2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export function DSRApproveButton({ reportId, userRole, status }: { reportId: string, userRole: string, status: string }) {
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    if (!['ADMIN', 'PM'].includes(userRole)) return null
    if (status !== 'PENDING' && status !== 'DRAFT') return null

    async function handleApprove() {
        if (!confirm("Are you sure you want to finalize and approve this report?")) return

        setLoading(true)
        try {
            const res = await approveDailyReport(reportId)
            if (res.success) {
                toast.success("Report Approved Successfully")
                router.refresh()
            } else {
                toast.error(res.error || "Failed to approve report")
            }
        } catch (error) {
            toast.error("An unexpected error occurred")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Button
            onClick={handleApprove}
            disabled={loading}
            className="rounded-xl shadow-lg shadow-emerald-500/20 bg-emerald-600 text-white hover:bg-emerald-700 transition-all hover:-translate-y-0.5"
        >
            {loading ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    جاري المعالجة...
                </>
            ) : (
                <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    اعتماد التقرير (Approve)
                </>
            )}
        </Button>
    )
}
