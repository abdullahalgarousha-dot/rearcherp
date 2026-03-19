'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Plus, CheckCircle2, UserCircle2, Settings2, Loader2, Link as LinkIcon, Trash2, Edit2, LayoutList } from "lucide-react"
import { getDesignStages, initializeDesignStages, updateDesignStage, uploadDesignStageFile, createDesignStage, deleteDesignStage, assignEngineersToStage } from "@/app/actions/design-stages"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Textarea } from "@/components/ui/textarea"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { Calendar as CalendarIcon, Users, CalendarDays, BookOpen, ClipboardList } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"

const STATUS_COLORS: any = {
    "PENDING": "bg-slate-100 text-slate-600 border-slate-200",
    "IN_PROGRESS": "bg-blue-100 text-blue-700 border-blue-200",
    "REVIEW": "bg-amber-100 text-amber-700 border-amber-200",
    "APPROVED": "bg-emerald-100 text-emerald-700 border-emerald-200",
}

export function DesignStagesTab({ projectId, engineers }: { projectId: string, engineers: any[] }) {
    const [stages, setStages] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadData()
    }, [projectId])

    async function loadData() {
        setLoading(true)
        let data = await getDesignStages(projectId)
        // If no stages, we can auto-init
        if (data.length === 0) {
            await initializeDesignStages(projectId)
            data = await getDesignStages(projectId)
        }
        setStages(data)
        setLoading(false)
    }

    async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        const name = fd.get('name') as string || `Phase ${stages.length + 1}`

        toast.loading("Creating stage...")
        const res = await createDesignStage(projectId, name)
        toast.dismiss()
        if (res.success) {
            toast.success("Stage created")
            loadData()
        } else {
            toast.error(res.error)
        }
    }

    async function handleDelete(stageId: string) {
        if (!confirm("Are you sure? This will permanently delete the stage and its deliverables.")) return
        toast.loading("Deleting stage...")
        const res = await deleteDesignStage(stageId)
        toast.dismiss()
        if (res.success) {
            toast.success("Stage deleted")
            loadData()
        } else {
            toast.error(res.error)
        }
    }

    async function handleUpdate(stageId: string, payload: any) {
        toast.loading("Updating stage...")
        const res = await updateDesignStage(stageId, payload)
        toast.dismiss()
        if (res.success) {
            toast.success("Updated successfully")
            loadData()
        } else {
            toast.error(res.error || "Failed to update")
        }
    }

    if (loading) return <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-primary" size={32} /></div>

    return (
        <div className="space-y-6 mt-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-xl font-bold tracking-tight">Design Architecture Pipeline</h3>
                    <p className="text-muted-foreground text-sm">Track progress, assigns engineers, and manage files for each phase</p>
                </div>
                <Dialog>
                    <DialogTrigger asChild>
                        <Button className="rounded-xl flex gap-2">
                            <Plus size={16} /> New Phase
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <form onSubmit={handleCreate}>
                            <DialogHeader>
                                <DialogTitle>Add New Design Phase</DialogTitle>
                                <DialogDescription>Phase {stages.length + 1} will be created. You can rename it later.</DialogDescription>
                            </DialogHeader>
                            <div className="py-6">
                                <Label>Phase Name (Optional)</Label>
                                <Input name="name" placeholder={`e.g., Phase ${stages.length + 1}`} className="mt-2 rounded-xl" />
                            </div>
                            <DialogFooter>
                                <Button type="submit" className="rounded-xl">Create Phase</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                {stages.map((stage) => (
                    <Card key={stage.id} className="border shadow-sm bg-white overflow-hidden flex flex-col h-full rounded-2xl relative">
                        {stage.status === 'APPROVED' && (
                            <div className="absolute -right-6 top-6 rotate-45 bg-emerald-500 text-white text-[10px] font-bold py-1 px-8 text-center shadow-sm z-10">
                                APPROVED
                            </div>
                        )}
                        <CardHeader className="pb-3 border-b border-slate-50 bg-slate-50/50">
                            <div className="flex justify-between items-start mb-2">
                                <Badge className={`font-semibold ${STATUS_COLORS[stage.status]}`}>
                                    {stage.status.replace('_', ' ')}
                                </Badge>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-400">Phase {stage.order}</span>
                                    <button onClick={() => handleDelete(stage.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                            <div className="flex justify-between items-center group">
                                <CardTitle className="text-lg font-black flex items-center gap-2">
                                    {stage.name}
                                    <StageEditModal stage={stage} engineers={engineers} onUpdated={loadData} />
                                </CardTitle>
                            </div>
                        </CardHeader>

                        <CardContent className="pt-4 flex-1 flex flex-col gap-4">
                            {/* DATES & SPECIALTIES */}
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
                                    <CalendarDays size={14} className="text-primary" />
                                    <div className="truncate">
                                        <p className="text-[10px] text-slate-400 uppercase font-bold">Duration</p>
                                        <p className="font-semibold text-slate-700 truncate">
                                            {stage.startDate ? format(new Date(stage.startDate), 'MMM d') : '?'} - {stage.endDate ? format(new Date(stage.endDate), 'MMM d') : '?'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
                                    <ClipboardList size={14} className="text-primary" />
                                    <div className="truncate">
                                        <p className="text-[10px] text-slate-400 uppercase font-bold">Specialties</p>
                                        <p className="font-semibold text-slate-700 truncate">{stage.specialties || 'None listed'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* PROGRESS */}
                            <div className="space-y-2">
                                <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                                    <span className="text-slate-400">Phase Completion</span>
                                    <span className={stage.progress === 100 ? 'text-emerald-600' : 'text-slate-500'}>{stage.progress}%</span>
                                </div>
                                <div className="flex gap-2 items-center">
                                    <Progress value={stage.progress} className={`h-2 ${stage.progress === 100 ? '[&>div]:bg-emerald-500' : ''}`} />
                                    <div className="flex shrink-0 gap-1">
                                        <button onClick={() => handleUpdate(stage.id, { progress: Math.max(0, stage.progress - 25) })} className="w-5 h-5 rounded bg-slate-100 flex items-center justify-center text-xs hover:bg-slate-200 text-slate-500">-</button>
                                        <button onClick={() => handleUpdate(stage.id, { progress: Math.min(100, stage.progress + 25) })} className="w-5 h-5 rounded bg-primary/10 text-primary flex items-center justify-center text-xs hover:bg-primary/20">+</button>
                                    </div>
                                </div>
                            </div>

                            {/* PM GUIDE / REQUIREMENTS */}
                            {stage.requirements && (
                                <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-100/50 space-y-1">
                                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-700 uppercase">
                                        <BookOpen size={12} /> PM Guide & Requirements
                                    </div>
                                    <p className="text-xs text-slate-600 leading-relaxed italic line-clamp-2">
                                        "{stage.requirements}"
                                    </p>
                                </div>
                            )}

                            {/* ASSIGNED ENGINEERS */}
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-2">
                                    <Users size={12} /> Associated Engineers
                                </Label>
                                <div className="flex flex-wrap gap-1.5">
                                    {stage.assignees?.length > 0 ? (
                                        stage.assignees.map((eng: any) => (
                                            <Badge key={eng.id} variant="secondary" className="rounded-lg bg-slate-100 border-none text-[11px] py-0.5 font-medium">
                                                {eng.name}
                                            </Badge>
                                        ))
                                    ) : (
                                        <p className="text-[10px] text-slate-400 italic">No engineers assigned</p>
                                    )}
                                </div>
                            </div>

                            {/* LINKED TASKS */}
                            {stage.tasks && stage.tasks.length > 0 && (
                                <div className="space-y-2 border-t border-slate-100 pt-3">
                                    <Label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                                        <LayoutList size={12} /> Linked Tasks
                                    </Label>
                                    <div className="space-y-1.5 max-h-[100px] overflow-y-auto pr-1">
                                        {stage.tasks.map((task: any) => (
                                            <div key={task.id} className="bg-slate-50 border border-slate-100 rounded-lg p-2 text-[11px] flex justify-between items-center group/task">
                                                <span className="font-medium text-slate-700 truncate">{task.title}</span>
                                                <Badge className="text-[9px] h-4 px-1 bg-white border-slate-200 text-slate-500 font-bold">{task.status}</Badge>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* FILES / LINKS */}
                            <div className="mt-auto space-y-3 border-t border-slate-100 pt-3">
                                <div className="flex justify-between items-center">
                                    <Label className="text-[10px] font-bold text-slate-400 uppercase italic">Deliverables ({stage.files?.length || 0})</Label>
                                    <AddFileDialog stageId={stage.id} onUploaded={loadData} />
                                </div>

                                {stage.files?.length > 0 ? (
                                    <div className="space-y-1.5">
                                        {stage.files.slice(0, 3).map((file: any) => (
                                            <a key={file.id} href={file.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 hover:bg-blue-50 transition-colors group border border-transparent hover:border-blue-100">
                                                <div className="p-1.5 rounded-md bg-white text-slate-300 group-hover:text-blue-500 shadow-sm border border-slate-100">
                                                    <LinkIcon size={12} />
                                                </div>
                                                <div className="truncate flex-1">
                                                    <p className="text-[11px] font-semibold text-slate-700 truncate">{file.name}</p>
                                                </div>
                                            </a>
                                        ))}
                                        {stage.files.length > 3 && (
                                            <p className="text-[10px] text-center text-slate-400 font-medium">+{stage.files.length - 3} more files</p>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center p-3 border border-dashed rounded-xl bg-slate-50/50">
                                        <p className="text-[10px] text-slate-400">No deliverables uploaded</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}

function StageEditModal({ stage, engineers, onUpdated }: { stage: any, engineers: any[], onUpdated: () => void }) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [startDate, setStartDate] = useState<Date | undefined>(stage.startDate ? new Date(stage.startDate) : undefined)
    const [endDate, setEndDate] = useState<Date | undefined>(stage.endDate ? new Date(stage.endDate) : undefined)
    const [selectedUsers, setSelectedUsers] = useState<string[]>(stage.assignees?.map((a: any) => a.id) || [])

    async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        const fd = new FormData(e.currentTarget)

        const payload = {
            name: fd.get('name') as string,
            description: fd.get('description') as string,
            specialties: fd.get('specialties') as string,
            requirements: fd.get('requirements') as string,
            startDate: startDate || null,
            endDate: endDate || null,
            status: fd.get('status') as string,
        }

        const res = await updateDesignStage(stage.id, payload)
        if (res.success) {
            // Also update assignees
            await assignEngineersToStage(stage.id, selectedUsers)
            toast.success("Stage updated")
            setOpen(false)
            onUpdated()
        } else {
            toast.error(res.error)
        }
        setLoading(false)
    }

    const toggleUser = (userId: string) => {
        setSelectedUsers(prev =>
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        )
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <button className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-primary transition-colors">
                    <Edit2 size={14} />
                </button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <form onSubmit={onSubmit} className="space-y-6">
                    <DialogHeader>
                        <DialogTitle>Edit Design Phase: {stage.name}</DialogTitle>
                        <DialogDescription>Update phase details, timeline, and associated engineers.</DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Phase Name</Label>
                                <Input name="name" defaultValue={stage.name} className="rounded-xl" />
                            </div>
                            <div className="space-y-2">
                                <Label>Status</Label>
                                <Select name="status" defaultValue={stage.status}>
                                    <SelectTrigger className="rounded-xl">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="PENDING">Pending</SelectItem>
                                        <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                                        <SelectItem value="REVIEW">Under Review</SelectItem>
                                        <SelectItem value="APPROVED">Approved</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Specialties / Disciplines</Label>
                                <Input name="specialties" defaultValue={stage.specialties} placeholder="e.g., Structural, MEP, Architectural" className="rounded-xl" />
                            </div>
                            <div className="space-y-2">
                                <Label>Phase Description</Label>
                                <Textarea name="description" defaultValue={stage.description} placeholder="General overview of this design phase..." className="rounded-xl min-h-[100px]" />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Start Date</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className={cn("w-full justify-start text-left font-normal rounded-xl", !startDate && "text-muted-foreground")}>
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {startDate ? format(startDate, "PPP") : "Pick date"}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                            <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <div className="space-y-2">
                                    <Label>End Date</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className={cn("w-full justify-start text-left font-normal rounded-xl", !endDate && "text-muted-foreground")}>
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {endDate ? format(endDate, "PPP") : "Pick date"}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                            <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="flex justify-between items-center">
                                    Associated Engineers
                                    <span className="text-[10px] text-slate-400 uppercase font-bold">{selectedUsers.length} selected</span>
                                </Label>
                                <div className="border rounded-xl p-3 max-h-[150px] overflow-y-auto space-y-1.5 bg-slate-50/50">
                                    {engineers.map(user => (
                                        <div
                                            key={user.id}
                                            onClick={() => toggleUser(user.id)}
                                            className={cn(
                                                "flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all border",
                                                selectedUsers.includes(user.id)
                                                    ? "bg-primary/5 border-primary/20 text-primary"
                                                    : "bg-white border-transparent hover:border-slate-200"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-4 h-4 rounded border flex items-center justify-center",
                                                selectedUsers.includes(user.id) ? "bg-primary border-primary text-white" : "border-slate-300"
                                            )}>
                                                {selectedUsers.includes(user.id) && <CheckCircle2 size={10} />}
                                            </div>
                                            <span className="text-xs font-medium">{user.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-amber-700 flex items-center gap-2">
                                    <BookOpen size={14} /> PM Guide & Requirements
                                </Label>
                                <Textarea
                                    name="requirements"
                                    defaultValue={stage.requirements}
                                    placeholder="Instructions and requirements for the team working on this phase..."
                                    className="rounded-xl min-h-[100px] border-amber-200 bg-amber-50/30 focus-visible:ring-amber-500"
                                />
                                <p className="text-[10px] text-amber-600 italic">This will be shown as a prominent guide for the engineers.</p>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="pt-4 border-t">
                        <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="rounded-xl">Cancel</Button>
                        <Button type="submit" disabled={loading} className="rounded-xl px-8">
                            {loading ? "Saving..." : "Save Phase Changes"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

function AddFileDialog({ stageId, onUploaded }: { stageId: string, onUploaded: () => void }) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        const fd = new FormData(e.currentTarget)
        const res = await uploadDesignStageFile(fd)
        setLoading(false)
        if (res.success) {
            toast.success("Link added")
            setOpen(false)
            onUploaded()
        } else {
            toast.error(res.error)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <button className="text-[10px] font-bold text-primary flex items-center gap-1 hover:underline">
                    <Plus size={12} /> Add Link
                </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={onSubmit}>
                    <input type="hidden" name="stageId" value={stageId} />
                    <DialogHeader>
                        <DialogTitle>Add Deliverable Link</DialogTitle>
                        <DialogDescription>Submit a Drive/Dropbox link for this stage's deliverable.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Description / File Name</Label>
                            <Input name="name" required placeholder="e.g. Final 3D Renders v2" />
                        </div>
                        <div className="grid gap-2">
                            <Label>URL</Label>
                            <Input name="url" type="url" required placeholder="https://drive.google.com/..." />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>{loading ? "Adding..." : "Save Link"}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
