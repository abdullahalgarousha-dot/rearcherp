"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { submitTimeLog, getTodayLogs } from "@/app/actions/timesheet"
import { Loader2, Plus, Clock, Briefcase, Building2 } from "lucide-react"

export function TimesheetWidget({ projects, tasks = [], dailyGoal = 8 }: { projects: any[], tasks?: any[], dailyGoal?: number }) {
    const [loading, setLoading] = useState(false)
    const [todayLogs, setTodayLogs] = useState<any[]>([])
    const [mounted, setMounted] = useState(false)

    const [projectId, setProjectId] = useState<string>("")
    const [hours, setHours] = useState<string>("1.0")
    const [description, setDescription] = useState<string>("")
    const [activeTab, setActiveTab] = useState<string>("site")

    useEffect(() => {
        setMounted(true)
        refreshLogs()
    }, [])

    async function refreshLogs() {
        const logs = await getTodayLogs()
        setTodayLogs(logs)
    }

    const totalHours = todayLogs.reduce((sum, log) => sum + log.hoursLogged, 0)
    const progress = Math.min((totalHours / dailyGoal) * 100, 100)

    async function handleSubmit() {
        if (!description) {
            toast.error("Please provide a description")
            return
        }

        // Project is MANDATORY for all types of work (Site/Office)
        if (!projectId) {
            toast.error("Please select a project. Every hour must be anchored to a Cost Center.")
            return
        }

        setLoading(true)
        const res = await submitTimeLog({
            date: new Date(),
            hoursLogged: parseFloat(hours),
            description,
            type: activeTab === 'site' ? "SITE" : "OFFICE",
            projectId
        })
        setLoading(false)

        if (res.success) {
            toast.success(res.message || "Time logged successfully")
            setDescription("")
            setHours("1.0")
            refreshLogs()
        } else {
            toast.error(res.error)
        }
    }

    if (!mounted) {
        return (
            <Card className="shadow-lg border-white/20 bg-white/60 backdrop-blur-xl h-[400px] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary/30" />
            </Card>
        )
    }

    return (
        <Card className="shadow-lg border-white/20 bg-white/60 backdrop-blur-xl">
            <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                    <CardTitle className="text-lg font-black flex items-center gap-2">
                        <Clock className="h-5 w-5 text-primary" />
                        سجل الوقت (Timesheet)
                    </CardTitle>
                    <div className="text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Logged Today</p>
                        <p className="text-lg font-black text-slate-900">{totalHours} / {dailyGoal}.0h</p>
                    </div>
                </div>
                {/* Progress Bar */}
                <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div
                        className={`h-full transition-all duration-500 rounded-full ${progress >= 100 ? 'bg-emerald-500' : 'bg-primary'}`}
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="site" className="w-full" onValueChange={(val) => {
                    setActiveTab(val)
                    if (val === 'office' && !projectId) setProjectId("OFFICE") // Default to office
                }}>
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                        <TabsTrigger value="site" className="text-xs font-bold gap-2">
                            <Briefcase className="h-3 w-3" /> عمل الموقع (Site)
                        </TabsTrigger>
                        <TabsTrigger value="office" className="text-xs font-bold gap-2 rounded-lg">
                            <Building2 className="h-3 w-3" /> العمل المكتبي (Office)
                        </TabsTrigger>
                    </TabsList>
                </Tabs>

                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <Label className="text-xs font-black text-slate-500 uppercase">المشروع (Project)</Label>
                        <Select value={projectId} onValueChange={(val) => { setProjectId(val) }}>
                            <SelectTrigger className="h-9 bg-white/50 border-slate-200 text-xs">
                                <SelectValue placeholder="اختر المشروع..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="OFFICE" className="text-xs font-bold italic">
                                    -- عمل مكتبي عام (Generic Office) --
                                </SelectItem>
                                {projects.map((p) => (
                                    <SelectItem key={p.id} value={p.id} className="text-xs">
                                        {p.code} - {p.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs font-black text-slate-500 uppercase">الساعات (Hours)</Label>
                        <Select value={hours} onValueChange={setHours}>
                            <SelectTrigger className="h-9 bg-white/50 border-slate-200 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {[0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 9, 10, 11, 12].map(h => (
                                    <SelectItem key={h} value={h.toString()} className="text-xs">{h} h</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs font-black text-slate-500 uppercase">الوصف (Description)</Label>
                        <Input
                            placeholder="ماذا أنجزت؟"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="h-9 bg-white/50 border-slate-200 text-xs"
                        />
                    </div>

                    <Button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-10 shadow-lg shadow-primary/20 rounded-xl"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="mr-2 h-4 w-4" /> تسجيل الوقت</>}
                    </Button>
                </div>

                {/* mini Log Summary */}
                {todayLogs.length > 0 && (
                    <div className="mt-6 space-y-2">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Recent Today</Label>
                        <div className="py-2">
                            {todayLogs.length === 0 ? (
                                <p className="text-xs text-center text-slate-400 py-4 font-bold flex flex-col items-center gap-2">
                                    <span>لا يوجد سجلات اليوم</span>
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {todayLogs.map(log => (
                                        <div key={log.id} className="flex justify-between items-start text-xs p-2 rounded-lg bg-white/40 border border-slate-100 hover:bg-white transition-colors">
                                            <div>
                                                <p className="font-bold text-slate-900">{log.project?.name || "مشروع غير محدد"}</p>
                                                <p className="text-slate-500 flex items-center gap-1 mt-0.5">
                                                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black tracking-wider ${log.type === 'SITE' ? 'bg-indigo-100 text-indigo-700' : 'bg-rose-100 text-rose-700'
                                                        }`}>
                                                        {log.type === 'SITE' ? 'SITE' : 'OFFICE'}
                                                    </span>
                                                    {log.description}
                                                </p>
                                            </div>
                                            <div className="font-black text-primary bg-primary/10 px-2 py-1 rounded-md">
                                                {log.hoursLogged}h
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
