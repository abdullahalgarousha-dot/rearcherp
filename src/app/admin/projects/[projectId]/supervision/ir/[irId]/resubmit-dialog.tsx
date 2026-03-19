"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { resubmitIR } from "../actions"
import { useRouter } from "next/navigation"
import { Loader2, RefreshCw } from "lucide-react"
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

export function ResubmitDialog({ irId, projectId, isRejected }: { irId: string, projectId: string, isRejected: boolean }) {
    const [loading, setLoading] = useState(false)
    const [open, setOpen] = useState(false)
    const router = useRouter()

    async function handleSubmit(formData: FormData) {
        setLoading(true)
        const res = await resubmitIR(irId, projectId, formData)
        setLoading(false)
        if (res.success) {
            setOpen(false)
            router.refresh()
        } else {
            alert(res.error || "Failed to resubmit")
        }
    }

    if (!isRejected) return null

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="w-full border-dashed border-slate-300 hover:border-primary hover:text-primary">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Resubmit Revision
                </Button>
            </DialogTrigger>
            <DialogContent>
                <form action={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Resubmit Inspection Request</DialogTitle>
                        <DialogDescription>
                            This will create a new revision (e.g. Rev 1) and reset status to Pending.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                            <Label>New Description / Response to Rejection</Label>
                            <Textarea name="description" placeholder="Address the rejection comments..." required />
                        </div>

                        <div className="space-y-2">
                            <Label>Updated Contractor Report (Optional)</Label>
                            <Input type="file" name="file" accept=".pdf,.jpg,.png" />
                            <p className="text-xs text-slate-500">Leave empty to keep the previous report.</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Submitting..." : "Submit Revision"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
