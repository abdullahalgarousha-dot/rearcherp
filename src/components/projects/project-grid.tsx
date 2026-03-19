"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { Project, Brand, EmployeeProfile, Contractor, Task } from "@prisma/client"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Users, Calendar, Briefcase, ArrowRight, Pencil, Trash2, Plus, AlertCircle, Clock, TrendingUp, Layers } from "lucide-react"
import { deleteProject } from "@/app/admin/projects/new/actions"
import { useRouter } from "next/navigation"
import { EmptyState } from "@/components/ui/empty-state"
import { cn } from "@/lib/utils"

interface ProjectGridProps {
    projects: any[]
}

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
}

const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
}

export function ProjectGrid({ projects }: ProjectGridProps) {
    const router = useRouter()

    if (projects.length === 0) {
        return (
            <EmptyState
                icon={Briefcase}
                title="لا توجد مشاريع حالياً"
                description="لم نتمكن من العثور على أي مشاريع تطابق المعايير المختارة. ابدأ بإضافة مشروعك الأول!"
                actionLabel="إفتتاح مشروع جديد"
                onAction={() => router.push('/admin/projects/new')}
            />
        )
    }

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.preventDefault()
        e.stopPropagation()
        if (confirm("Are you sure you want to delete this project?")) {
            const res = await deleteProject(id)
            if (res.success) {
                router.refresh()
            } else {
                alert(res.error || "Failed to delete project")
            }
        }
    }

    const handleEdit = (e: React.MouseEvent, id: string) => {
        e.preventDefault()
        e.stopPropagation()
        router.push(`/admin/projects/${id}/edit`)
    }

    return (
        <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            variants={container}
            initial="hidden"
            animate="show"
        >
            {projects.map((project) => {
                // Calculate Progress
                const totalTasks = project.tasks?.length || 0;
                const completedTasks = project.tasks?.filter((t: any) => t.status === 'DONE').length || 0;
                const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : Math.round(project.completionPercent || 0);

                // Status Logic
                const isActive = project.status === 'ACTIVE';
                const isCompleted = project.status === 'COMPLETED';
                const statusColor = isActive ? 'emerald' : isCompleted ? 'indigo' : 'amber';
                const statusTextEn = isActive ? 'Active' : isCompleted ? 'Completed' : 'On Hold';
                const statusAccent = isActive ? '#22c55e' : isCompleted ? '#6366f1' : '#f59e0b';

                // Service type badge config
                const serviceType = project.serviceType as string | undefined;
                const serviceLabel = serviceType === 'BOTH' ? 'Design + Supervision' : serviceType === 'SUPERVISION' ? 'Supervision' : 'Design';
                const serviceBg = serviceType === 'SUPERVISION' ? 'bg-emerald-100 text-emerald-700' : serviceType === 'BOTH' ? 'bg-violet-100 text-violet-700' : 'bg-sky-100 text-sky-700';

                // Contract value
                const contractValue = project.contractValue;
                const fmt = (n: number) => n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(0)}K` : n.toLocaleString();

                return (
                    <motion.div key={project.id} variants={item}>
                        <Card className="group relative overflow-hidden bg-white border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-xl transition-all duration-300 rounded-2xl flex flex-col h-full">
                            {/* Top Status Bar — colored accent */}
                            <div className="h-1 w-full shrink-0" style={{ backgroundColor: statusAccent }} />

                            <CardHeader className="p-6 pb-3">
                                {/* Brand + Service Type row */}
                                <div className="flex items-center justify-between mb-3">
                                    <span className={cn("text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider", serviceBg)}>
                                        {serviceLabel}
                                    </span>
                                    <Badge variant="outline" className="rounded-lg border-slate-200 text-slate-500 font-bold bg-slate-50 uppercase text-[9px] tracking-tighter">
                                        {project.brand?.shortName || project.brand?.nameEn}
                                    </Badge>
                                </div>

                                {/* Status + Name */}
                                <div className="flex items-start gap-2">
                                    <div className={cn(
                                        "h-2 w-2 rounded-full mt-1.5 flex-shrink-0",
                                        isActive ? "bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.5)] animate-pulse"
                                            : isCompleted ? "bg-indigo-500"
                                                : "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                                    )} />
                                    <CardTitle className="text-lg font-black text-slate-900 leading-tight">
                                        <Link href={`/admin/projects/${project.id}`} className="hover:text-indigo-700 transition-colors">
                                            {project.name}
                                        </Link>
                                    </CardTitle>
                                </div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-4 mt-1">
                                    {project.code} · {statusTextEn}
                                </p>
                            </CardHeader>

                            <CardContent className="p-6 pt-0 space-y-5 flex-1">
                                {/* Contract Value Hero */}
                                {contractValue ? (
                                    <div className="rounded-xl bg-[#1e293b] px-4 py-3 flex items-center justify-between">
                                        <div>
                                            <p className="text-[9px] font-black uppercase tracking-[0.15em] text-white/40 mb-0.5">Contract Value</p>
                                            <p className="text-xl font-black text-white tracking-tight">SAR {fmt(contractValue)}</p>
                                        </div>
                                        <TrendingUp className="h-5 w-5 text-white/20" />
                                    </div>
                                ) : (
                                    <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
                                        <p className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 mb-0.5">Contract Value</p>
                                        <p className="text-sm font-bold text-slate-400">Not specified</p>
                                    </div>
                                )}

                                {/* Progress */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Completion</p>
                                        <div className="flex items-center gap-2">
                                            <div className="flex -space-x-1.5">
                                                {(project.engineers || []).slice(0, 4).map((eng: any, i: number) => (
                                                    <div key={i}
                                                        className="h-6 w-6 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-700 shadow-sm"
                                                        title={eng.name}>
                                                        {eng.name?.charAt(0)}
                                                    </div>
                                                ))}
                                                {(project.engineers || []).length > 4 && (
                                                    <div className="h-6 w-6 rounded-full border-2 border-white bg-slate-900 flex items-center justify-center text-[8px] font-bold text-white shadow-sm">
                                                        +{(project.engineers || []).length - 4}
                                                    </div>
                                                )}
                                            </div>
                                            <span className="text-xs font-black text-slate-900">{progress}%</span>
                                        </div>
                                    </div>
                                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <motion.div
                                            className="h-full rounded-full"
                                            style={{ backgroundColor: statusAccent }}
                                            initial={{ width: 0 }}
                                            animate={{ width: `${progress}%` }}
                                            transition={{ duration: 0.8, ease: "easeOut" }}
                                        />
                                    </div>
                                </div>

                                {/* Metadata row */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Client</p>
                                        <p className="text-xs font-bold text-slate-700 truncate">
                                            {project.client?.name || project.legacyClientName || '—'}
                                        </p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Start Date</p>
                                        <p className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                            <Clock className="w-3 h-3 text-slate-300" />
                                            {project.startDate ? new Date(project.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>

                            <CardFooter className="px-6 pb-5 pt-0">
                                <div className="flex items-center justify-between w-full gap-2 border-t border-slate-100 pt-4">
                                    <div className="flex gap-1.5">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                                            onClick={(e) => handleEdit(e, project.id)}
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                            onClick={(e) => handleDelete(e, project.id)}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                    <Button
                                        className="h-9 px-5 rounded-xl bg-[#1e293b] text-white hover:bg-slate-700 font-black text-[11px] uppercase tracking-widest shadow-md transition-all"
                                        asChild
                                    >
                                        <Link href={`/admin/projects/${project.id}`}>
                                            Open Project <ArrowRight className="ml-1.5 h-3 w-3" />
                                        </Link>
                                    </Button>
                                </div>
                            </CardFooter>
                        </Card>
                    </motion.div>
                )
            })}
        </motion.div>
    )
}
