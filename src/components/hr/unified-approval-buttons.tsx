"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { processRequest } from "@/app/admin/hr/actions"
import { Check, X, Loader2 } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

interface Props {
    requestId: string
    role: 'MANAGER' | 'HR' | 'FINANCE'
    onSuccess?: () => void
}

export function UnifiedApprovalButtons({ requestId, role, onSuccess }: Props) {
    const [loading, setLoading] = useState(false)
    const [rejectOpen, setRejectOpen] = useState(false)
    const [rejectionReason, setRejectionReason] = useState("")

    async function handleAction(decision: 'APPROVE' | 'REJECT') {
        setLoading(true)
        const res = await processRequest(requestId, decision, role, decision === 'REJECT' ? rejectionReason : undefined)
        setLoading(false)

        if (res.success) {
            toast.success(`Request ${decision === 'APPROVE' ? 'Approved' : 'Rejected'}`)
            setRejectOpen(false)
            if (onSuccess) onSuccess()
        } else {
            toast.error(res.error || "Action failed")
        }
    }

    return (
        <div className="flex gap-2">
            <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-4 font-bold"
                onClick={() => handleAction('APPROVE')}
                disabled={loading}
            >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
                Approve
            </Button>

            <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
                <DialogTrigger asChild>
                    <Button
                        size="sm"
                        variant="destructive"
                        className="rounded-xl px-4 font-bold"
                        disabled={loading}
                    >
                        <X className="h-4 w-4 mr-1" />
                        Reject
                    </Button>
                </DialogTrigger>
                <DialogContent className="rounded-3xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black">Reject Request</DialogTitle>
                        <DialogDescription>Why are you rejecting this request?</DialogDescription>
                    </DialogHeader>
                    <div className="py-2">
                        <Label htmlFor="reason" className="font-bold">Reason</Label>
                        <Textarea
                            id="reason"
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="e.g. Schedule conflict, missing documents..."
                            className="rounded-xl mt-2"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" className="rounded-xl" onClick={() => setRejectOpen(false)}>Cancel</Button>
                        <Button variant="destructive" className="rounded-xl font-bold" onClick={() => handleAction('REJECT')} disabled={loading || !rejectionReason}>
                            Confirm Reject
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
