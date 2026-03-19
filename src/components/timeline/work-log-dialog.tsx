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
import { logWork } from "@/app/admin/projects/[projectId]/actions"
import { Clock } from "lucide-react"

export function WorkLogDialog({ taskId, projectId }: { taskId: string, projectId: string }) {
    const [open, setOpen] = useState(false)

    async function onSubmit(formData: FormData) {
        formData.append('taskId', taskId)
        formData.append('projectId', projectId) // For revalidation
        await logWork(formData)
        setOpen(false)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" title="Log Work">
                    <Clock className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <form action={onSubmit}>
                    <DialogHeader>
                        <DialogTitle>Log Work Hours</DialogTitle>
                        <DialogDescription>
                            Record your hours for this task.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="date" className="text-right">Date</Label>
                            <Input id="date" name="date" type="date" className="col-span-3" required defaultValue={new Date().toISOString().split('T')[0]} />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="hoursLogged" className="text-right">Hours</Label>
                            <Input id="hoursLogged" name="hours" type="number" step="0.5" className="col-span-3" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="type" className="text-right">Type</Label>
                            <Select name="type" required defaultValue="OFFICE">
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="OFFICE">Office</SelectItem>
                                    <SelectItem value="SITE">Site Visit</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="description" className="text-right">Description</Label>
                            <Input id="description" name="description" className="col-span-3" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit">Log Work</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
