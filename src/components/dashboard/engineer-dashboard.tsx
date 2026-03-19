"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { AlertTriangle, CheckCircle2, Clock, HardHat, FileText, AlertOctagon } from "lucide-react"
import { TimesheetWidget } from "@/components/dashboard/timesheet-widget"
import { RecentUploadsFeed } from "@/components/dashboard/recent-uploads-feed"

type EngineerDashboardProps = {
    myProjects: any[]
    myTasks: any[]
    pendingIRs: any[]
    pendingNCRs: any[]
    companyProfile: any
    recentUploads: any[]
    user: any
}

export function EngineerDashboard({ myProjects, myTasks, pendingIRs, pendingNCRs, companyProfile, recentUploads, user }: EngineerDashboardProps) {

    const activeTasks = myTasks.filter(t => t.progress < 100);
    const criticalTasks = activeTasks.filter(t => new Date(t.end) < new Date());

    return (
        <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-[1fr_400px] items-start">
                <div className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100 shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-bold text-blue-800">Assigned Projects</CardTitle>
                                <HardHat className="h-4 w-4 text-blue-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-black text-blue-900">{myProjects.length}</div>
                                <p className="text-xs text-blue-600 mt-1 font-medium">Active consultant sites</p>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-emerald-50 to-white border-emerald-100 shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-bold text-emerald-800">Active Tasks</CardTitle>
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-black text-emerald-900">{activeTasks.length}</div>
                                <p className="text-xs text-emerald-600 mt-1 font-medium">{criticalTasks.length} overdue</p>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-amber-50 to-white border-amber-100 shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-bold text-amber-800">Pending IRs</CardTitle>
                                <FileText className="h-4 w-4 text-amber-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-black text-amber-900">{pendingIRs.length}</div>
                                <p className="text-xs text-amber-600 mt-1 font-medium">Awaiting your review</p>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-rose-50 to-white border-rose-100 shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-bold text-rose-800">Pending NCRs</CardTitle>
                                <AlertOctagon className="h-4 w-4 text-rose-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-black text-rose-900">{pendingNCRs.length}</div>
                                <p className="text-xs text-rose-600 mt-1 font-medium">Require immediate action</p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                        <Card className="shadow-lg border-slate-200">
                            <CardHeader className="bg-slate-50 border-b border-slate-100 rounded-t-xl">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Clock className="h-5 w-5 text-slate-500" />
                                    Priority Tasks
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                {activeTasks.length === 0 ? (
                                    <div className="p-8 text-center text-slate-500 font-medium">No active tasks.</div>
                                ) : (
                                    <div className="divide-y divide-slate-100">
                                        {activeTasks.slice(0, 5).map((task) => {
                                            const isLate = new Date(task.end) < new Date()
                                            return (
                                                <div key={task.id} className="p-4 hover:bg-slate-50 transition-colors flex justify-between items-center group">
                                                    <div>
                                                        <h4 className="font-bold text-slate-900">{task.name}</h4>
                                                        <p className="text-xs text-slate-500 mt-1">{task.project.name}</p>
                                                    </div>
                                                    <div className="text-right flex flex-col items-end gap-2">
                                                        <Badge variant={isLate ? "destructive" : "secondary"} className={isLate ? "animate-pulse" : ""}>
                                                            {isLate ? 'Overdue' : 'On Track'}
                                                        </Badge>
                                                        <span className="text-[10px] uppercase font-bold text-slate-400">
                                                            Due: {new Date(task.end).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="shadow-lg border-slate-200">
                            <CardHeader className="bg-slate-50 border-b border-slate-100 rounded-t-xl">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <AlertTriangle className="h-5 w-5 text-rose-500" />
                                    DSR Performance (Actual vs Planned)
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                {myProjects.length === 0 ? (
                                    <div className="p-8 text-center text-slate-500 font-medium">No project data available.</div>
                                ) : (
                                    <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                                        {myProjects.map((project) => {
                                            // Derive simple delta metric. (Since advanced DSR daily aggregation involves many relations, we use current progress vs elapsed project time)
                                            const start = new Date(project.startDate || project.createdAt);
                                            const end = new Date(project.endDate || new Date(start.getTime() + (project.totalDuration || 30) * 24 * 60 * 60 * 1000));
                                            const now = new Date();

                                            const totalDays = Math.max(1, (end.getTime() - start.getTime()) / (1000 * 3600 * 24));
                                            const elapsedDays = Math.max(0, (now.getTime() - start.getTime()) / (1000 * 3600 * 24));

                                            const plannedCompletion = Math.min(100, Math.round((elapsedDays / totalDays) * 100));
                                            const actualCompletion = Math.round(project.completionPercent || 0);
                                            const delta = actualCompletion - plannedCompletion;

                                            const isWarning = delta <= -5;

                                            return (
                                                <div key={project.id} className="p-5 hover:bg-slate-50 transition-colors">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div>
                                                            <h4 className="font-bold text-slate-900">{project.code}</h4>
                                                            <p className="text-xs text-slate-500 mt-1 line-clamp-1">{project.name}</p>
                                                        </div>
                                                        <Link href={`/admin/projects/${project.id}`}>
                                                            <Button variant="outline" size="sm" className="h-7 text-xs font-bold">View</Button>
                                                        </Link>
                                                    </div>

                                                    <div className="space-y-4">
                                                        <div>
                                                            <div className="flex justify-between text-xs mb-1 font-bold">
                                                                <span className="text-slate-500">Planned Completion</span>
                                                                <span className="text-slate-700">{plannedCompletion}%</span>
                                                            </div>
                                                            <div className="w-full bg-slate-100 rounded-full h-1.5">
                                                                <div className="bg-slate-400 h-1.5 rounded-full" style={{ width: `${plannedCompletion}%` }}></div>
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <div className="flex justify-between text-xs mb-1 font-bold">
                                                                <span className={isWarning ? "text-rose-600" : "text-emerald-600"}>Actual Completion (from DSR)</span>
                                                                <span className={isWarning ? "text-rose-600" : "text-emerald-600"}>{actualCompletion}%</span>
                                                            </div>
                                                            <div className="w-full bg-slate-100 rounded-full h-2">
                                                                <div className={`h-2 rounded-full ${isWarning ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${actualCompletion}%` }}></div>
                                                            </div>
                                                        </div>

                                                        <div className={`text-xs font-bold text-right ${isWarning ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                            Delta: {delta > 0 ? '+' : ''}{delta}% {isWarning && '(Action Required)'}
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Right Sidebar */}
                <div className="space-y-6 lg:col-span-1 border-l border-slate-100 pl-4">
                    <RecentUploadsFeed uploads={recentUploads} />
                    <div className="relative z-10">
                        <TimesheetWidget projects={myProjects} tasks={myTasks} dailyGoal={companyProfile?.workingHoursPerDay || 8} />
                    </div>
                </div>
            </div>
        </div>
    )
}
