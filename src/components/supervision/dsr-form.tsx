"use client"

import { useState, useEffect } from "react"
import { differenceInCalendarDays } from "date-fns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import {
    Sun, Wind, CloudRain, Cloud,
    Users, Truck, Camera, ClipboardList,
    Plus, Trash2, CheckCircle2, HardHat,
    AlertTriangle, Calendar, Hammer, Package,
    MessageCircle, Clock, Wrench
} from "lucide-react"
import { createDailyReport, updateDailyReport } from "@/app/admin/supervision/actions"
import { useRouter } from "next/navigation"

// ── Circular Progress Gauge ──────────────────────────────────────────────────
function CircularGauge({ value }: { value: number }) {
    const size = 130
    const strokeWidth = 9
    const radius = (size - strokeWidth) / 2
    const circumference = 2 * Math.PI * radius
    const filled = (value / 100) * circumference
    const color = value >= 75 ? '#10b981' : value >= 50 ? '#3b82f6' : value >= 25 ? '#f59e0b' : '#ef4444'

    return (
        <div className="relative inline-flex items-center justify-center">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f1f5f9" strokeWidth={strokeWidth} />
                <circle
                    cx={size / 2} cy={size / 2} r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${filled} ${circumference}`}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dasharray 0.5s ease, stroke 0.3s ease' }}
                />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-slate-900 leading-none">{value}%</span>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider mt-0.5">Done</span>
            </div>
        </div>
    )
}

// ── Weather Icon ─────────────────────────────────────────────────────────────
const WEATHER_OPTIONS = [
    { value: "شمس | Sunny",   icon: Sun,       color: "text-amber-500", bg: "bg-amber-50 border-amber-200" },
    { value: "غائم | Cloudy", icon: Cloud,     color: "text-slate-500", bg: "bg-slate-50 border-slate-200" },
    { value: "مطر | Rainy",   icon: CloudRain, color: "text-blue-500",  bg: "bg-blue-50 border-blue-200" },
    { value: "عاصف | Windy",  icon: Wind,      color: "text-cyan-500",  bg: "bg-cyan-50 border-cyan-200" },
]

// ── Section Header ────────────────────────────────────────────────────────────
function SectionHeader({ step, icon: Icon, title, subtitle, color = 'slate' }: {
    step: string; icon: any; title: string; subtitle?: string; color?: string
}) {
    const colors: Record<string, { num: string; icon: string; bg: string }> = {
        slate:   { num: 'bg-slate-900 text-white',    icon: 'text-slate-600 bg-slate-100',     bg: 'border-slate-200' },
        emerald: { num: 'bg-emerald-600 text-white',  icon: 'text-emerald-600 bg-emerald-100', bg: 'border-emerald-200' },
        blue:    { num: 'bg-blue-600 text-white',     icon: 'text-blue-600 bg-blue-100',       bg: 'border-blue-200' },
        amber:   { num: 'bg-amber-500 text-white',    icon: 'text-amber-600 bg-amber-100',     bg: 'border-amber-200' },
        indigo:  { num: 'bg-indigo-600 text-white',   icon: 'text-indigo-600 bg-indigo-100',   bg: 'border-indigo-200' },
        red:     { num: 'bg-red-600 text-white',      icon: 'text-red-600 bg-red-100',         bg: 'border-red-200' },
    }
    const c = colors[color] || colors.slate

    return (
        <div className={`flex items-center gap-4 mb-6 pb-5 border-b ${c.bg}`}>
            <span className={`h-8 w-8 rounded-full text-xs font-black flex items-center justify-center flex-shrink-0 shadow-sm ${c.num}`}>{step}</span>
            <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 ${c.icon}`}>
                <Icon className="h-4.5 w-4.5" />
            </div>
            <div>
                <h3 className="font-black text-slate-900 text-base leading-tight">{title}</h3>
                {subtitle && <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{subtitle}</p>}
            </div>
        </div>
    )
}

// ── Main Component ────────────────────────────────────────────────────────────
export function DSRForm({ project, siteEngineers, contractors, projectContractors = [], initialData }: {
    project: any
    siteEngineers: any[]
    contractors: any[]
    projectContractors?: any[]
    initialData?: any
}) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])
    const [weather, setWeather] = useState("شمس | Sunny")

    const [contractorData, setContractorData] = useState(
        projectContractors.length > 0
            ? projectContractors.map(pc => {
                const start = pc.startDate ? new Date(pc.startDate) : new Date()
                const elapsed = differenceInCalendarDays(new Date(date), start)
                const remaining = pc.durationDays - elapsed
                const delay = remaining < 0 ? Math.abs(remaining) : 0
                return {
                    contractorId: pc.contractorId,
                    contractorName: pc.contractor?.companyName || pc.contractor?.name || "Unknown",
                    startDate: start.toISOString().split('T')[0],
                    durationDays: pc.durationDays || 0,
                    contractValue: pc.contractValue || 0,
                    elapsedDays: elapsed > 0 ? elapsed : 0,
                    delayDays: delay,
                    remainingDays: remaining > 0 ? remaining : 0,
                    engineers: [] as { name: string; role: string }[],
                    labor: [] as { type: string; count: number }[],
                    notes: ""
                }
            })
            : []
    )

    const [equipment, setEquipment] = useState<{ name: string; count: number }[]>([])
    const [completionPercentage, setCompletionPercentage] = useState(0)
    const [delayDays, setDelayDays] = useState(0)

    useEffect(() => {
        if (project.endDate) {
            const diff = differenceInCalendarDays(new Date(date), new Date(project.endDate))
            setDelayDays(diff > 0 ? diff : 0)
        }
    }, [project.endDate, date])

    useEffect(() => {
        setContractorData(prev => prev.map(c => {
            if (!c.startDate) return c
            const elapsed = differenceInCalendarDays(new Date(date), new Date(c.startDate))
            const remaining = c.durationDays - elapsed
            const delay = remaining < 0 ? Math.abs(remaining) : 0
            return { ...c, elapsedDays: elapsed > 0 ? elapsed : 0, remainingDays: remaining > 0 ? remaining : 0, delayDays: delay }
        }))
    }, [date])

    const [attendees, setAttendees] = useState<any[]>(
        siteEngineers.map(eng => ({ userId: eng.id, name: eng.name, present: true }))
    )

    const [photoIds, setPhotoIds] = useState<number[]>([])
    const [photoCount, setPhotoCount] = useState(0)
    const [previews, setPreviews] = useState<{ [key: number]: string }>({})

    // ── Contractor Helpers ────────────────────────────────────────────────────
    const updateContractorNote = (i: number, val: string) => {
        const d = [...contractorData]; d[i].notes = val; setContractorData(d)
    }
    const addLaborRow = (ci: number) => {
        const d = [...contractorData]; d[ci] = { ...d[ci], labor: [...d[ci].labor, { type: "", count: 0 }] }; setContractorData(d)
    }
    const removeLaborRow = (ci: number, li: number) => {
        const d = [...contractorData]; d[ci] = { ...d[ci], labor: d[ci].labor.filter((_, i) => i !== li) }; setContractorData(d)
    }
    const updateLaborRow = (ci: number, li: number, field: 'type' | 'count', val: any) => {
        const d = [...contractorData]; const nl = [...d[ci].labor]; nl[li] = { ...nl[li], [field]: val }; d[ci] = { ...d[ci], labor: nl }; setContractorData(d)
    }
    const addEngineerRow = (ci: number) => {
        const d = [...contractorData]; d[ci] = { ...d[ci], engineers: [...d[ci].engineers, { name: "", role: "Site Engineer" }] }; setContractorData(d)
    }
    const removeEngineerRow = (ci: number, ei: number) => {
        const d = [...contractorData]; d[ci] = { ...d[ci], engineers: d[ci].engineers.filter((_, i) => i !== ei) }; setContractorData(d)
    }
    const updateEngineerRow = (ci: number, ei: number, field: 'name' | 'role', val: string) => {
        const d = [...contractorData]; const ne = [...d[ci].engineers]; ne[ei] = { ...ne[ei], [field]: val }; d[ci] = { ...d[ci], engineers: ne }; setContractorData(d)
    }

    // ── Equipment Helpers ─────────────────────────────────────────────────────
    const addEquipment = () => setEquipment([...equipment, { name: "", count: 0 }])
    const removeEquipment = (i: number) => setEquipment(equipment.filter((_, idx) => idx !== i))
    const updateEquipment = (i: number, field: string, value: any) => {
        const e = [...equipment]; e[i] = { ...e[i], [field]: value }; setEquipment(e)
    }

    // ── Photo Helpers ─────────────────────────────────────────────────────────
    const addPhoto = () => { const id = photoCount + 1; setPhotoCount(id); setPhotoIds([...photoIds, id]) }
    const removePhoto = (id: number) => {
        setPhotoIds(photoIds.filter(p => p !== id))
        setPreviews(prev => { const n = { ...prev }; if (n[id]) { URL.revokeObjectURL(n[id]); delete n[id] }; return n })
    }
    const handleFileChange = (id: number, file: File | null) => {
        if (file) {
            const url = URL.createObjectURL(file)
            setPreviews(prev => { if (prev[id]) URL.revokeObjectURL(prev[id]); return { ...prev, [id]: url } })
        } else {
            setPreviews(prev => { const n = { ...prev }; if (n[id]) { URL.revokeObjectURL(n[id]); delete n[id] }; return n })
        }
    }
    const toggleAttendee = (i: number) => {
        const a = [...attendees]; a[i].present = !a[i].present; setAttendees(a)
    }

    // ── Submit ─────────────────────────────────────────────────────────────────
    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        const formData = new FormData(e.currentTarget)
        const basics = {
            date, weather,
            workPerformedToday: formData.get("workPerformedToday"),
            plannedWorkTomorrow: formData.get("plannedWorkTomorrow"),
            notes: formData.get("notes"),
            materialsDelivered: formData.get("materialsDelivered"),
            safetyStatus: formData.get("safetyStatus"),
            visitorLog: formData.get("visitorLog"),
            consultantComments: formData.get("consultantComments"),
            remarksForOwner: formData.get("remarksForOwner"),
            completionPercentage,
            delayDays
        }
        formData.append("basics", JSON.stringify(basics))
        formData.append("contractorData", JSON.stringify(contractorData))
        formData.append("equipment", JSON.stringify(equipment))
        formData.append("attendees", JSON.stringify(attendees))

        if (initialData) {
            const res = await updateDailyReport(initialData.id, project.id, formData)
            setLoading(false)
            if (res.success) { router.push(`/admin/supervision/dsr/${project.id}/${initialData.id}`); router.refresh() }
            else alert(res.error || "Update Failed")
        } else {
            const res = await createDailyReport(project.id, formData)
            setLoading(false)
            if (res.success) { router.push(`/admin/projects/${project.id}?tab=supervision`); router.refresh() }
            else alert(res.error || "خطأ في الاتصال بالسيرفر | Connection Error")
        }
    }

    const totalLaborAll = contractorData.reduce((s, c) => s + c.labor.reduce((ls, l) => ls + Number(l.count), 0), 0)

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <form onSubmit={handleSubmit} className="space-y-8 pb-32 max-w-5xl mx-auto">

            {/* ═══ 0. DOCUMENT TITLE BAR ════════════════════════════════════════ */}
            <div className="rounded-[2rem] bg-[#1e293b] px-8 py-6 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">
                        CONSULTANT'S DAILY SITE REPORT
                    </h2>
                    <p className="text-slate-400 text-sm font-bold mt-1">
                        {project.name} <span className="text-slate-600 mx-2">·</span> تقرير الإشراف الهندسي اليومي
                    </p>
                </div>
                <div className="grid grid-cols-2 gap-3 w-full md:w-auto">
                    <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-black text-slate-400">Date | التاريخ</Label>
                        <Input
                            type="date" value={date}
                            onChange={(e) => setDate(e.target.value)} required
                            className="rounded-xl border-slate-700 bg-slate-800 text-white h-10 text-sm"
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-black text-slate-400">Weather | الطقس</Label>
                        <select
                            value={weather} onChange={(e) => setWeather(e.target.value)}
                            className="w-full h-10 rounded-xl border border-slate-700 bg-slate-800 text-white px-3 text-sm font-medium"
                        >
                            {WEATHER_OPTIONS.map(w => <option key={w.value}>{w.value}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* ═══ 1. PROGRESS & DELAY ══════════════════════════════════════════ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Progress Gauge */}
                <Card className="border-none shadow-lg bg-white rounded-[2rem] overflow-hidden">
                    <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-blue-500 to-emerald-500" />
                    <CardContent className="p-7">
                        <SectionHeader step="1" icon={Clock} title="Progress Status | حالة الإنجاز" subtitle="Overall project completion" color="indigo" />
                        <div className="flex items-center gap-8">
                            <CircularGauge value={completionPercentage} />
                            <div className="flex-1 space-y-3">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Drag to Update</p>
                                <Slider
                                    value={[completionPercentage]}
                                    max={100} step={0.5}
                                    onValueChange={(v) => setCompletionPercentage(v[0])}
                                    className="py-2"
                                />
                                <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                                    <span>0%</span>
                                    <span>50%</span>
                                    <span>100%</span>
                                </div>
                                {/* Milestone badges */}
                                <div className="flex gap-2 flex-wrap">
                                    {[25, 50, 75, 100].map(v => (
                                        <button key={v} type="button"
                                            onClick={() => setCompletionPercentage(v)}
                                            className={`text-[10px] font-black px-2.5 py-1 rounded-full border transition-all
                                                ${completionPercentage === v ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-200 text-slate-500 hover:border-indigo-300'}`}>
                                            {v}%
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Delay Alert */}
                <Card className={`border-none shadow-lg rounded-[2rem] overflow-hidden ${delayDays > 0 ? 'bg-red-50' : 'bg-emerald-50'}`}>
                    <div className={`h-1.5 ${delayDays > 0 ? 'bg-red-500' : 'bg-emerald-500'}`} />
                    <CardContent className="p-7">
                        <SectionHeader step="2" icon={AlertTriangle} title="Project Delay | التأخير" subtitle="Days past deadline" color={delayDays > 0 ? 'red' : 'emerald'} />
                        <div className="flex items-end justify-between">
                            <div>
                                {delayDays > 0 ? (
                                    <>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-5xl font-black text-red-600">{delayDays}</span>
                                            <span className="text-lg font-black text-red-400 uppercase">Days Late</span>
                                        </div>
                                        <p className="text-xs text-red-500 font-bold mt-1 flex items-center gap-1">
                                            <AlertTriangle className="h-3 w-3" />
                                            Project is behind schedule — action required
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-5xl font-black text-emerald-600">On</span>
                                            <span className="text-lg font-black text-emerald-400 uppercase">Schedule</span>
                                        </div>
                                        <p className="text-xs text-emerald-600 font-bold mt-1 flex items-center gap-1">
                                            <CheckCircle2 className="h-3 w-3" /> Project is on track
                                        </p>
                                    </>
                                )}
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] font-black text-slate-400 uppercase">Override Days</Label>
                                <Input
                                    type="number" value={delayDays}
                                    onChange={(e) => setDelayDays(parseInt(e.target.value) || 0)}
                                    className={`w-24 font-black text-xl text-center h-12 rounded-xl border-transparent
                                        ${delayDays > 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ═══ 2. CONTRACTORS ══════════════════════════════════════════════ */}
            {contractorData.length > 0 ? (
                contractorData.map((contractor, cIdx) => {
                    const totalLabor = contractor.labor.reduce((s, l) => s + Number(l.count), 0)
                    return (
                        <Card key={contractor.contractorId} className="border-none shadow-xl bg-white rounded-[2rem] overflow-hidden">
                            {/* Colored top ribbon */}
                            <div className="h-1.5 bg-gradient-to-r from-slate-800 to-slate-600" />
                            <CardContent className="p-8">
                                {/* Contractor Header */}
                                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-7 pb-6 border-b border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-2xl bg-slate-900 flex items-center justify-center flex-shrink-0">
                                            <HardHat className="h-5 w-5 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">{contractor.contractorName}</h3>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contractor Daily Log</p>
                                        </div>
                                    </div>
                                    {/* Timeline stat pills */}
                                    <div className="flex flex-wrap gap-2">
                                        <span className="text-[10px] font-black px-3 py-1.5 rounded-full bg-slate-100 text-slate-600">
                                            SAR {contractor.contractValue.toLocaleString()}
                                        </span>
                                        <span className="text-[10px] font-black px-3 py-1.5 rounded-full bg-blue-100 text-blue-700">
                                            {contractor.durationDays}d Total
                                        </span>
                                        <span className="text-[10px] font-black px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700">
                                            {contractor.elapsedDays}d Elapsed
                                        </span>
                                        {contractor.delayDays > 0 ? (
                                            <span className="text-[10px] font-black px-3 py-1.5 rounded-full bg-red-100 text-red-700 flex items-center gap-1">
                                                <AlertTriangle className="h-2.5 w-2.5" /> {contractor.delayDays}d Delay
                                            </span>
                                        ) : (
                                            <span className="text-[10px] font-black px-3 py-1.5 rounded-full bg-green-100 text-green-700">
                                                {contractor.remainingDays}d Left
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* A. Site Engineers */}
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                                <HardHat className="h-3.5 w-3.5" /> Site Engineers
                                            </h4>
                                            <Button type="button" size="sm" variant="ghost"
                                                onClick={() => addEngineerRow(cIdx)}
                                                className="h-7 text-[10px] font-black rounded-lg hover:bg-slate-100">
                                                <Plus className="h-3 w-3 mr-1" /> Add
                                            </Button>
                                        </div>
                                        <div className="space-y-2">
                                            {contractor.engineers.map((eng, eIdx) => (
                                                <div key={eIdx} className="flex gap-2 items-center bg-slate-50 rounded-xl px-3 py-2">
                                                    <Input
                                                        placeholder="Engineer name"
                                                        value={eng.name}
                                                        onChange={(e) => updateEngineerRow(cIdx, eIdx, 'name', e.target.value)}
                                                        className="h-8 bg-white border-slate-200 text-xs font-bold flex-1"
                                                    />
                                                    <Input
                                                        placeholder="Role"
                                                        value={eng.role}
                                                        onChange={(e) => updateEngineerRow(cIdx, eIdx, 'role', e.target.value)}
                                                        className="h-8 bg-white border-slate-200 text-xs w-28"
                                                    />
                                                    <Button type="button" size="icon" variant="ghost"
                                                        onClick={() => removeEngineerRow(cIdx, eIdx)}
                                                        className="h-7 w-7 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg flex-shrink-0">
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            ))}
                                            {contractor.engineers.length === 0 && (
                                                <p className="text-[10px] italic text-slate-300 px-3">No engineers listed.</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* B. Labor Force Grid */}
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                                <Users className="h-3.5 w-3.5" /> Labor Force
                                            </h4>
                                            <Button type="button" size="sm" variant="ghost"
                                                onClick={() => addLaborRow(cIdx)}
                                                className="h-7 text-[10px] font-black rounded-lg hover:bg-slate-100">
                                                <Plus className="h-3 w-3 mr-1" /> Add Trade
                                            </Button>
                                        </div>
                                        <div className="space-y-2">
                                            {contractor.labor.map((lab, lIdx) => (
                                                <div key={lIdx} className="flex gap-2 items-center bg-slate-50 rounded-xl px-3 py-2">
                                                    <Input
                                                        placeholder="Trade (e.g. Mason, Carpenter)"
                                                        value={lab.type}
                                                        onChange={(e) => updateLaborRow(cIdx, lIdx, 'type', e.target.value)}
                                                        className="h-8 bg-white border-slate-200 text-xs font-bold flex-1"
                                                    />
                                                    <div className="relative w-20 flex-shrink-0">
                                                        <Input
                                                            type="number" placeholder="0"
                                                            value={lab.count}
                                                            onChange={(e) => updateLaborRow(cIdx, lIdx, 'count', e.target.value)}
                                                            className="h-8 bg-white border-slate-200 text-xs font-black text-center"
                                                        />
                                                    </div>
                                                    <Button type="button" size="icon" variant="ghost"
                                                        onClick={() => removeLaborRow(cIdx, lIdx)}
                                                        className="h-7 w-7 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg flex-shrink-0">
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            ))}
                                            {contractor.labor.length === 0 && (
                                                <p className="text-[10px] italic text-slate-300 px-3">No labor listed.</p>
                                            )}
                                        </div>
                                        {/* Labor Total Badge */}
                                        {contractor.labor.length > 0 && (
                                            <div className="flex items-center justify-between bg-slate-900 text-white px-4 py-2.5 rounded-xl mt-1">
                                                <span className="text-[10px] font-black uppercase tracking-widest">Total Labor Force</span>
                                                <span className="font-black text-lg">{totalLabor} <span className="text-[10px] text-slate-400">workers</span></span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Contractor Notes */}
                                <div className="mt-6">
                                    <Label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Daily Activity Notes</Label>
                                    <Textarea
                                        value={contractor.notes}
                                        onChange={(e) => updateContractorNote(cIdx, e.target.value)}
                                        placeholder={`Specific work and observations for ${contractor.contractorName}...`}
                                        className="bg-slate-50 border-slate-100 min-h-[70px] rounded-xl resize-none"
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    )
                })
            ) : (
                <div className="p-10 text-center border-2 border-dashed border-red-200 bg-red-50 rounded-2xl">
                    <HardHat className="h-10 w-10 text-red-300 mx-auto mb-3" />
                    <p className="text-red-600 font-black">No Contractors Linked to this Project</p>
                    <p className="text-xs text-red-400 mt-1">Add contractors in Project Settings first.</p>
                </div>
            )}

            {/* Total Manpower Summary Banner */}
            {totalLaborAll > 0 && (
                <div className="rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 px-8 py-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Users className="h-5 w-5 text-emerald-400" />
                        <span className="text-white font-black uppercase tracking-widest text-sm">Total Site Manpower Today</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black text-emerald-400">{totalLaborAll}</span>
                        <span className="text-slate-400 font-bold text-sm uppercase">Workers on Site</span>
                    </div>
                </div>
            )}

            {/* ═══ 3. EQUIPMENT & MATERIALS ════════════════════════════════════ */}
            <Card className="border-none shadow-lg bg-white rounded-[2rem] overflow-hidden">
                <div className="h-1.5 bg-gradient-to-r from-amber-500 to-orange-500" />
                <CardContent className="p-8">
                    <SectionHeader step="3" icon={Truck} title="Equipment & Materials | المعدات والمواد" subtitle="On-site resources" color="amber" />

                    <div className="flex justify-end mb-4">
                        <Button type="button" onClick={addEquipment} variant="outline"
                            className="rounded-xl border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs gap-1.5">
                            <Plus className="h-3.5 w-3.5" /> Add Equipment
                        </Button>
                    </div>

                    {/* Equipment Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                        {equipment.map((item, idx) => (
                            <div key={idx} className="group flex items-center gap-3 bg-slate-50 rounded-2xl border border-slate-100 p-3 hover:border-amber-200 transition-all">
                                <div className="h-9 w-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                                    <Wrench className="h-4 w-4 text-amber-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <Input
                                        value={item.name}
                                        onChange={(e) => updateEquipment(idx, 'name', e.target.value)}
                                        placeholder="Equipment name..."
                                        className="h-7 border-none bg-transparent p-0 text-sm font-bold text-slate-900 focus-visible:ring-0 placeholder:text-slate-300"
                                    />
                                </div>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                    <Input
                                        type="number" min="0"
                                        value={item.count}
                                        onChange={(e) => updateEquipment(idx, 'count', e.target.value)}
                                        className="w-14 h-8 border-slate-200 bg-white font-black text-center text-sm rounded-lg"
                                    />
                                    <Button type="button" variant="ghost" size="icon"
                                        onClick={() => removeEquipment(idx)}
                                        className="h-7 w-7 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                        {equipment.length === 0 && (
                            <div className="col-span-full py-8 text-center border-2 border-dashed border-slate-100 rounded-2xl text-slate-300">
                                <Truck className="h-8 w-8 mx-auto mb-2 opacity-40" />
                                <p className="text-xs font-black uppercase tracking-widest">No equipment added</p>
                            </div>
                        )}
                    </div>

                    {/* Materials Delivered */}
                    <div className="bg-amber-50/60 rounded-2xl border border-amber-100 p-4">
                        <Label className="text-[10px] font-black uppercase text-amber-700 tracking-widest flex items-center gap-1.5 mb-2">
                            <Package className="h-3.5 w-3.5" /> Materials Delivered Today | التوريدات
                        </Label>
                        <Input
                            name="materialsDelivered"
                            placeholder="e.g. 50 bags cement, 2 tons rebar, 500 bricks..."
                            className="bg-white border-amber-100 rounded-xl h-10 text-sm font-medium"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* ═══ 4. WORK SUMMARY ══════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-none shadow-lg bg-white rounded-[2rem] overflow-hidden">
                    <div className="h-1.5 bg-emerald-500" />
                    <CardContent className="p-7">
                        <div className="flex items-center gap-2 mb-4 pb-4 border-b border-emerald-100">
                            <div className="h-8 w-8 rounded-xl bg-emerald-100 flex items-center justify-center">
                                <Hammer className="h-4 w-4 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-sm font-black text-slate-900">Work Performed Today</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">الأعمال المنجزة</p>
                            </div>
                        </div>
                        <Textarea
                            name="workPerformedToday"
                            placeholder="وصف تفصيلي للأعمال الميدانية المنفذة اليوم..."
                            className="min-h-[140px] border-none bg-transparent focus-visible:ring-0 text-sm leading-relaxed placeholder:text-slate-300 resize-none"
                            required
                        />
                    </CardContent>
                </Card>

                <Card className="border-none shadow-lg bg-white rounded-[2rem] overflow-hidden">
                    <div className="h-1.5 bg-blue-500" />
                    <CardContent className="p-7">
                        <div className="flex items-center gap-2 mb-4 pb-4 border-b border-blue-100">
                            <div className="h-8 w-8 rounded-xl bg-blue-100 flex items-center justify-center">
                                <ClipboardList className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm font-black text-slate-900">Planned Work Tomorrow</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">الأعمال المخطط لها غداً</p>
                            </div>
                        </div>
                        <Textarea
                            name="plannedWorkTomorrow"
                            placeholder="الأعمال المستهدفة ليوم غد والخطة التفصيلية..."
                            className="min-h-[140px] border-none bg-transparent focus-visible:ring-0 text-sm leading-relaxed placeholder:text-slate-300 resize-none"
                        />
                    </CardContent>
                </Card>
            </div>

            {/* General Notes */}
            <Card className="border-none shadow-md bg-amber-50/40 rounded-[2rem] overflow-hidden">
                <div className="h-1 bg-amber-400" />
                <CardContent className="p-7">
                    <div className="flex items-center gap-2 mb-3">
                        <ClipboardList className="h-4 w-4 text-amber-600" />
                        <p className="text-sm font-black text-slate-700">General Notes & Observations | ملاحظات عامة</p>
                    </div>
                    <Textarea
                        name="notes"
                        placeholder="Any general observations, issues, pending items, or environmental conditions..."
                        className="min-h-[80px] border-none bg-transparent focus-visible:ring-0 text-sm resize-none placeholder:text-slate-400"
                    />
                </CardContent>
            </Card>

            {/* Remarks for Owner */}
            <Card className="border-none shadow-md bg-indigo-50/40 rounded-[2rem] overflow-hidden">
                <div className="h-1 bg-indigo-500" />
                <CardContent className="p-7">
                    <div className="flex items-center gap-2 mb-3">
                        <MessageCircle className="h-4 w-4 text-indigo-600" />
                        <p className="text-sm font-black text-slate-700">Consultant's Remarks for Owner | مرئيات الاستشاري للمالك</p>
                    </div>
                    <Textarea
                        name="remarksForOwner"
                        placeholder="رسالة أو توصية خاصة لمالك المشروع..."
                        className="min-h-[100px] border-none bg-transparent focus-visible:ring-0 text-sm resize-none placeholder:text-slate-300"
                    />
                </CardContent>
            </Card>

            {/* ═══ 5. TEAM & SAFETY ════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-none shadow-lg bg-white rounded-[2rem] p-7">
                    <SectionHeader step="5" icon={HardHat} title="Consultant Team | طاقم الإشراف" subtitle="Attendance register" color="slate" />
                    <div className="space-y-2">
                        {attendees.map((att, idx) => (
                            <div key={att.userId} onClick={() => toggleAttendee(idx)}
                                className={`flex items-center justify-between px-4 py-3 rounded-xl border cursor-pointer transition-all select-none
                                    ${att.present ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-100 opacity-50'}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`h-2 w-2 rounded-full ${att.present ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                    <span className={`text-sm font-bold ${att.present ? 'text-emerald-900' : 'text-slate-500'}`}>{att.name}</span>
                                </div>
                                {att.present
                                    ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                    : <span className="text-[10px] text-slate-400 font-bold uppercase">Absent</span>
                                }
                            </div>
                        ))}
                        {attendees.length === 0 && <p className="text-xs text-slate-400 italic text-center py-4">No consultant staff linked.</p>}
                    </div>
                </Card>

                <Card className="border-none shadow-lg bg-white rounded-[2rem] p-7">
                    <SectionHeader step="6" icon={AlertTriangle} title="Safety & Site Visitors" subtitle="HSSE log" color="amber" />
                    <div className="space-y-4">
                        <div>
                            <Label className="text-[10px] font-black text-slate-400 uppercase mb-1.5 block">Safety Status</Label>
                            <Input name="safetyStatus" className="bg-slate-50 border-slate-100 rounded-xl h-10 text-sm" placeholder="e.g. No Incidents — PPE compliance 100%" />
                        </div>
                        <div>
                            <Label className="text-[10px] font-black text-slate-400 uppercase mb-1.5 block">Site Visitors</Label>
                            <Input name="visitorLog" className="bg-slate-50 border-slate-100 rounded-xl h-10 text-sm" placeholder="e.g. Client PM, Municipality Inspector..." />
                        </div>
                    </div>
                </Card>
            </div>

            {/* ═══ 6. PHOTO EVIDENCE ════════════════════════════════════════════ */}
            <Card className="border-none shadow-2xl bg-white rounded-[2.5rem] overflow-hidden">
                <div className="h-1.5 bg-gradient-to-r from-slate-800 via-slate-600 to-slate-800" />
                <CardContent className="p-8">
                    <div className="flex flex-col md:flex-row justify-between items-center mb-7 gap-4">
                        <SectionHeader step="7" icon={Camera} title="Photo Evidence | التوثيق المصور" subtitle={`${photoIds.length} photo${photoIds.length !== 1 ? 's' : ''} added`} color="slate" />
                        <Button type="button" onClick={addPhoto}
                            className="rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold px-7 h-11 shadow-lg gap-2 flex-shrink-0">
                            <Camera className="h-4 w-4" /> Add Photo
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        {photoIds.map((id, photoIdx) => (
                            <div key={id} className="group relative space-y-3">
                                {/* Photo number badge */}
                                <div className="absolute -top-3 -left-3 z-20 h-7 w-7 rounded-full bg-slate-900 text-white text-[10px] font-black flex items-center justify-center shadow-lg">
                                    {photoIdx + 1}
                                </div>

                                <div className="aspect-[4/3] bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 relative overflow-hidden group-hover:border-slate-400 transition-all">
                                    {previews[id] ? (
                                        <img src={previews[id]} alt={`Site photo ${photoIdx + 1}`}
                                            className="absolute inset-0 w-full h-full object-cover rounded-2xl" />
                                    ) : (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 opacity-40">
                                            <Camera className="h-10 w-10 text-slate-400" />
                                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Click to select image</span>
                                        </div>
                                    )}
                                    <Input
                                        type="file" name={`photo_${id}`} accept="image/*"
                                        className="absolute inset-0 opacity-0 cursor-pointer z-10 h-full"
                                        onChange={(e) => handleFileChange(id, e.target.files?.[0] || null)}
                                    />
                                    {previews[id] && (
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all rounded-2xl pointer-events-none" />
                                    )}
                                    {/* Remove button */}
                                    <Button type="button" variant="ghost" size="icon"
                                        onClick={() => removePhoto(id)}
                                        className="absolute top-2 right-2 z-20 h-8 w-8 bg-white/90 hover:bg-red-500 hover:text-white text-slate-500 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-all">
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                                <Input
                                    name={`caption_${id}`}
                                    placeholder={`Photo ${photoIdx + 1} caption / تعليق الصورة...`}
                                    className="bg-slate-50 border-slate-100 rounded-xl h-10 text-sm font-medium focus:bg-white transition-all"
                                />
                            </div>
                        ))}
                        {photoIds.length === 0 && (
                            <div className="col-span-full py-14 text-center border-2 border-dashed border-slate-100 rounded-2xl">
                                <Camera className="h-12 w-12 text-slate-200 mx-auto mb-3" />
                                <p className="text-base font-black text-slate-200 uppercase tracking-widest">No Photos Added</p>
                                <p className="text-xs text-slate-300 mt-1">Click "Add Photo" to attach site evidence</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* ═══ STICKY SUBMIT BAR ════════════════════════════════════════════ */}
            <div className="fixed bottom-8 left-8 right-8 flex justify-center z-50 pointer-events-none">
                <div className="pointer-events-auto w-full max-w-lg bg-white/90 backdrop-blur-xl rounded-full shadow-[0_20px_60px_rgba(0,0,0,0.2)] border border-white/60 p-2 flex items-center gap-3">
                    <div className="flex-1 px-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {totalLaborAll > 0 ? `${totalLaborAll} workers · ${completionPercentage}% complete` : 'Ready to submit'}
                        </p>
                    </div>
                    <Button
                        type="submit" disabled={loading}
                        className="h-12 px-8 rounded-full bg-slate-900 hover:bg-black text-white font-black text-sm uppercase tracking-widest shadow-xl transition-all active:scale-95">
                        {loading ? "Saving..." : (initialData ? "Update Report" : "Save DSR")}
                    </Button>
                </div>
            </div>
        </form>
    )
}
