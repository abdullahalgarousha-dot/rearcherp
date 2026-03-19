"use client"

import { Task } from "gantt-task-react";
import "gantt-task-react/dist/index.css";
import { ViewMode, Gantt } from "gantt-task-react";
import { useState, useRef } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Button } from "@/components/ui/button";
import { Download, Calendar, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Props = {
    tasks: any[]
    project: any
    stages?: any[]
}

const globalStyles = `
  /* Today — bold red vertical indicator */
  .gantt .today-highlight {
    fill: rgba(239, 68, 68, 0.06) !important;
    stroke: #ef4444 !important;
    stroke-width: 2.5px !important;
    stroke-dasharray: none !important;
  }
  /* gantt-task-react also renders a <line class="today"> in some versions */
  .gantt line.today,
  .gantt .today-line {
    stroke: #ef4444 !important;
    stroke-width: 2.5px !important;
    stroke-dasharray: none !important;
    opacity: 1 !important;
  }
  .gantt .bar-wrapper .bar-label {
    font-weight: 800 !important;
    text-transform: uppercase !important;
    letter-spacing: -0.025em !important;
    fill: #1e293b !important;
  }
  .gantt .grid-row {
     fill: transparent !important;
  }
  .gantt .grid-row:nth-child(even) {
     fill: rgba(248, 250, 252, 0.5) !important;
  }
`;

function safeParseDeps(deps: any): string[] {
    if (Array.isArray(deps)) return deps;
    if (typeof deps !== 'string' || !deps.trim().startsWith('[')) return [];
    try { return JSON.parse(deps); } catch { return []; }
}

export function ProjectGanttChart({ tasks, project, stages = [] }: Props) {
    const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Month);
    const [filter, setFilter] = useState<'ALL' | 'DESIGN' | 'SUPERVISION'>('ALL');
    const [isExporting, setIsExporting] = useState(false);
    const ganttRef = useRef<HTMLDivElement>(null);
    const printRef = useRef<HTMLDivElement>(null);

    // Filter out supervision tasks from the main Gantt view as requested, 
    // especially when viewing the Design Pipeline context.
    const filteredTasks = tasks.filter(t => {
        if (filter === 'ALL') return t.type !== 'SUPERVISION';
        return t.type === filter;
    });
    const tasksMap = new Map(filteredTasks.map(t => [t.id, t]));
    const now = new Date();

    const isPredecessorDelayed = (taskId: string, visited = new Set<string>()): boolean => {
        if (visited.has(taskId)) return false;
        visited.add(taskId);
        const task = tasksMap.get(taskId);
        if (!task) return false;

        const deps = safeParseDeps(task.dependencies);

        for (const depId of deps) {
            const dep = tasksMap.get(depId);
            if (!dep) continue;
            const depDelayed = (now > new Date(dep.end) && dep.progress < 100);
            const depNotCompleteButConstraining = (dep.progress < 100);
            if (depDelayed || depNotCompleteButConstraining || isPredecessorDelayed(depId, visited)) return true;
        }
        return false;
    };

    const taskElements: Task[] = []

    // 1. Add Phase/Stage Bars (Projects)
    stages.forEach(stage => {
        const stageTasks = filteredTasks.filter(t => t.designStageId === stage.id)

        // Use stage dates or fallback to task dates or fallback to today
        const sDate = stage.startDate ? new Date(stage.startDate) : (stageTasks.length > 0 ? new Date(Math.min(...stageTasks.map(t => new Date(t.start).getTime()))) : new Date())
        const eDate = stage.endDate ? new Date(stage.endDate) : (stageTasks.length > 0 ? new Date(Math.max(...stageTasks.map(t => new Date(t.end).getTime()))) : new Date())

        // Ensure eDate >= sDate
        if (eDate < sDate) eDate.setTime(sDate.getTime() + 86400000)

        taskElements.push({
            start: sDate,
            end: eDate,
            name: `PHASE: ${stage.name}`,
            id: `STAGE_${stage.id}`,
            type: 'project',
            progress: stage.progress || 0,
            hideChildren: false,
            styles: {
                progressColor: '#3b82f6',
                progressSelectedColor: '#2563eb',
                backgroundColor: '#dbeafe',
                backgroundSelectedColor: '#bfdbfe',
            },
        })

        // 2. Add Tasks linked to this phase
        stageTasks.forEach(t => {
            const initials = t.assignees?.map((a: any) => a.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()).join(', ')
            const displayName = initials ? `${t.title} [${initials}]` : t.title

            const isDelayed = now > new Date(t.end) && t.progress < 100
            const isFuture = now < new Date(t.start)
            const isAtRisk = isPredecessorDelayed(t.id)

            let barColor = '#22c55e'
            let progressColor = '#15803d'

            if (isDelayed) {
                barColor = '#ef4444'
                progressColor = '#b91c1c'
            } else if (isAtRisk) {
                barColor = '#f97316'
                progressColor = '#c2410c'
            } else if (isFuture) {
                barColor = '#94a3b8'
                progressColor = '#64748b'
            }

            taskElements.push({
                start: new Date(t.start),
                end: new Date(t.end),
                name: displayName,
                id: t.id,
                project: `STAGE_${stage.id}`,
                type: 'task',
                progress: t.progress,
                isDisabled: true,
                dependencies: safeParseDeps(t.dependencies),
                styles: {
                    progressColor: progressColor,
                    progressSelectedColor: progressColor,
                    backgroundColor: barColor,
                    backgroundSelectedColor: barColor,
                },
            })
        })
    })

    // 3. Add Orphan Tasks (not linked to any stage)
    const orphanTasks = filteredTasks.filter(t => !t.designStageId)
    if (orphanTasks.length > 0) {
        taskElements.push({
            start: new Date(Math.min(...orphanTasks.map(t => new Date(t.start).getTime()))),
            end: new Date(Math.max(...orphanTasks.map(t => new Date(t.end).getTime()))),
            name: "Other Activities",
            id: "STAGE_ORPHAN",
            type: 'project',
            progress: 0,
            hideChildren: false,
            styles: {
                progressColor: '#94a3b8',
                progressSelectedColor: '#64748b',
                backgroundColor: '#f1f5f9',
                backgroundSelectedColor: '#e2e8f0',
            },
        })

        orphanTasks.forEach(t => {
            const initials = t.assignees?.map((a: any) => a.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()).join(', ')
            taskElements.push({
                start: new Date(t.start),
                end: new Date(t.end),
                name: initials ? `${t.title} [${initials}]` : t.title,
                id: t.id,
                project: "STAGE_ORPHAN",
                type: 'task',
                progress: t.progress,
                isDisabled: true,
                dependencies: safeParseDeps(t.dependencies),
                styles: {
                    progressColor: '#64748b',
                    progressSelectedColor: '#475569',
                    backgroundColor: '#94a3b8',
                    backgroundSelectedColor: '#64748b',
                },
            })
        })
    }

    const ganttTasks = taskElements

    const startDate = ganttTasks.length > 0 ? new Date(Math.min(...ganttTasks.map(t => t.start.getTime()))) : new Date();
    const endDate = ganttTasks.length > 0 ? new Date(Math.max(...ganttTasks.map(t => t.end.getTime()))) : new Date();
    const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    const TaskListHeader = ({ headerHeight }: { headerHeight: number }) => {
        return (
            <div
                style={{ height: headerHeight }}
                className="flex items-center font-bold text-xs uppercase bg-slate-50 border-r border-b text-slate-500"
            >
                <div className="flex-1 px-4 border-r h-full flex items-center">Phases & Activities</div>
                <div className="w-16 px-2 h-full flex items-center justify-center text-center">%</div>
            </div>
        );
    };

    const TaskListTable = ({ rowHeight, tasks, fontFamily, fontSize }: any) => {
        return (
            <div className="border-r bg-white font-medium text-xs text-slate-700">
                {tasks.map((t: Task) => (
                    <div
                        key={t.id}
                        style={{ height: rowHeight }}
                        className="flex items-center border-b hover:bg-slate-50 transition-colors"
                    >
                        <div className={cn(
                            "flex-1 px-4 truncate border-r h-full flex items-center",
                            t.type === 'project' ? "font-black text-slate-900 bg-slate-50 uppercase tracking-tight" : "pl-8"
                        )} title={t.name}>
                            {t.name}
                        </div>
                        <div className="w-16 px-2 h-full flex items-center justify-center font-bold text-slate-900 bg-slate-50/50">
                            {t.progress}%
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const handleDownloadPDF = async () => {
        if (!printRef.current) return;
        setIsExporting(true);

        try {
            await new Promise(resolve => setTimeout(resolve, 1500));

            const element = printRef.current;

            const canvas = await html2canvas(element, {
                scale: 1.5,
                useCORS: true,
                allowTaint: true,
                logging: false,
                windowWidth: 2000,
                backgroundColor: '#ffffff',
                imageTimeout: 10000,
                // Pre-validate every <img> in the cloned DOM.
                // Broken / 404 images are hidden so html2canvas never stalls on them.
                onclone: (_doc, clonedEl) => {
                    const imgs = clonedEl.querySelectorAll<HTMLImageElement>('img');
                    return Promise.all(
                        Array.from(imgs).map(
                            img =>
                                new Promise<void>(resolve => {
                                    if (img.complete && img.naturalWidth > 0) {
                                        resolve();
                                    } else {
                                        img.onload = () => resolve();
                                        img.onerror = () => {
                                            img.style.display = 'none';
                                            resolve();
                                        };
                                        // Kick off load if src is already set but not yet loaded
                                        if (img.src) img.src = img.src;
                                    }
                                })
                        )
                    ) as unknown as void;
                },
            });

            if (!canvas || canvas.width === 0) {
                throw new Error("Canvas rendering failed");
            }

            console.log("Canvas captured, creating PDF...");
            const imgData = canvas.toDataURL('image/jpeg', 0.8); // Use JPEG for better performance/smaller size
            const pdf = new jsPDF({
                orientation: 'l',
                unit: 'mm',
                format: 'a3'
            });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const imgProps = pdf.getImageProperties(imgData);
            const ratio = imgProps.width / imgProps.height;
            const finalHeight = pdfWidth / ratio;

            pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, finalHeight);

            const fileName = `${(project.code || 'Gantt').replace(/[^a-z0-9]/gi, '_')}.pdf`;
            console.log(`Saving PDF as ${fileName}`);
            pdf.save(fileName);

            toast.success("PDF exported successfully");

        } catch (error: any) {
            console.error("Export failed", error);
            toast.error(`Export failed: ${error.message || 'Unknown error'}`);
        } finally {
            setIsExporting(false);
        }
    }

    if (tasks.length === 0) {
        return <div className="text-center p-12 bg-slate-50/50 rounded-[2rem] border-2 border-dashed border-slate-200">
            <p className="font-bold text-slate-400">No tasks defined yet.</p>
        </div>
    }

    const StatusLegend = () => (
        <div className="flex flex-wrap gap-4 text-xs font-bold bg-white p-3 rounded-xl border border-slate-100 shadow-sm print:hidden">
            <div className="flex items-center gap-1.5"><span className="w-4 h-4 rounded-sm bg-[#22c55e] block border border-[#16a34a]"></span> On-track</div>
            <div className="flex items-center gap-1.5"><span className="w-4 h-4 rounded-sm bg-[#ef4444] block border border-[#b91c1c]"></span> Delayed</div>
            <div className="flex items-center gap-1.5"><span className="w-4 h-4 rounded-sm bg-[#f97316] block border border-[#c2410c]"></span> At Risk</div>
            <div className="flex items-center gap-1.5"><span className="w-4 h-4 rounded-sm bg-[#94a3b8] block border border-[#64748b]"></span> Future</div>
        </div>
    );

    return (
        <div className="w-full space-y-6">
            <style dangerouslySetInnerHTML={{ __html: globalStyles }} />

            {/* Controls Bar */}
            <div className="flex flex-wrap justify-between items-center gap-4 bg-white p-3 rounded-2xl shadow-sm border border-slate-100 print:hidden">
                <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl">
                    {[
                        { label: 'All', value: 'ALL' },
                        { label: 'Design', value: 'DESIGN' },
                        { label: 'Supervision', value: 'SUPERVISION' }
                    ].map(opt => (
                        <button
                            key={opt.value}
                            onClick={() => setFilter(opt.value as any)}
                            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${filter === opt.value ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-4">
                    <StatusLegend />
                    <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl mr-2">
                        {[ViewMode.Day, ViewMode.Week, ViewMode.Month].map(mode => (
                            <button
                                key={mode}
                                onClick={() => setViewMode(mode)}
                                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${viewMode === mode ? 'bg-white shadow-sm text-primary' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                {mode}
                            </button>
                        ))}
                    </div>
                    <Button onClick={handleDownloadPDF} disabled={isExporting} className="rounded-xl font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-md">
                        {isExporting ? 'Exporting...' : <><Download className="h-4 w-4 mr-2" /> Export PDF</>}
                    </Button>
                </div>
            </div>

            {/* Interactive Chart Container */}
            <div className="overflow-hidden rounded-[2.5rem] border border-slate-200 shadow-xl bg-white relative group" ref={ganttRef}>
                {/* Decorative Elements */}
                <div className="absolute top-0 left-0 w-2 h-full bg-primary/20 z-10" />
                {/* TODAY badge — floats at top of chart area, right-aligned to avoid task list */}
                <div className="absolute top-3 right-4 z-20 flex items-center gap-1.5 bg-red-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-lg shadow-red-500/30 print:hidden pointer-events-none">
                    <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse inline-block" />
                    TODAY · {now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>

                {ganttTasks.length > 0 ? (
                    <Gantt
                        tasks={ganttTasks}
                        viewMode={viewMode}
                        locale="en-GB"
                        listCellWidth="350px"
                        columnWidth={viewMode === ViewMode.Month ? 120 : 80}
                        headerHeight={60}
                        rowHeight={60}
                        barCornerRadius={12}
                        barFill={85}
                        todayColor="rgba(239,68,68,0.08)"
                        fontFamily="Inter, Cairo, sans-serif"
                        TaskListHeader={TaskListHeader}
                        TaskListTable={TaskListTable}
                        arrowColor="#94a3b8"
                        arrowIndent={24}
                        TooltipContent={({ task }) => (
                            <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-white/10 min-w-[200px] animate-in fade-in zoom-in duration-200">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{task.type === 'project' ? 'Phase' : 'Activity'}</p>
                                <p className="text-sm font-black mb-3">{task.name}</p>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center text-[11px]">
                                        <span className="text-slate-400">Timeline</span>
                                        <span className="font-bold">{task.start.toLocaleDateString()} - {task.end.toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[11px]">
                                        <span className="text-slate-400">Progress</span>
                                        <div className="flex items-center gap-2">
                                            <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden">
                                                <div className="h-full bg-primary" style={{ width: `${task.progress}%` }} />
                                            </div>
                                            <span className="font-bold text-primary">{task.progress}%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    />
                ) : (
                    <div className="p-20 text-center text-slate-400 font-medium bg-slate-50/50">
                        <Calendar className="w-12 h-12 mx-auto mb-4 opacity-10" />
                        <p className="text-lg font-bold">No timeline data matches your criteria.</p>
                    </div>
                )}
            </div>

            {/* Hidden Print Container - A3 Landscape Optimized (Deltek Style) */}
            <div className="absolute left-[-9999px] top-0" aria-hidden="true">
                <div
                    ref={printRef}
                    className="w-[420mm] bg-white text-slate-900 p-10 flex flex-col font-sans"
                    style={{ minHeight: '297mm' }}
                >
                    {/* Deltek-Style Professional Header */}
                    <div className="flex justify-between items-start mb-10 border-b-[6px] border-slate-900 pb-8">
                        <div className="space-y-3">
                            <h1 className="text-5xl font-black tracking-tight text-slate-900 uppercase leading-none">{project.brand?.nameEn}</h1>
                            <h2 className="text-xl font-bold text-slate-500 tracking-[0.2em] uppercase">{project.brand?.fullName || "Architectural & Engineering Consultancy"}</h2>
                            <div className="flex gap-8 mt-4 text-sm font-bold text-slate-400 uppercase tracking-widest bg-slate-50 p-3 rounded-lg inline-flex">
                                <span>CR: {project.brand?.crNumber || 'N/A'}</span>
                                <span>VAT: {project.brand?.vatNumber || 'N/A'}</span>
                                <span>Export Date: {new Date().toLocaleDateString('en-GB')}</span>
                            </div>
                        </div>
                        {project.brand?.logoUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={project.brand.logoUrl}
                                alt="Brand Logo"
                                className="h-32 w-auto object-contain"
                                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                            />
                        )}
                    </div>

                    {/* Project Status Block */}
                    <div className="grid grid-cols-3 gap-10 mb-10 bg-slate-50 p-8 rounded-[2rem] border border-slate-200 shadow-inner">
                        <div className="col-span-2">
                            <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Project Execution</p>
                            <h3 className="text-4xl font-black text-slate-900 leading-tight mb-2">{project.name}</h3>
                            <p className="text-xl font-bold text-slate-500">{project.client?.name || project.legacyClientName}</p>
                        </div>
                        <div className="grid grid-cols-1 gap-6 text-right justify-end">
                            <div>
                                <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Project Code</p>
                                <p className="text-3xl font-black text-slate-900">{project.code}</p>
                            </div>
                            <div>
                                <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Total Timeline</p>
                                <p className="text-2xl font-bold text-slate-700">{durationDays} Calendar Days</p>
                            </div>
                        </div>
                    </div>

                    {/* Timeline Title & Legend */}
                    <div className="flex justify-between items-end mb-6">
                        <div className="flex items-center gap-3">
                            <Calendar className="h-8 w-8 text-slate-900" />
                            <h4 className="text-3xl font-black uppercase tracking-tight text-slate-900">Gantt Chart Details</h4>
                        </div>
                        <div className="flex flex-wrap gap-4 text-xs font-bold bg-white p-3 rounded-xl border border-slate-200">
                            <div className="flex items-center gap-1.5"><span className="w-4 h-4 rounded-sm bg-[#22c55e] block border border-[#16a34a]"></span> On-track</div>
                            <div className="flex items-center gap-1.5"><span className="w-4 h-4 rounded-sm bg-[#ef4444] block border border-[#b91c1c]"></span> Delayed</div>
                            <div className="flex items-center gap-1.5"><span className="w-4 h-4 rounded-sm bg-[#f97316] block border border-[#c2410c]"></span> At Risk</div>
                            <div className="flex items-center gap-1.5"><span className="w-4 h-4 rounded-sm bg-[#94a3b8] block border border-[#64748b]"></span> Future</div>
                        </div>
                    </div>

                    {/* Static Gantt for Print */}
                    <div className="border-[3px] border-slate-900 rounded-2xl overflow-hidden bg-white shadow-sm">
                        {ganttTasks.length > 0 ? (
                            <Gantt
                                tasks={ganttTasks}
                                viewMode={viewMode}
                                locale="en-GB"
                                listCellWidth="400px"
                                columnWidth={viewMode === ViewMode.Month ? 120 : 70}
                                headerHeight={60}
                                rowHeight={60}
                                barCornerRadius={4}
                                barFill={80}
                                fontFamily="sans-serif"
                                arrowColor="#64748b"
                                arrowIndent={20}
                                TaskListHeader={({ headerHeight }) => (
                                    <div style={{ height: headerHeight }} className="flex items-center font-black text-sm uppercase bg-slate-100 border-r-2 border-slate-900 border-b-2 text-slate-700">
                                        <div className="flex-1 px-6 border-r-2 border-slate-900 h-full flex items-center tracking-wider">Task Profile & Resources</div>
                                        <div className="w-20 px-2 h-full flex items-center justify-center text-center">%</div>
                                    </div>
                                )}
                                TaskListTable={({ rowHeight, tasks }) => (
                                    <div className="border-r-2 border-slate-900 bg-white font-bold text-sm text-slate-800">
                                        {tasks.map((t: Task) => (
                                            <div key={t.id} style={{ height: rowHeight }} className="flex items-center border-b border-slate-200">
                                                <div className={cn(
                                                    "flex-1 px-6 truncate border-r-2 border-slate-900 h-full flex items-center",
                                                    t.type === 'project' ? "font-black text-slate-900 bg-slate-100 uppercase tracking-tight" : "pl-12 font-bold text-slate-600"
                                                )}>
                                                    {t.name}
                                                </div>
                                                <div className="w-20 px-2 h-full flex items-center justify-center font-black bg-slate-50">
                                                    {t.progress}%
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            />
                        ) : (
                            <div className="p-16 text-center text-slate-400 italic text-xl">
                                No tasks to display for this view.
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="mt-auto pt-10 border-t-[3px] border-slate-900 flex justify-between items-center text-sm text-slate-500 font-bold uppercase tracking-widest">
                        <span>CONFIDENTIAL - {project.brand?.shortName || "SYSTEM"} PROJECT MANAGEMENT</span>
                        <span>PAGE 1 OF 1</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
