"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { getEmployeeReport, getAllEmployees } from "@/app/actions/timesheet"
import { Loader2, Users, Calendar, Briefcase, Clock, FileBarChart } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns"

export default function EmployeeReportsPage() {
    const [employees, setEmployees] = useState<any[]>([])
    const [selectedEmployee, setSelectedEmployee] = useState<string>("")
    const [period, setPeriod] = useState<string>("month")
    const [loading, setLoading] = useState(false)
    const [reportData, setReportData] = useState<any>(null)

    useEffect(() => {
        async function loadEmployees() {
            const data = await getAllEmployees()
            setEmployees(data)
        }
        loadEmployees()
    }, [])

    // Better approach: fetch report when employee and period change
    async function handleFetchReport() {
        if (!selectedEmployee) return
        setLoading(true)

        let start = new Date()
        let end = new Date()

        if (period === 'week') {
            start = startOfWeek(new Date(), { weekStartsOn: 1 })
            end = endOfWeek(new Date(), { weekStartsOn: 1 })
        } else if (period === 'month') {
            start = startOfMonth(new Date())
            end = endOfMonth(new Date())
        } else {
            start = startOfYear(new Date())
            end = endOfYear(new Date())
        }

        const data = await getEmployeeReport(selectedEmployee, start, end)
        setReportData(data)
        setLoading(false)
    }

    useEffect(() => {
        if (selectedEmployee) handleFetchReport()
    }, [selectedEmployee, period])

    // Mock employees for now since I can't easily fetch them without a dedicated action
    const mockEmployees = [
        { id: "cm76c5b960000uxm96s5wun9o", name: "System Admin" },
        // Add more if needed
    ]

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">تقارير الموظفين (Employee Reports)</h1>
                    <p className="text-muted-foreground">تحليل الأداء وساعات العمل لكل موظف</p>
                </div>
            </div>

            <Card className="shadow-xl bg-white/50 backdrop-blur-sm border-white/20">
                <CardContent className="pt-6">
                    <div className="flex flex-wrap gap-4 items-end">
                        <div className="space-y-2 flex-1 min-w-[200px]">
                            <label className="text-xs font-black text-slate-500 uppercase flex items-center gap-2">
                                <Users className="h-3 w-3" /> الموظف (Employee)
                            </label>
                            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                                <SelectTrigger className="bg-white border-slate-200">
                                    <SelectValue placeholder="اختر موظفاً..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {employees.map((emp) => (
                                        <SelectItem key={emp.id} value={emp.id}>
                                            {emp.name} ({emp.role})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2 w-[200px]">
                            <label className="text-xs font-black text-slate-500 uppercase flex items-center gap-2">
                                <Calendar className="h-3 w-3" /> الفترة (Period)
                            </label>
                            <Select value={period} onValueChange={setPeriod}>
                                <SelectTrigger className="bg-white border-slate-200">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="week">أسبوع (Weekly)</SelectItem>
                                    <SelectItem value="month">شهر (Monthly)</SelectItem>
                                    <SelectItem value="year">سنة (Yearly)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <Button
                            onClick={handleFetchReport}
                            disabled={loading || !selectedEmployee}
                            className="bg-primary hover:bg-primary/90 text-white font-bold"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Clock className="h-4 w-4 mr-2" />}
                            تحديث التقرير
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {reportData && (
                <div className="grid gap-6">
                    {/* Summary Cards */}
                    <div className="grid gap-4 md:grid-cols-2">
                        <Card className="bg-primary/5 border-primary/10">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-primary uppercase">Total Hours</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-black">{reportData.totalHours} hrs</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-emerald-50 border-emerald-100">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-emerald-700 uppercase">Projects Worked</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-black">{Object.keys(reportData.grouped).length}</div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Visualization - Bar Chart */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
                                <div className="w-1 h-4 bg-primary rounded-full" />
                                توزيع الساعات اليومي (Daily Hours)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[200px] flex items-end gap-2 pt-4">
                                {/* Simplified Bar Chart for demo */}
                                {reportData.logs.slice(-14).map((log: any, i: number) => (
                                    <div key={i} className="flex-1 flex flex-col items-center gap-2 group cursor-help">
                                        <div
                                            className="w-full bg-primary/20 hover:bg-primary/40 rounded-t-sm transition-all duration-300 relative"
                                            style={{ height: `${(log.hoursLogged / 12) * 100}%` }}
                                        >
                                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                                {log.hoursLogged}h ({format(new Date(log.date), 'dd/MM')})
                                            </div>
                                        </div>
                                        <span className="text-[8px] font-bold text-slate-400 rotate-45 mt-1">
                                            {format(new Date(log.date), 'dd/MM')}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Grouped Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
                                <div className="w-1 h-4 bg-primary rounded-full" />
                                سجل المهام حسب المشروع (Project Breakdown)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                {Object.entries(reportData.grouped).map(([projectName, data]: [string, any]) => (
                                    <div key={projectName} className="space-y-2">
                                        <div className="flex justify-between items-center border-b border-slate-100 pb-1">
                                            <h4 className="font-black text-slate-900 flex items-center gap-2">
                                                <Briefcase className="h-4 w-4 text-primary" />
                                                {projectName}
                                            </h4>
                                            <Badge variant="secondary" className="font-bold">{data.hoursLogged} hrs</Badge>
                                        </div>
                                        <div className="space-y-1">
                                            {data.logs.map((log: any) => (
                                                <div key={log.id} className="flex justify-between items-center p-3 rounded-lg bg-slate-50/50 hover:bg-slate-50 transition-colors text-sm">
                                                    <div className="flex-1">
                                                        <p className="font-bold text-slate-800">{log.description}</p>
                                                        <p className="text-[10px] text-slate-400 font-medium">
                                                            {format(new Date(log.date), 'eeee, MMM dd')} • <span className="uppercase">{log.category}</span>
                                                        </p>
                                                    </div>
                                                    <div className="text-right font-black text-primary">
                                                        {log.hoursLogged}h
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {!reportData && !loading && selectedEmployee && (
                <div className="text-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                    <Clock className="h-10 w-10 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-400 font-bold uppercase tracking-widest">No logs found for this period</p>
                </div>
            )}
        </div>
    )
}
