'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Loader2 } from "lucide-react"
import { createAndAssignContractor } from "@/app/admin/projects/actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export function AssignContractorDialog({ projectId }: { projectId: string }) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)

        const formData = new FormData(e.currentTarget)
        const data = {
            companyName: formData.get("companyName"),
            contactPerson: formData.get("contactPerson"),
            phone: formData.get("phone"),
            email: formData.get("email"),
            specialty: formData.get("specialty"),
            crNumber: formData.get("crNumber"),
            startDate: formData.get("startDate"),
            durationDays: formData.get("durationDays"),
            contractValue: formData.get("contractValue"),
        }

        const result = await createAndAssignContractor(projectId, data)

        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success("Contractor assigned successfully")
            setOpen(false)
            router.refresh()
        }
        setLoading(false)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Contractor
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Add Contractor</DialogTitle>
                    <DialogDescription>
                        Create a new contractor profile and assign them to this project.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={onSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="companyName">Company Name *</Label>
                                <Input id="companyName" name="companyName" required placeholder="e.g. Al-Futtaim Construction" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="specialty">Specialty</Label>
                                <Input id="specialty" name="specialty" placeholder="e.g. MEP, Civil" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="contactPerson">Contact Person</Label>
                            <Input id="contactPerson" name="contactPerson" placeholder="Project Manager Name" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone</Label>
                                <Input id="phone" name="phone" placeholder="+966..." />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input id="email" name="email" type="email" placeholder="contact@company.com" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="crNumber">CR Number</Label>
                                <Input id="crNumber" name="crNumber" placeholder="Commercial Registration No." />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="contractValue">Contract Value (SAR)</Label>
                                <Input id="contractValue" name="contractValue" type="number" placeholder="0.00" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <div className="space-y-2">
                                <Label htmlFor="startDate">Start Date</Label>
                                <Input id="startDate" name="startDate" type="date" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="durationDays">Duration (Days)</Label>
                                <Input id="durationDays" name="durationDays" type="number" required placeholder="e.g. 365" />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create & Assign
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
