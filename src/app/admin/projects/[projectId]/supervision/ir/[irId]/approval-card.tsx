"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { updateIRStatus } from "../actions"
import { useRouter } from "next/navigation"
import { Loader2, CheckCircle2, XCircle, AlertCircle, UploadCloud, FileText } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"

export function ApprovalCard({ irId, projectId, status }: { irId: string, projectId: string, status: string }) {
    const [loading, setLoading] = useState(false)
    const [action, setAction] = useState<"APPROVE" | "REJECT" | null>(null)
    const router = useRouter()

    async function handleUpdate(formData: FormData) {
        setLoading(true)
        const res = await updateIRStatus(irId, projectId, formData)
        setLoading(false)
        if (res.success) {
            setAction(null)
            router.refresh()
        } else {
            alert(res.error || "Failed to update status")
        }
    }

    if (status !== 'PENDING') {
        return (
            <Card className="bg-slate-50 border-slate-200">
                <CardHeader>
                    <CardTitle className="text-sm uppercase tracking-wide text-slate-500">Decision</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-2 font-bold text-slate-700">
                        {status === 'APPROVED' && <CheckCircle2 className="text-emerald-500" />}
                        {status === 'REJECTED' && <XCircle className="text-red-500" />}
                        {status === 'APPROVED_WITH_COMMENTS' && <CheckCircle2 className="text-emerald-500" />}
                        <span>{status.replace('_', ' ')}</span>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="border-l-4 border-l-primary shadow-md">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-primary" />
                    Pending Approval
                </CardTitle>
                <CardDescription>Review the request and take action.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    {/* Reject Dialog */}
                    <Dialog open={action === 'REJECT'} onOpenChange={(o) => setAction(o ? 'REJECT' : null)}>
                        <DialogTrigger asChild>
                            <Button variant="destructive" className="w-full">Reject</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <form action={handleUpdate}>
                                <input type="hidden" name="status" value="REJECTED" />
                                <DialogHeader>
                                    <DialogTitle>Reject Inspection Request</DialogTitle>
                                    <DialogDescription>Please provide a reason for rejection.</DialogDescription>
                                </DialogHeader>
                                <div className="py-4">
                                    <Textarea name="comments" placeholder="Reason for rejection..." required />
                                </div>
                                <DialogFooter>
                                    <Button type="submit" variant="destructive" disabled={loading}>
                                        {loading ? "Rejecting..." : "Confirm Rejection"}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>

                    {/* Approve Dialog */}
                    <Dialog open={action === 'APPROVE'} onOpenChange={(o) => setAction(o ? 'APPROVE' : null)}>
                        <DialogTrigger asChild>
                            <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">Approve</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <form action={handleUpdate}>
                                <input type="hidden" name="status" value="APPROVED" />
                                <DialogHeader>
                                    <DialogTitle>Approve Inspection Request</DialogTitle>
                                    <DialogDescription>Upload the signed final document to approve.</DialogDescription>
                                </DialogHeader>
                                <div className="py-4 space-y-4">
                                    <div className="space-y-2">
                                        <Label>Comments (Optional)</Label>
                                        <Textarea name="comments" placeholder="Any notes..." />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Final Signed Document</Label>
                                        <div className="border-2 border-dashed border-emerald-100 bg-emerald-50/50 rounded-xl p-6 text-center hover:bg-emerald-50 transition-colors cursor-pointer relative">
                                            <Input
                                                type="file"
                                                name="finalFile"
                                                accept=".pdf"
                                                required
                                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                            />
                                            <FileText className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                                            <p className="text-sm text-emerald-700 font-medium">Upload Signed PDF</p>
                                        </div>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={loading}>
                                        {loading ? "Processing..." : "Confirm Approval"}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardContent>
        </Card>
    )
}
