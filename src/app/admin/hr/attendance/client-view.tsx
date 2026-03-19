"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { CalendarDays, AlertTriangle, CheckCircle2, Search, Download } from "lucide-react"
import { format } from "date-fns"
import { ar } from "date-fns/locale"
import { useRouter, useSearchParams } from "next/navigation"

export function AttendanceAdminClient({ initialRecords, selectedDate }: { initialRecords: any[], selectedDate: string }) {
    const router = useRouter()
    const searchParams = useSearchParams()

    const [dateParams, setDateParams] = useState(selectedDate)
    const [searchTerm, setSearchTerm] = useState("")

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newDate = e.target.value
        setDateParams(newDate)

        const params = new URLSearchParams(searchParams.toString())
        params.set("date", newDate)
        router.push(`?${params.toString()}`)
    }

    // Filter by name or code
    const filteredRecords = initialRecords.filter(record =>
        record.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.user?.profile?.employeeCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.user?.profile?.department?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="space-y-6">
            <Card className="border-white/20 shadow-sm bg-white/60 backdrop-blur-xl">
                <CardContent className="p-4 sm:p-6 flex flex-col md:flex-row gap-4 items-center justify-between border-b border-slate-100">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="relative flex-1 md:w-80">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                            <Input
                                placeholder="بحث بالاسم، القسم، الرقم الوظيفي..."
                                className="pl-3 pr-10"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                            <CalendarDays className="h-4 w-4 text-slate-500" />
                            <input
                                type="date"
                                value={dateParams}
                                onChange={handleDateChange}
                                className="bg-transparent border-none outline-none text-sm font-medium text-slate-700 w-32 cursor-pointer"
                            />
                        </div>
                        <Button variant="outline" className="shrink-0 gap-2">
                            <Download className="h-4 w-4" />
                            تصدير
                        </Button>
                    </div>
                </CardContent>

                <Table>
                    <TableHeader className="bg-slate-50/50">
                        <TableRow>
                            <TableHead>الموظف</TableHead>
                            <TableHead>وقت الحضور</TableHead>
                            <TableHead>وقت الانصراف</TableHead>
                            <TableHead>القسم / المسمى</TableHead>
                            <TableHead className="text-center">الحالة</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredRecords.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-12 text-slate-500">
                                    لا توجد سجلات حضور مسجلة لهذا اليوم.
                                </TableCell>
                            </TableRow>
                        )}
                        {filteredRecords.map((record) => (
                            <TableRow key={record.id} className="hover:bg-slate-50/50">
                                <TableCell>
                                    <div className="font-bold text-slate-900">{record.user?.name || "غير معروف"}</div>
                                    <div className="text-xs text-slate-500 font-mono mt-0.5">{record.user?.profile?.employeeCode || "N/A"}</div>
                                </TableCell>
                                <TableCell>
                                    {record.checkIn ? (
                                        <div className="font-mono font-bold text-slate-700 bg-slate-100 w-fit px-2 py-1 rounded">
                                            {format(new Date(record.checkIn), 'HH:mm')}
                                        </div>
                                    ) : (
                                        <span className="text-slate-400">—</span>
                                    )}
                                </TableCell>
                                <TableCell>
                                    {record.checkOut ? (
                                        <div className="font-mono font-bold text-slate-700 bg-slate-100 w-fit px-2 py-1 rounded hover:bg-slate-200">
                                            {format(new Date(record.checkOut), 'HH:mm')}
                                        </div>
                                    ) : (
                                        <Badge variant="outline" className="text-[10px] text-slate-400 border-dashed">لم ينصرف</Badge>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <div className="text-sm font-medium text-slate-700">{record.user?.profile?.department || "—"}</div>
                                    <div className="text-xs text-slate-500 truncate max-w-[150px]">{record.user?.profile?.position || "—"}</div>
                                </TableCell>
                                <TableCell className="text-center">
                                    <StatusBadge status={record.status} />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>
        </div>
    )
}

function StatusBadge({ status }: { status: string }) {
    switch (status) {
        case 'PRESENT':
            return <div className="px-3 w-fit mx-auto py-1 flex items-center justify-center gap-1.5 text-xs font-bold uppercase rounded-full bg-emerald-100 text-emerald-800"><CheckCircle2 className="h-3.5 w-3.5" /> حاضر</div>
        case 'LATE':
            return <div className="px-3 w-fit mx-auto py-1 flex items-center justify-center gap-1.5 text-xs font-bold uppercase rounded-full bg-orange-100 text-orange-800"><AlertTriangle className="h-3.5 w-3.5" /> متأخر</div>
        case 'ABSENT':
            return <div className="px-3 w-fit mx-auto py-1 text-xs font-bold uppercase rounded-full bg-rose-100 text-rose-800">غائب</div>
        default:
            return <div className="px-3 w-fit mx-auto py-1 text-xs font-bold uppercase rounded-full bg-slate-100 text-slate-600">{status}</div>
    }
}
