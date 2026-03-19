"use client"

import { useState } from "react"
import { Settings2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { updateTenant } from "./actions"
import { toast } from "sonner"

interface EditTenantDialogProps {
    tenant: {
        id: string
        name: string
        status: string
        subscriptionTier: string
        planId?: string | null
    }
    plans: any[]
}

export function EditTenantDialog({ tenant, plans }: EditTenantDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)

        const formData = new FormData(e.currentTarget)
        const selectedPlanId = formData.get("planId") as string
        const data = {
            name: formData.get("name") as string,
            status: formData.get("status") as string,
            planId: selectedPlanId,
            subscriptionTier: plans.find(p => p.id === selectedPlanId)?.name || tenant.subscriptionTier,
        }

        const result = await updateTenant(tenant.id, data)

        if (result.success) {
            toast.success("Tenant updated successfully!")
            setOpen(false)
        } else {
            toast.error(result.error || "Failed to update tenant")
        }
        setLoading(false)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white hover:bg-slate-800">
                    <Settings2 className="h-4 w-4 mr-2" />
                    Edit
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-slate-950 border-slate-800 text-slate-200">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Edit Company Details</DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Update the legal name, status, and tier for this firm.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Company Name</Label>
                            <Input id="name" name="name" defaultValue={tenant.name} placeholder="Acme Engineering" required className="bg-slate-900 border-slate-700" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="status">Status</Label>
                            <Select name="status" defaultValue={tenant.status}>
                                <SelectTrigger className="bg-slate-900 border-slate-700">
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                                    <SelectItem value="ACTIVE">Active</SelectItem>
                                    <SelectItem value="SUSPENDED">Suspended</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="planId">Subscription Plan</Label>
                            <Select name="planId" defaultValue={tenant.planId || undefined}>
                                <SelectTrigger className="bg-slate-900 border-slate-700">
                                    <SelectValue placeholder="Select plan" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-slate-800 text-slate-200 font-sans">
                                    {plans.map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="text-slate-400">Cancel</Button>
                        <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-500">
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
