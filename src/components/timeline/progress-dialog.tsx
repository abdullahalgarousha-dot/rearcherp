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
import { Slider } from "@/components/ui/slider"
import { useState } from "react"
import { updateTaskProgress } from "@/app/admin/projects/[projectId]/actions"
import { TrendingUp } from "lucide-react"

export function ProgressDialog({ taskId, projectId, currentProgress }: { taskId: string, projectId: string, currentProgress: number }) {
    const [open, setOpen] = useState(false)
    const [progress, setProgress] = useState(currentProgress)

    async function onSubmit() {
        const formData = new FormData()
        formData.append('taskId', taskId)
        formData.append('projectId', projectId)
        formData.append('progress', progress.toString())
        await updateTaskProgress(formData)
        setOpen(false)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" title="Update Progress">
                    <TrendingUp className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Update Progress</DialogTitle>
                    <DialogDescription>
                        Update the completion percentage for this task.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="flex items-center justify-between">
                        <Label>Progress</Label>
                        <span className="text-sm font-bold">{progress}%</span>
                    </div>
                    {/* Shadcn Slider needs value array */}
                    {/* If using standard input range for simplicity first if slider not installed or configured */}
                    <div className="flex items-center gap-4">
                        <span className="text-sm w-8">0%</span>
                        <Slider
                            defaultValue={[progress]}
                            max={100}
                            step={1}
                            onValueChange={(vals: number[]) => setProgress(vals[0])}
                            className="w-full"
                        />
                        <span className="text-sm w-8 text-right">{progress}%</span>
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={onSubmit}>Save</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
