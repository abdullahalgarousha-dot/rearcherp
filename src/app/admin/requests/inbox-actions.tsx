"use client"

import { useState } from "react"
import { processLeaveRequest, processLoanRequest, processDocumentRequest } from "@/app/admin/hr/requests/actions"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle2, XCircle, Eye } from "lucide-react"

export function InboxActions({ request, role }: { request: any, role: string }) {
    const [loading, setLoading] = useState(false)
    const [open, setOpen] = useState(false)
    const [reason, setReason] = useState("")

    const handleAction = async (decision: 'APPROVE' | 'REJECT') => {
        setLoading(true)
        // Map role string to backend enum
        let backendRole: 'MANAGER' | 'HR' | 'FINANCE' = 'MANAGER'
        if (role === 'HR') backendRole = 'HR'
        if (role === 'ACCOUNTANT') backendRole = 'FINANCE'

        const rejectReason = decision === 'REJECT' ? reason : undefined
        let res: any = { error: "Unknown request type" }
        if (request.reqType === 'LEAVE') {
            res = await processLeaveRequest(request.id, decision, rejectReason)
        } else if (request.reqType === 'LOAN') {
            res = await processLoanRequest(request.id, decision, rejectReason)
        } else if (request.reqType === 'DOCUMENT') {
            res = await processDocumentRequest(request.id, decision, rejectReason)
        }

        setLoading(false)
        if (res.success) {
            toast.success(`Request ${decision === 'APPROVE' ? 'Approved' : 'Rejected'}`)
            setOpen(false)
            window.location.reload()
        } else {
            toast.error(res.error || "Action failed")
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-xl border-slate-200 font-bold hover:bg-primary hover:text-white transition-all">
                    <Eye size={14} className="mr-2" /> Review
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] rounded-3xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black">Review Request</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-4 rounded-2xl">
                            <Label className="text-[10px] uppercase font-black text-slate-400">Employee</Label>
                            <p className="font-bold text-slate-900">{request.user.name}</p>
                            <p className="text-xs text-slate-500 italic">Department: Design</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl">
                            <Label className="text-[10px] uppercase font-black text-slate-400">Submitted On</Label>
                            <p className="font-bold text-slate-900">{new Date(request.createdAt).toLocaleDateString()}</p>
                        </div>
                    </div>

                    <div className="border border-slate-100 p-4 rounded-2xl space-y-2">
                        <Label className="text-[10px] uppercase font-black text-slate-400">Request Details</Label>
                        <div className="flex justify-between items-center">
                            <span className="font-black text-primary text-xl">
                                {request.reqType === 'LOAN' ? `SAR ${request.amount}` : request.type}
                            </span>
                            <Badge className="bg-primary text-white font-bold">{request.status.replace('_', ' ')}</Badge>
                        </div>
                        <p className="text-sm text-slate-600 whitespace-pre-wrap mt-2 pt-2 border-t border-slate-50 italic">
                            "{request.reason || request.details || "No comments provided."}"
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-500">Add Notes / Rejection Reason (Optional)</Label>
                        <Input
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Type here..."
                            className="rounded-xl border-slate-200 focus:ring-primary/10"
                        />
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        variant="outline"
                        className="rounded-xl font-bold flex-1 border-red-100 text-red-600 hover:bg-red-50"
                        onClick={() => handleAction('REJECT')}
                        disabled={loading}
                    >
                        <XCircle className="mr-2" size={16} /> Reject
                    </Button>
                    <Button
                        className="rounded-xl font-bold flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => handleAction('APPROVE')}
                        disabled={loading}
                    >
                        {loading ? <Loader2 className="mr-2 animate-spin" /> : <CheckCircle2 className="mr-2" size={16} />}
                        Approve & Forward
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
