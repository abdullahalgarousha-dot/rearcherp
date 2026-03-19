"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Clock, CheckCircle2, AlertTriangle, Fingerprint } from "lucide-react"
import { getTodayAttendance, punchIn, punchOut } from "@/app/actions/attendance"
import { toast } from "sonner"
import { format } from "date-fns"
import { ar } from "date-fns/locale"

export function AttendanceWidget() {
    const [currentTime, setCurrentTime] = useState(new Date())
    const [attendanceRecord, setAttendanceRecord] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState(false)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        const timer = setInterval(() => setCurrentTime(new Date()), 1000)
        return () => clearInterval(timer)
    }, [])

    useEffect(() => {
        fetchRecord()
    }, [])

    const fetchRecord = async () => {
        setLoading(true)
        const res = await getTodayAttendance()
        if (res?.success) {
            setAttendanceRecord(res.data)
        }
        setLoading(false)
    }

    const handlePunchIn = async () => {
        setActionLoading(true)
        const res = await punchIn()
        if (res?.success) {
            toast.success("تم تسجيل الحضور بنجاح")
            setAttendanceRecord(res.data)
        } else {
            toast.error(res?.error || "حدث خطأ أثناء تسجيل الحضور")
        }
        setActionLoading(false)
    }

    const handlePunchOut = async () => {
        setActionLoading(true)
        const res = await punchOut()
        if (res?.success) {
            toast.success("تم تسجيل الانصراف بنجاح")
            setAttendanceRecord(res.data)
        } else {
            toast.error(res?.error || "حدث خطأ أثناء تسجيل الانصراف")
        }
        setActionLoading(false)
    }

    const isPunchedIn = attendanceRecord && attendanceRecord.checkIn
    const isPunchedOut = attendanceRecord && attendanceRecord.checkOut

    return (
        <Card className="border-white/20 shadow-sm bg-white/60 backdrop-blur-xl relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none" />

            <CardHeader className="pb-4">
                <CardTitle className="text-xl font-bold flex items-center justify-between text-slate-800">
                    <span className="flex items-center gap-2">
                        <Fingerprint className="h-5 w-5 text-primary" />
                        سجل الحضور اليومي
                    </span>
                    <BadgeStatus record={attendanceRecord} />
                </CardTitle>
                <CardDescription className="text-slate-500">
                    {format(currentTime, 'EEEE, d MMMM yyyy', { locale: ar })}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center justify-center py-6 space-y-8">
                    {/* Digital Clock */}
                    <div className="text-center">
                        {!mounted ? (
                            <div className="h-20 w-48 animate-pulse bg-slate-100 rounded-2xl mx-auto"></div>
                        ) : (
                            <div className="text-5xl md:text-6xl font-black tabular-nums tracking-tight text-slate-900 drop-shadow-sm font-mono flex items-baseline justify-center gap-2">
                                {format(currentTime, 'HH:mm')}
                                <span className="text-2xl text-slate-400 font-bold">{format(currentTime, 'ss')}</span>
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="w-full flex flex-col sm:flex-row gap-4 justify-center">
                        {loading ? (
                            <div className="h-12 w-full animate-pulse bg-slate-100 rounded-xl"></div>
                        ) : !isPunchedIn ? (
                            <Button
                                onClick={handlePunchIn}
                                disabled={actionLoading}
                                className="w-full sm:w-1/2 h-14 text-lg rounded-xl shadow-lg shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-700 text-white transition-all hover:-translate-y-1"
                            >
                                <Fingerprint className="ml-2 h-5 w-5" />
                                تسجيل حضور
                            </Button>
                        ) : !isPunchedOut ? (
                            <div className="w-full flex gap-2">
                                <div className="flex-1 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center flex-col text-emerald-800 shrink-0">
                                    <span className="text-xs font-bold opacity-70">وقت الحضور</span>
                                    <span className="font-black font-mono">{format(new Date(attendanceRecord.checkIn), 'HH:mm')}</span>
                                </div>
                                <Button
                                    onClick={handlePunchOut}
                                    disabled={actionLoading}
                                    className="flex-[2] h-14 text-lg rounded-xl shadow-lg shadow-rose-500/20 bg-rose-600 hover:bg-rose-700 text-white transition-all hover:-translate-y-1"
                                >
                                    <Clock className="ml-2 h-5 w-5" />
                                    تسجيل انصراف
                                </Button>
                            </div>
                        ) : (
                            <div className="w-full flex gap-3">
                                <div className="flex-1 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center flex-col text-emerald-800 p-2">
                                    <span className="text-xs font-bold opacity-70">الدخول</span>
                                    <span className="font-black font-mono">{format(new Date(attendanceRecord.checkIn), 'HH:mm')}</span>
                                </div>
                                <div className="flex-1 bg-rose-50 border border-rose-100 rounded-xl flex items-center justify-center flex-col text-rose-800 p-2">
                                    <span className="text-xs font-bold opacity-70">الخروج</span>
                                    <span className="font-black font-mono">{format(new Date(attendanceRecord.checkOut), 'HH:mm')}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {isPunchedOut && (
                        <p className="text-xs text-center text-slate-500 font-medium">
                            تم تسجيل الحضور والانصراف لهذا اليوم بنجاح. شكراً لك!
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

function BadgeStatus({ record }: { record: any }) {
    if (!record) return <div className="px-2 py-1 text-[10px] font-bold uppercase rounded-full bg-slate-100 text-slate-500">لم يسجل</div>
    if (record.status === 'LATE') return <div className="px-2 w-fit py-1 flex items-center gap-1 text-[10px] font-bold uppercase rounded-full bg-orange-100 text-orange-700"><AlertTriangle className="h-3 w-3" /> متأخر</div>
    if (record.status === 'PRESENT') return <div className="px-2 w-fit py-1 flex items-center gap-1 text-[10px] font-bold uppercase rounded-full bg-emerald-100 text-emerald-700"><CheckCircle2 className="h-3 w-3" /> حاضر</div>
    return <div className="px-2 py-1 text-[10px] font-bold uppercase rounded-full bg-slate-100 text-slate-500">{record.status}</div>
}
