"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import {
    CalendarX,
    Clock,
    CheckCircle2,
    CircleDot,
    Eye,
    MessageSquare,
    AlertTriangle,
    BarChart2,
    Send,
    Loader2,
    Pencil,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { getTaskDetails, addTaskComment, updateTaskDelayReason } from "@/app/admin/tasks/actions"

// ─── Types ───────────────────────────────────────────────────────────────────

interface Comment {
    id: string
    text: string
    createdAt: string
    user: { id: string; name: string }
}

interface TaskDetail {
    id: string
    title: string
    description?: string | null
    status: string
    type: string
    progress: number
    start: string
    end: string
    delayReason?: string | null
    // projectId scalar is always available; project relation object may be absent
    // if Prisma client hasn't been regenerated yet (include excluded until then)
    projectId?: string | null
    project?: { id: string; name: string } | null
    assignees?: { id: string; name: string }[]
    comments?: Comment[]
}

const STATUS_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
    TO_DO:        { label: 'To Do',         icon: CircleDot,    color: 'bg-slate-100 text-slate-700' },
    IN_PROGRESS:  { label: 'In Progress',   icon: Clock,        color: 'bg-blue-100 text-blue-700' },
    UNDER_REVIEW: { label: 'Under Review',  icon: Eye,          color: 'bg-violet-100 text-violet-700' },
    DONE:         { label: 'Done',          icon: CheckCircle2, color: 'bg-emerald-100 text-emerald-700' },
}

const TYPE_LABELS: Record<string, string> = {
    OFFICE: 'Office', SITE: 'Site', DESIGN: 'Design',
    PROCUREMENT: 'Procurement', REVIEW: 'Review',
}

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
    taskId: string | null
    onClose: () => void
    currentUserId: string
}

export function TaskDetailsModal({ taskId, onClose, currentUserId }: Props) {
    const router = useRouter()
    const commentsEndRef = useRef<HTMLDivElement>(null)

    const [task, setTask]               = useState<TaskDetail | null>(null)
    const [loading, setLoading]         = useState(false)
    const [fetchError, setFetchError]   = useState<string | null>(null)
    const [commentText, setCommentText] = useState("")
    const [delayReason, setDelayReason] = useState("")
    const [editingDelay, setEditingDelay] = useState(false)
    const [isPending, startTransition]  = useTransition()

    // ── Fetch task whenever taskId changes ────────────────────────────────────
    useEffect(() => {
        if (!taskId) {
            setTask(null)
            setFetchError(null)
            return
        }
        setLoading(true)
        setFetchError(null)
        getTaskDetails(taskId)
            .then(data => {
                if (!data) {
                    setFetchError("Task not found or you don't have access.")
                    setTask(null)
                } else {
                    setTask(data as TaskDetail)
                    setDelayReason((data as TaskDetail).delayReason ?? "")
                }
            })
            .catch(() => setFetchError("Failed to load task details."))
            .finally(() => setLoading(false))
    }, [taskId])

    // Auto-scroll comments to bottom when new ones arrive
    useEffect(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [task?.comments?.length])

    // ── Handlers ─────────────────────────────────────────────────────────────

    function handleClose() {
        setTask(null)
        setCommentText("")
        setDelayReason("")
        setEditingDelay(false)
        setFetchError(null)
        onClose()
    }

    function handleAddComment() {
        const text = commentText.trim()
        if (!text || !taskId) return
        setCommentText("")
        startTransition(async () => {
            const res = await addTaskComment(taskId, text)
            if (res.success && res.comment) {
                setTask(prev => {
                    if (!prev) return prev
                    return { ...prev, comments: [...(prev.comments ?? []), res.comment as Comment] }
                })
            }
        })
    }

    function handleSaveDelay() {
        if (!taskId) return
        startTransition(async () => {
            const res = await updateTaskDelayReason(taskId, delayReason)
            if (res.success) {
                setEditingDelay(false)
                setTask(prev => prev ? { ...prev, delayReason } : prev)
            }
        })
    }

    // ── Derived values ────────────────────────────────────────────────────────

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const isOverdue   = task ? (new Date(task.end) < today && task.status !== 'DONE') : false
    const statusCfg   = task ? (STATUS_CONFIG[task.status] ?? STATUS_CONFIG['TO_DO']) : null
    const StatusIcon  = statusCfg?.icon
    const assignees   = task?.assignees  ?? []
    const comments    = task?.comments   ?? []
    const projectId   = task?.project?.id ?? task?.projectId ?? null

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <Dialog open={!!taskId} onOpenChange={open => { if (!open) handleClose() }}>
            <DialogContent className="sm:max-w-[620px] max-h-[88vh] flex flex-col p-0 gap-0 overflow-hidden">

                {/* sr-only title satisfies Radix a11y requirement at all times */}
                <DialogTitle className="sr-only">Task Details</DialogTitle>

                {/* ── Loading ── */}
                {loading && (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
                    </div>
                )}

                {/* ── Error ── */}
                {!loading && fetchError && (
                    <div className="py-14 text-center space-y-2 px-6">
                        <p className="text-sm font-semibold text-slate-500">{fetchError}</p>
                        <Button variant="outline" size="sm" onClick={handleClose}>Close</Button>
                    </div>
                )}

                {/* ── Task content ── */}
                {!loading && !fetchError && task && (
                    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">

                        {/* Header */}
                        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100 shrink-0">
                            <p className="text-xl font-black text-slate-900 leading-snug pr-8">
                                {task.title}
                            </p>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {statusCfg && StatusIcon && (
                                    <span className={cn("inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full", statusCfg.color)}>
                                        <StatusIcon className="h-3 w-3" />
                                        {statusCfg.label}
                                    </span>
                                )}
                                <Badge variant="outline" className="text-xs font-medium">
                                    {TYPE_LABELS[task.type] ?? task.type}
                                </Badge>
                                {isOverdue && (
                                    <span className="inline-flex items-center gap-1 text-xs font-black px-2.5 py-1 bg-red-100 text-red-700 rounded-full">
                                        <CalendarX className="h-3 w-3" /> Overdue
                                    </span>
                                )}
                            </div>
                        </DialogHeader>

                        {/* Scrollable body */}
                        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

                            {/* Description */}
                            {task.description && (
                                <p className="text-sm text-slate-600 leading-relaxed">{task.description}</p>
                            )}

                            {/* Meta grid */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-slate-50 rounded-xl p-3">
                                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-1">Project</p>
                                    <p className="text-sm font-semibold text-slate-800">
                                        {task.project?.name ?? 'Internal Office Task'}
                                    </p>
                                </div>
                                <div className="bg-slate-50 rounded-xl p-3">
                                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-1">Progress</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                            <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${task.progress ?? 0}%` }} />
                                        </div>
                                        <span className="text-xs font-semibold text-slate-600">{task.progress ?? 0}%</span>
                                    </div>
                                </div>
                                <div className="bg-slate-50 rounded-xl p-3">
                                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-1">Start</p>
                                    <p className="text-sm font-semibold text-slate-800">
                                        {new Date(task.start).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </p>
                                </div>
                                <div className="bg-slate-50 rounded-xl p-3">
                                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-1">Due</p>
                                    <p className={cn("text-sm font-semibold", isOverdue ? "text-red-600" : "text-slate-800")}>
                                        {new Date(task.end).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </p>
                                </div>
                            </div>

                            {/* Assignees */}
                            {assignees.length > 0 && (
                                <div>
                                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-2">Assignees</p>
                                    <div className="flex flex-wrap gap-2">
                                        {assignees.map(a => (
                                            <span key={a.id} className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 text-xs font-semibold px-3 py-1 rounded-full border border-indigo-100">
                                                <span className="w-4 h-4 rounded-full bg-indigo-200 text-indigo-800 flex items-center justify-center text-[9px] font-black">
                                                    {(a.name?.[0] ?? '?').toUpperCase()}
                                                </span>
                                                {a.name}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Delay reason — only when overdue */}
                            {isOverdue && (
                                <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <p className="flex items-center gap-2 text-sm font-bold text-red-700">
                                            <AlertTriangle className="h-4 w-4" />
                                            Delay Reason
                                        </p>
                                        {!editingDelay && (
                                            <Button
                                                variant="outline" size="sm"
                                                className="h-6 text-xs border-red-200 text-red-600 hover:bg-red-100 gap-1"
                                                onClick={() => setEditingDelay(true)}
                                            >
                                                <Pencil className="h-2.5 w-2.5" />
                                                {task.delayReason ? 'Edit' : 'Add Reason'}
                                            </Button>
                                        )}
                                    </div>
                                    {editingDelay ? (
                                        <div className="space-y-2">
                                            <Textarea
                                                value={delayReason}
                                                onChange={e => setDelayReason(e.target.value)}
                                                placeholder="Explain why this task is delayed…"
                                                rows={3}
                                                className="text-sm bg-white resize-none"
                                            />
                                            <div className="flex gap-2">
                                                <Button size="sm" className="h-7 text-xs" disabled={isPending} onClick={handleSaveDelay}>
                                                    {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                                                </Button>
                                                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setDelayReason(task.delayReason ?? ""); setEditingDelay(false) }}>
                                                    Cancel
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-red-600 italic">
                                            {task.delayReason || 'No delay reason provided yet.'}
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Gantt / Project link — only for project-linked tasks */}
                            {projectId && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full gap-2 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                                    onClick={() => {
                                        router.push(`/admin/projects/${projectId}`)
                                        handleClose()
                                    }}
                                >
                                    <BarChart2 className="h-3.5 w-3.5" />
                                    View Gantt Chart → {task.project?.name ?? 'Project'}
                                </Button>
                            )}

                            <Separator />

                            {/* Comments */}
                            <div className="space-y-3">
                                <p className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                    <MessageSquare className="h-4 w-4" />
                                    Comments ({comments.length})
                                </p>

                                {/* Message list */}
                                <div className="space-y-3 max-h-52 overflow-y-auto pr-1">
                                    {comments.length === 0 && (
                                        <p className="text-xs text-slate-400 italic text-center py-5">
                                            No comments yet. Be the first to comment.
                                        </p>
                                    )}
                                    {comments.map(c => {
                                        const isMine = c.user?.id === currentUserId
                                        return (
                                            <div key={c.id} className={cn("flex gap-2.5", isMine && "flex-row-reverse")}>
                                                <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center shrink-0 text-[10px] font-black text-slate-600 mt-0.5">
                                                    {(c.user?.name?.[0] ?? '?').toUpperCase()}
                                                </div>
                                                <div className={cn("max-w-[78%]", isMine ? "items-end flex flex-col" : "items-start flex flex-col")}>
                                                    <div className={cn(
                                                        "text-xs px-3 py-2 rounded-2xl leading-relaxed",
                                                        isMine
                                                            ? "bg-indigo-600 text-white rounded-tr-sm"
                                                            : "bg-slate-100 text-slate-800 rounded-tl-sm"
                                                    )}>
                                                        {c.text}
                                                    </div>
                                                    <p className="text-[10px] text-slate-400 mt-1 px-1">
                                                        {c.user?.name ?? 'Unknown'} ·{' '}
                                                        {new Date(c.createdAt).toLocaleString('en-GB', {
                                                            day: '2-digit', month: 'short',
                                                            hour: '2-digit', minute: '2-digit'
                                                        })}
                                                    </p>
                                                </div>
                                            </div>
                                        )
                                    })}
                                    <div ref={commentsEndRef} />
                                </div>

                                {/* Compose */}
                                <div className="flex gap-2 pt-1">
                                    <Textarea
                                        value={commentText}
                                        onChange={e => setCommentText(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault()
                                                handleAddComment()
                                            }
                                        }}
                                        placeholder="Add a comment… (Enter to send, Shift+Enter for newline)"
                                        rows={2}
                                        className="text-sm flex-1 resize-none"
                                        disabled={isPending}
                                    />
                                    <Button
                                        size="icon"
                                        disabled={!commentText.trim() || isPending}
                                        onClick={handleAddComment}
                                        className="self-end h-10 w-10 shrink-0"
                                    >
                                        {isPending
                                            ? <Loader2 className="h-4 w-4 animate-spin" />
                                            : <Send className="h-4 w-4" />
                                        }
                                    </Button>
                                </div>
                            </div>

                        </div>{/* end scrollable body */}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
