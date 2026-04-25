"use client"

import { useState, useTransition, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Plus,
    ChevronLeft,
    ChevronRight,
    MoreHorizontal,
    Trash2,
    CheckCircle2,
    Clock,
    CircleDot,
    Eye,
    FolderKanban,
    AlertTriangle,
    ShieldAlert,
    CalendarX,
    MessageSquare,
} from "lucide-react"
import { moveTask, createTask, deleteTask } from "./actions"
import { TaskDetailsModal } from "@/components/tasks/task-details-modal"
import { cn } from "@/lib/utils"

function normalizeStatus(s: string): string {
    if (s === 'TODO') return 'TO_DO'
    if (s === 'ON_HOLD') return 'TO_DO'
    if (s === 'PLANNED') return 'TO_DO'
    return s
}

const COLUMNS = [
    { id: 'TO_DO', label: 'To Do', icon: CircleDot, color: 'border-t-slate-400', bg: 'bg-slate-50', badge: 'bg-slate-100 text-slate-600', progressLabel: '0%' },
    { id: 'IN_PROGRESS', label: 'In Progress', icon: Clock, color: 'border-t-blue-500', bg: 'bg-blue-50/40', badge: 'bg-blue-100 text-blue-700', progressLabel: '50%' },
    { id: 'UNDER_REVIEW', label: 'Under Review', icon: Eye, color: 'border-t-violet-500', bg: 'bg-violet-50/40', badge: 'bg-violet-100 text-violet-700', progressLabel: '90%' },
    { id: 'DONE', label: 'Done', icon: CheckCircle2, color: 'border-t-emerald-500', bg: 'bg-emerald-50/30', badge: 'bg-emerald-100 text-emerald-700', progressLabel: '100%' },
]

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN', 'GLOBAL_SUPER_ADMIN']

const TYPE_LABELS: Record<string, string> = {
    OFFICE: 'Office', SITE: 'Site', DESIGN: 'Design',
    PROCUREMENT: 'Procurement', REVIEW: 'Review',
}

interface Task {
    id: string
    title: string
    description: string | null
    status: string
    type: string
    progress: number
    project: { id: string; name: string } | null
    assignees: { id: string; name: string }[]
    start: string
    end: string
}

interface Project { id: string; name: string }
interface User { id: string; name: string }

export function KanbanBoard({
    tasks: initial,
    projects,
    users,
    userRole,
    userId,
}: {
    tasks: Task[]
    projects: Project[]
    users: User[]
    userRole: string
    userId: string
}) {
    const [tasks, setTasks] = useState<Task[]>(initial)
    const [filterProject, setFilterProject] = useState<string>("ALL")
    const [newOpen, setNewOpen] = useState(false)
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
    const [selectedAssignees, setSelectedAssignees] = useState<string[]>([])
    const [isPending, startTransition] = useTransition()
    const [movingId, setMovingId] = useState<string | null>(null)
    const router = useRouter()
    const searchParams = useSearchParams()

    // Auto-open TaskDetailsModal if ?taskId= is present in URL
    useEffect(() => {
        const taskId = searchParams.get('taskId')
        if (taskId) setSelectedTaskId(taskId)
    }, [searchParams])

    const isAdmin = ADMIN_ROLES.includes(userRole)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const displayed = filterProject === "ALL"
        ? tasks
        : tasks.filter(t => t.project?.id === filterProject)

    function getColumnTasks(colId: string) {
        return displayed.filter(t => normalizeStatus(t.status) === colId)
    }

    const inProgressTasks = displayed.filter(t => normalizeStatus(t.status) === 'IN_PROGRESS')
    const wipByAssignee: Record<string, { name: string; count: number }> = {}
    inProgressTasks.forEach(t => {
        t.assignees.forEach(a => {
            if (!wipByAssignee[a.id]) wipByAssignee[a.id] = { name: a.name, count: 0 }
            wipByAssignee[a.id].count++
        })
    })
    const wipBottlenecks = Object.values(wipByAssignee).filter(a => a.count > 3)

    function optimisticMove(taskId: string, newStatus: string) {
        const progressMap: Record<string, number> = { 'TO_DO': 0, 'IN_PROGRESS': 50, 'UNDER_REVIEW': 90, 'DONE': 100 }
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus, progress: progressMap[newStatus] ?? t.progress } : t))
    }

    function handleMove(taskId: string, newStatus: string) {
        if (newStatus === 'DONE' && !isAdmin) {
            alert("Only Admins can approve tasks (move to Done).")
            return
        }
        setMovingId(taskId)
        optimisticMove(taskId, newStatus)
        startTransition(async () => {
            const res = await moveTask(taskId, newStatus)
            if (res.error) router.refresh()
            setMovingId(null)
        })
    }

    function handleDelete(taskId: string) {
        if (!confirm("Delete this task?")) return
        setTasks(prev => prev.filter(t => t.id !== taskId))
        startTransition(async () => {
            const res = await deleteTask(taskId)
            if (res.error) router.refresh()
        })
    }

    function toggleAssignee(uid: string) {
        setSelectedAssignees(prev =>
            prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
        )
    }

    async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        formData.set("assigneeIds", JSON.stringify(selectedAssignees))
        const res = await createTask(formData)
        if (res.success) {
            setNewOpen(false)
            setSelectedAssignees([])
            router.refresh()
        } else {
            alert(res.error)
        }
    }

    function handleCardClick(taskId: string) {
        setSelectedTaskId(taskId)
        // Update URL without navigation so the link is shareable
        const url = new URL(window.location.href)
        url.searchParams.set('taskId', taskId)
        window.history.replaceState({}, '', url.toString())
    }

    function handleModalClose() {
        setSelectedTaskId(null)
        const url = new URL(window.location.href)
        url.searchParams.delete('taskId')
        window.history.replaceState({}, '', url.toString())
    }

    const colIndex = (colId: string) => COLUMNS.findIndex(c => c.id === colId)

    return (
        <div className="space-y-4">
            {/* Task Details Modal */}
            <TaskDetailsModal
                taskId={selectedTaskId}
                onClose={handleModalClose}
                currentUserId={userId}
            />

            {/* WIP Bottleneck Warning */}
            {isAdmin && wipBottlenecks.length > 0 && (
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-300 text-amber-900 rounded-2xl px-4 py-3 shadow-sm">
                    <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500 mt-0.5" />
                    <div>
                        <p className="font-black text-sm">WIP Bottleneck Detected</p>
                        <p className="text-xs mt-0.5">
                            {wipBottlenecks.map(a => `${a.name} (${a.count} tasks in progress)`).join(' · ')} — exceeds the 3-task limit.
                        </p>
                    </div>
                </div>
            )}

            {/* RBAC notice */}
            {!isAdmin && (
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-500 font-medium">
                    <ShieldAlert className="h-4 w-4 text-slate-400" />
                    You can move tasks up to <span className="font-black text-violet-700 mx-1">Under Review</span>. Final approval (Done) requires an Admin.
                </div>
            )}

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Select value={filterProject} onValueChange={setFilterProject}>
                        <SelectTrigger className="w-52 rounded-xl border-slate-200 bg-white">
                            <SelectValue placeholder="Filter by project" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Projects</SelectItem>
                            {projects.map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <span className="text-sm text-slate-500 font-medium">{displayed.length} tasks</span>
                </div>

                <Dialog open={newOpen} onOpenChange={open => { setNewOpen(open); if (!open) setSelectedAssignees([]) }}>
                    <DialogTrigger asChild>
                        <Button className="rounded-xl gap-2">
                            <Plus className="h-4 w-4" />
                            New Task
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[520px] max-h-[85vh] overflow-y-auto">
                        <form onSubmit={handleCreate}>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <FolderKanban className="h-5 w-5 text-primary" />
                                    Create Task
                                </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Title *</Label>
                                    <Input name="title" required placeholder="Task title" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Description</Label>
                                    <Textarea name="description" placeholder="Optional description" rows={2} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Project</Label>
                                        <Select name="projectId" defaultValue="INTERNAL">
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="INTERNAL">
                                                    <span className="flex items-center gap-1.5">
                                                        <span className="text-slate-400">◆</span> Internal Office Task
                                                    </span>
                                                </SelectItem>
                                                {projects.map(p => (
                                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Type</Label>
                                        <Select name="type" defaultValue="OFFICE">
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {Object.entries(TYPE_LABELS).map(([v, l]) => (
                                                    <SelectItem key={v} value={v}>{l}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Start Date</Label>
                                        <Input type="date" name="start" defaultValue={new Date().toISOString().split('T')[0]} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Due Date</Label>
                                        <Input type="date" name="end" defaultValue={new Date().toISOString().split('T')[0]} />
                                    </div>
                                </div>

                                {/* Assignee selector */}
                                {users.length > 0 && (
                                    <div className="space-y-2">
                                        <Label>Assignees</Label>
                                        <div className="border rounded-xl p-3 space-y-2 max-h-36 overflow-y-auto bg-slate-50">
                                            {users.map(u => (
                                                <label key={u.id} className="flex items-center gap-2 cursor-pointer hover:bg-white rounded-lg px-2 py-1 transition-colors">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedAssignees.includes(u.id)}
                                                        onChange={() => toggleAssignee(u.id)}
                                                        className="rounded"
                                                    />
                                                    <span className="text-sm font-medium text-slate-700">{u.name}</span>
                                                </label>
                                            ))}
                                        </div>
                                        {selectedAssignees.length > 0 && (
                                            <p className="text-xs text-indigo-600 font-medium">
                                                {selectedAssignees.length} assignee{selectedAssignees.length > 1 ? 's' : ''} selected
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                            <DialogFooter>
                                <Button type="submit" className="w-full">Create Task</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Kanban Columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
                {COLUMNS.map((col) => {
                    const colTasks = getColumnTasks(col.id)
                    const Icon = col.icon
                    const cIdx = colIndex(col.id)

                    return (
                        <div key={col.id} className={cn("rounded-2xl border-t-4 shadow-sm overflow-hidden", col.color, col.bg)}>
                            <div className="px-4 py-3 flex items-center justify-between border-b border-slate-100 bg-white/70 backdrop-blur-sm">
                                <div className="flex items-center gap-2">
                                    <Icon className="h-4 w-4 text-slate-500" />
                                    <h3 className="font-bold text-sm text-slate-800">{col.label}</h3>
                                    <span className="text-[10px] text-slate-400 font-medium">→{col.progressLabel}</span>
                                </div>
                                <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", col.badge)}>
                                    {colTasks.length}
                                </span>
                            </div>

                            <div className="p-3 space-y-3 min-h-[120px]">
                                {colTasks.length === 0 && (
                                    <div className="flex items-center justify-center h-16 text-xs text-slate-400 italic">
                                        No tasks
                                    </div>
                                )}
                                {colTasks.map((task) => {
                                    const isMoving = movingId === task.id
                                    const canMoveLeft = cIdx > 0
                                    const canMoveRight = cIdx < COLUMNS.length - 1
                                    const canMoveToRight = canMoveRight && !(COLUMNS[cIdx + 1].id === 'DONE' && !isAdmin)

                                    const isOverdue = new Date(task.end) < today && normalizeStatus(task.status) !== 'DONE'
                                    const isWipWarning = normalizeStatus(task.status) === 'IN_PROGRESS' &&
                                        task.assignees.some(a => wipByAssignee[a.id]?.count > 3)

                                    return (
                                        <div
                                            key={task.id}
                                            className={cn(
                                                "group bg-white rounded-xl border shadow-sm p-3 space-y-2 transition-all cursor-pointer",
                                                isMoving && "opacity-50 pointer-events-none",
                                                isOverdue && "border-red-300 ring-1 ring-red-200",
                                                isWipWarning && "border-amber-300 ring-1 ring-amber-200",
                                                !isOverdue && !isWipWarning && "border-slate-100",
                                                "hover:shadow-md hover:border-indigo-200"
                                            )}
                                            onClick={() => handleCardClick(task.id)}
                                        >
                                            {/* Card header */}
                                            <div className="flex items-start justify-between gap-2">
                                                <p className="text-sm font-semibold text-slate-900 leading-tight line-clamp-2">
                                                    {task.title}
                                                </p>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                                            onClick={e => e.stopPropagation()}
                                                        >
                                                            <MoreHorizontal className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem
                                                            className="text-red-600"
                                                            onClick={e => { e.stopPropagation(); handleDelete(task.id) }}
                                                        >
                                                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>

                                            {/* Status Badges */}
                                            <div className="flex flex-wrap gap-1">
                                                {isOverdue && (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-black px-1.5 py-0.5 bg-red-100 text-red-700 rounded-full">
                                                        <CalendarX className="h-2.5 w-2.5" /> Overdue
                                                    </span>
                                                )}
                                                {isWipWarning && (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-black px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                                                        <AlertTriangle className="h-2.5 w-2.5" /> WIP Limit
                                                    </span>
                                                )}
                                            </div>

                                            {/* Metadata */}
                                            <div className="flex flex-wrap gap-1.5">
                                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-medium bg-slate-50">
                                                    {task.project ? task.project.name : 'Internal'}
                                                </Badge>
                                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-medium text-indigo-600 border-indigo-200 bg-indigo-50">
                                                    {TYPE_LABELS[task.type] || task.type}
                                                </Badge>
                                            </div>

                                            {/* Assignees */}
                                            {task.assignees.length > 0 && (
                                                <div className="flex flex-wrap gap-1">
                                                    {task.assignees.map(a => (
                                                        <span key={a.id} className="text-[10px] bg-slate-100 text-slate-600 rounded-full px-2 py-0.5 font-medium">
                                                            {a.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Progress bar */}
                                            {task.progress > 0 && (
                                                <div className="space-y-1">
                                                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${task.progress}%` }} />
                                                    </div>
                                                    <p className="text-[10px] text-slate-400 text-right">{task.progress}%</p>
                                                </div>
                                            )}

                                            {/* Footer row */}
                                            <div className="flex items-center justify-between">
                                                <p className={cn("text-[10px] font-medium", isOverdue ? "text-red-600" : "text-slate-400")}>
                                                    Due: {new Date(task.end).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                                </p>
                                                <span className="text-[10px] text-slate-300 flex items-center gap-0.5">
                                                    <MessageSquare className="h-2.5 w-2.5" /> Details
                                                </span>
                                            </div>

                                            {/* Move buttons */}
                                            <div
                                                className="flex gap-1 pt-1 border-t border-slate-50"
                                                onClick={e => e.stopPropagation()}
                                            >
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 px-2 text-[11px] text-slate-400 hover:text-slate-700 flex-1"
                                                    disabled={!canMoveLeft || isMoving}
                                                    onClick={() => handleMove(task.id, COLUMNS[cIdx - 1].id)}
                                                >
                                                    <ChevronLeft className="h-3 w-3 mr-0.5" />
                                                    {canMoveLeft ? COLUMNS[cIdx - 1].label : ''}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className={cn(
                                                        "h-6 px-2 text-[11px] flex-1 justify-end",
                                                        canMoveToRight ? "text-slate-400 hover:text-slate-700" : "text-slate-200 cursor-not-allowed"
                                                    )}
                                                    disabled={!canMoveToRight || isMoving}
                                                    onClick={() => handleMove(task.id, COLUMNS[cIdx + 1].id)}
                                                    title={!canMoveToRight && canMoveRight ? "Admin approval required" : undefined}
                                                >
                                                    {canMoveRight ? COLUMNS[cIdx + 1].label : ''}
                                                    <ChevronRight className="h-3 w-3 ml-0.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
