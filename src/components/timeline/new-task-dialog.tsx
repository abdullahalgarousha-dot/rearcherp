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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState } from "react"
import { createTask } from "@/app/admin/projects/[projectId]/actions"
import { Badge } from "@/components/ui/badge"
import { Check } from "lucide-react"

export function NewTaskDialog({ projectId, engineers, designStages }: { projectId: string, engineers: any[], designStages: any[] }) {
    const [open, setOpen] = useState(false)
    const [selectedAssignees, setSelectedAssignees] = useState<string[]>([])
    const [designStageId, setDesignStageId] = useState<string>("NONE")
    const [loading, setLoading] = useState(false)

    const toggleAssignee = (id: string) => {
        setSelectedAssignees(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        )
    }

    async function onSubmit(formData: FormData) {
        setLoading(true)
        formData.append('projectId', projectId)
        formData.append('assigneeIds', JSON.stringify(selectedAssignees))
        formData.append('designStageId', designStageId)
        await createTask(formData)
        setLoading(false)
        setOpen(false)
        setSelectedAssignees([])
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>Add Task</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <form action={onSubmit}>
                    <DialogHeader>
                        <DialogTitle>Add New Task</DialogTitle>
                        <DialogDescription>
                            Create a new task and assign multiple engineers.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">Name</Label>
                            <Input id="name" name="name" className="col-span-3" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="type" className="text-right">Type</Label>
                            <Select name="type" required defaultValue="DESIGN">
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="DESIGN">Design</SelectItem>
                                    <SelectItem value="SUPERVISION">Supervision</SelectItem>
                                    <SelectItem value="ADMIN">Administrative</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="designStageId" className="text-right">Link to Stage</Label>
                            <Select name="designStageId" value={designStageId} onValueChange={setDesignStageId}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Optional: Link to a Design Phase" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="NONE">-- No Design Stage --</SelectItem>
                                    {designStages.map(stage => (
                                        <SelectItem key={stage.id} value={stage.id}>{stage.name} (Phase {stage.order})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-4 items-start gap-4">
                            <Label className="text-right pt-2">Assignees</Label>
                            <div className="col-span-3 flex flex-wrap gap-2 border p-2 rounded-md min-h-[50px]">
                                {engineers.map(e => {
                                    const isSelected = selectedAssignees.includes(e.id)
                                    return (
                                        <div
                                            key={e.id}
                                            onClick={() => toggleAssignee(e.id)}
                                            className={`
                                                cursor-pointer px-3 py-1 rounded-full text-xs border transition-all select-none flex items-center gap-1
                                                ${isSelected
                                                    ? 'bg-primary text-primary-foreground border-primary'
                                                    : 'bg-background hover:bg-muted text-muted-foreground border-input'}
                                            `}
                                        >
                                            {isSelected && <Check className="h-3 w-3" />}
                                            {e.name}
                                        </div>
                                    )
                                })}
                                {engineers.length === 0 && <span className="text-muted-foreground text-sm italic p-1">No engineers available</span>}
                            </div>
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="start" className="text-right">Start</Label>
                            <Input id="start" name="start" type="date" className="col-span-3" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="end" className="text-right">End</Label>
                            <Input id="end" name="end" type="date" className="col-span-3" required />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Creating...' : 'Create Task'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
