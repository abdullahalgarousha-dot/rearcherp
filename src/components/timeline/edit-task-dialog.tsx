"use client"

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState } from "react"
import { updateTask } from "@/app/admin/projects/[projectId]/actions"
import { Pencil, Check } from "lucide-react"

export function EditTaskDialog({ task, engineers, designStages = [] }: { task: any, engineers: any[], designStages?: any[] }) {
    const [open, setOpen] = useState(false)
    // Initialize with existing assignees
    const initialAssignees = task.assignees?.map((u: any) => u.id) || []
    const [selectedAssignees, setSelectedAssignees] = useState<string[]>(initialAssignees)
    const [designStageId, setDesignStageId] = useState<string>(task.designStageId || "NONE")
    const [loading, setLoading] = useState(false)

    const toggleAssignee = (id: string) => {
        setSelectedAssignees(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        )
    }

    async function onSubmit(formData: FormData) {
        setLoading(true)
        formData.append('taskId', task.id)
        formData.append('projectId', task.projectId)
        formData.append('assigneeIds', JSON.stringify(selectedAssignees))
        formData.append('designStageId', designStageId)
        await updateTask(formData)
        setLoading(false)
        setOpen(false)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                    <Pencil className="h-3 w-3" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <form action={onSubmit}>
                    <DialogHeader>
                        <DialogTitle>Edit Task</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">Name</Label>
                            <Input id="name" name="name" defaultValue={task.title} className="col-span-3" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="type" className="text-right">Type</Label>
                            <Select name="type" required defaultValue={task.type}>
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
                            <Input id="start" name="start" type="date" defaultValue={new Date(task.start).toISOString().split('T')[0]} className="col-span-3" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="end" className="text-right">End</Label>
                            <Input id="end" name="end" type="date" defaultValue={new Date(task.end).toISOString().split('T')[0]} className="col-span-3" required />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Updating...' : 'Update Task'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
