"use client"

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
import { useState } from "react"
import { updateProject } from "@/app/admin/projects/[projectId]/actions"
import { Checkbox } from "@/components/ui/checkbox"

export function EditProjectDialog({ project, allEngineers }: { project: any, allEngineers: any[] }) {
    const [open, setOpen] = useState(false)
    const [selectedEngineers, setSelectedEngineers] = useState<string[]>(
        project.engineers.map((e: any) => e.id)
    )

    async function onSubmit(formData: FormData) {
        formData.append('projectId', project.id)
        selectedEngineers.forEach(id => formData.append('engineerIds', id))

        await updateProject(formData)
        setOpen(false)
    }

    const toggleEngineer = (id: string) => {
        setSelectedEngineers(prev =>
            prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
        )
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">Edit Project</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <form action={onSubmit}>
                    <DialogHeader>
                        <DialogTitle>Edit Project Details</DialogTitle>
                        <DialogDescription>
                            Update project information and assign team members.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">Project Name</Label>
                            <Input id="name" name="name" defaultValue={project.name} className="col-span-3" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="clientDisplay" className="text-right">Client Name</Label>
                            <div className="col-span-3">
                                <Input
                                    id="clientDisplay"
                                    readOnly
                                    value={project.client?.name || project.legacyClientName || ''}
                                    className="bg-slate-50 text-slate-500 cursor-not-allowed"
                                />
                                {/* Send the CRM client ID, not the whole object */}
                                <input type="hidden" name="clientId" value={project.client?.id || ''} />
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="clientVat" className="text-right">Client VAT</Label>
                            <Input id="clientVat" name="clientVat" defaultValue={project.clientVat} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="clientAddress" className="text-right">Client Address</Label>
                            <Input id="clientAddress" name="clientAddress" defaultValue={project.clientAddress} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="contractValue" className="text-right">Contract Value</Label>
                            <Input id="contractValue" name="contractValue" type="number" step="0.01" defaultValue={Number(project.contractValue)} className="col-span-3" required />
                        </div>

                        <div className="border-t pt-4 mt-2">
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="space-y-2">
                                    <Label htmlFor="serviceType">Service Type</Label>
                                    <select
                                        id="serviceType"
                                        name="serviceType"
                                        defaultValue={project.serviceType || 'DESIGN'}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <option value="DESIGN">Design</option>
                                        <option value="SUPERVISION">Supervision</option>
                                        <option value="BOTH">Both</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="status">Project Status</Label>
                                    <select
                                        id="status"
                                        name="status"
                                        defaultValue={project.status || 'ACTIVE'}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <option value="ACTIVE">Active</option>
                                        <option value="ON_HOLD">On Hold</option>
                                        <option value="COMPLETED">Completed</option>
                                    </select>
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <Label htmlFor="contractDuration">Duration (Months)</Label>
                                    <Input id="contractDuration" name="contractDuration" type="number" defaultValue={project.contractDuration} />
                                </div>
                            </div>

                            <Label className="mb-4 block">Project Team (Engineers)</Label>
                            <div className="grid grid-cols-2 gap-2">
                                {allEngineers.map(engineer => (
                                    <div key={engineer.id} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`eng-${engineer.id}`}
                                            checked={selectedEngineers.includes(engineer.id)}
                                            onCheckedChange={() => toggleEngineer(engineer.id)}
                                        />
                                        <label
                                            htmlFor={`eng-${engineer.id}`}
                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                        >
                                            {engineer.name}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit">Save Changes</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
