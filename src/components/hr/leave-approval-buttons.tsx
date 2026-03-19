"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { updateLeaveStatus } from "@/app/admin/hr/actions"
import { Check, X, CheckSquare } from "lucide-react"
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

export function LeaveApprovalButtons({ requestId, currentStatus, userRole }: { requestId: string, currentStatus: string, userRole: string }) {
    const [loading, setLoading] = useState(false)
    const [auditOpen, setAuditOpen] = useState(false) // For future
    const [rejectOpen, setRejectOpen] = useState(false)
    const [rejectionReason, setRejectionReason] = useState("")

    async function handleStatus(status: string) {
        setLoading(true)
        await updateLeaveStatus(requestId, status)
        setLoading(false)
    }

    async function handleReject() {
        setLoading(true)
        await updateLeaveStatus(requestId, 'REJECTED', rejectionReason)
        setLoading(false)
        setRejectOpen(false)
    }

    if (currentStatus === 'APPROVED' || currentStatus === 'REJECTED') return null

    return (
        <div className="flex gap-1">
            {currentStatus === 'PENDING' && (userRole === 'HR' || userRole === 'PM' || userRole === 'ADMIN') && (
                <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-blue-600 hover:bg-blue-50"
                    onClick={() => handleStatus('REVIEWED')}
                    disabled={loading}
                >
                    <CheckSquare className="h-4 w-4 mr-1" />
                    Review
                </Button>
            )}

            {(currentStatus === 'PENDING' || currentStatus === 'REVIEWED') && (userRole === 'ADMIN' || userRole === 'HR' || userRole === 'PM') && (
                <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-emerald-600 hover:bg-emerald-50"
                    onClick={() => handleStatus('APPROVED')}
                    disabled={loading}
                >
                    <Check className="h-4 w-4 mr-1" />
                    Approve
                </Button>
            )}

            <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
                <DialogTrigger asChild>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-red-600 hover:bg-red-50"
                        disabled={loading}
                    >
                        <X className="h-4 w-4 mr-1" />
                        Reject
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject Leave Request</DialogTitle>
                        <DialogDescription>Please provide a reason for rejecting this request.</DialogDescription>
                    </DialogHeader>
                    <div className="py-2">
                        <Label htmlFor="reason">Reason</Label>
                        <Textarea
                            id="reason"
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="e.g. Workload too high, Insufficient balance..."
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleReject} disabled={loading || !rejectionReason}>
                            Confirm Reject
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
