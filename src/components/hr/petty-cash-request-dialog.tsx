"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Wallet, Plus, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { createPettyCashRequest } from "@/app/admin/hr/petty-cash/actions"
import { useRouter } from "next/navigation"

interface Props {
    projects: { id: string; name: string }[]
}

export function PettyCashRequestDialog({ projects }: Props) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [projectId, setProjectId] = useState("")
    const router = useRouter()

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        if (!projectId) { toast.error("Please select a project"); return }
        setLoading(true)
        const fd = new FormData(e.currentTarget)
        const res = await createPettyCashRequest({
            projectId,
            reason: fd.get("reason") as string,
            amount: parseFloat(fd.get("amount") as string),
        })
        setLoading(false)
        if (res.success) {
            toast.success("Request submitted — awaiting approval")
            setOpen(false)
            router.refresh()
        } else {
            toast.error(res.error)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2 rounded-xl shadow-lg">
                    <Plus className="h-4 w-4" /> New Request
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px] border-none shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="font-black text-lg flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <Wallet className="h-4 w-4" />
                        </div>
                        طلب عهدة | Petty Cash Request
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                        <Label>Linked Project</Label>
                        <Select value={projectId} onValueChange={setProjectId}>
                            <SelectTrigger className="rounded-xl border-slate-200">
                                <SelectValue placeholder="Select a project..." />
                            </SelectTrigger>
                            <SelectContent>
                                {projects.map(p => (
                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-[10px] text-muted-foreground">Used for archiving and reference. Costs are posted manually by the accountant.</p>
                    </div>
                    <div className="space-y-1.5">
                        <Label>Description / Reason</Label>
                        <Textarea name="reason" placeholder="e.g. Printing & stationary supplies for site visit" required className="rounded-xl" />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Amount Requested (SAR)</Label>
                        <Input name="amount" type="number" step="0.01" placeholder="0.00" required className="rounded-xl" />
                    </div>
                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-800">
                        <strong>Workflow:</strong> Finance approves → Cash disbursed to you → You upload invoices to settle → Accountant closes &amp; issues clearance certificate. Expenses are posted manually by the accountant.
                    </div>
                    <Button type="submit" className="w-full rounded-xl" disabled={loading}>
                        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Submit Request
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    )
}
