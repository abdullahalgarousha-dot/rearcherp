"use client"

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

export function TaskList({ tasks, engineers = [], designStages = [] }: TaskListProps) {
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Task Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead className="print:hidden">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {tasks.map((task) => (
                    <TableRow key={task.id}>
                        <TableCell>{task.title}</TableCell>
                        <TableCell>
                            <Badge variant={task.type === 'DESIGN' ? 'default' : 'secondary'}>
                                {task.type}
                            </Badge>
                        </TableCell>
                        <TableCell>
                            {task.assignees && task.assignees.length > 0
                                ? task.assignees.map((u: any) => u.name).join(', ')
                                : 'Unassigned'}
                        </TableCell>
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
            </TableBody>
        </Table>
    )
}
