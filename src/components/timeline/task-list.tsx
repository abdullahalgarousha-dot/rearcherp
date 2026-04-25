"use client"

import React from "react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { WorkLogDialog } from "./work-log-dialog"
import { ProgressDialog } from "./progress-dialog"
import { EditTaskDialog } from "./edit-task-dialog"

interface TaskListProps {
    tasks: any[]
    engineers?: any[]
    designStages?: any[]
}

function fmt(date: string | Date) {
    return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

function durationDays(start: string | Date, end: string | Date) {
    return Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1
}

export function TaskList({ tasks, engineers = [], designStages = [] }: TaskListProps) {
    const grouped: { stage: any | null; tasks: any[] }[] = []

    designStages.forEach(stage => {
        const stageTasks = tasks.filter(t => t.designStageId === stage.id)
        if (stageTasks.length > 0) grouped.push({ stage, tasks: stageTasks })
    })

    const orphans = tasks.filter(t => !t.designStageId)
    if (orphans.length > 0) grouped.push({ stage: null, tasks: orphans })

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Task Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead className="print:hidden">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {grouped.map(({ stage, tasks: groupTasks }) => (
                    <React.Fragment key={stage?.id ?? 'orphan'}>
                        {/* Phase header row */}
                        <TableRow className="bg-slate-100 hover:bg-slate-100">
                            <TableCell className="font-black uppercase text-xs tracking-widest text-slate-600 py-2">
                                {stage ? `PHASE: ${stage.name}` : 'Other Activities'}
                                {stage?.progress != null && (
                                    <span className="ml-3 font-bold text-slate-400 normal-case tracking-normal">
                                        {stage.progress}% complete
                                    </span>
                                )}
                            </TableCell>
                            {/* Start */}
                            <TableCell className="text-xs text-slate-500 font-medium" />
                            <TableCell className="text-xs text-slate-500 font-medium">
                                {stage?.startDate ? fmt(stage.startDate) : '—'}
                            </TableCell>
                            {/* End */}
                            <TableCell className="text-xs text-slate-500 font-medium">
                                {stage?.endDate ? fmt(stage.endDate) : '—'}
                            </TableCell>
                            {/* Days */}
                            <TableCell className="text-xs text-slate-500 font-medium">
                                {stage?.startDate && stage?.endDate
                                    ? durationDays(stage.startDate, stage.endDate)
                                    : '—'}
                            </TableCell>
                            <TableCell />
                            <TableCell className="font-bold text-slate-700">
                                {stage?.progress != null ? `${stage.progress}%` : '—'}
                            </TableCell>
                            <TableCell className="print:hidden" />
                        </TableRow>

                        {/* Tasks under this phase */}
                        {groupTasks.map((task) => (
                            <TableRow key={task.id}>
                                <TableCell className="pl-8">{task.title}</TableCell>
                                <TableCell>
                                    <Badge variant={task.type === 'DESIGN' ? 'default' : 'secondary'}>
                                        {task.type}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-xs">{fmt(task.start)}</TableCell>
                                <TableCell className="text-xs">{fmt(task.end)}</TableCell>
                                <TableCell className="text-xs">{durationDays(task.start, task.end)}</TableCell>
                                <TableCell>{task.status}</TableCell>
                                <TableCell>{task.progress}%</TableCell>
                                <TableCell className="print:hidden">
                                    <div className="flex items-center gap-1">
                                        <WorkLogDialog taskId={task.id} projectId={task.projectId} />
                                        <ProgressDialog taskId={task.id} projectId={task.projectId} currentProgress={task.progress} />
                                        <EditTaskDialog task={task} engineers={engineers} designStages={designStages} />
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </React.Fragment>
                ))}
            </TableBody>
        </Table>
    )
}
