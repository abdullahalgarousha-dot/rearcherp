"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { CalendarDays, LogIn, LogOut, KeyRound, Search, Filter } from "lucide-react"
import { format } from "date-fns"
import { ar } from "date-fns/locale"

export function LogsAdminClient({ initialLogs }: { initialLogs: any[] }) {
    const [searchTerm, setSearchTerm] = useState("")

    // Filter by name or action type
    const filteredLogs = initialLogs.filter(log =>
        log.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="space-y-6">
            <Card className="border-white/20 shadow-sm bg-white/60 backdrop-blur-xl">
                <CardContent className="p-4 sm:p-6 flex flex-col md:flex-row gap-4 items-center justify-between border-b border-slate-100">
                    <div className="relative flex-1 md:w-96 w-full">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                        <Input
                            placeholder="بحث بالاسم، البريد الإلكتروني، أو نوع الحدث..."
                            className="pl-3 pr-10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </CardContent>

                <Table>
                    <TableHeader className="bg-slate-50/50">
                        <TableRow>
                            <TableHead>المستخدم</TableHead>
                            <TableHead>الحدث (Event)</TableHead>
                            <TableHead>التفاصيل التقنية</TableHead>
                            <TableHead className="text-right">التاريخ والوقت</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredLogs.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-12 text-slate-500">
                                    لا توجد سجلات تطابق بحثك.
                                </TableCell>
                            </TableRow>
                        )}
                        {filteredLogs.map((log) => (
                            <TableRow key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                <TableCell>
                                    <div className="font-bold text-slate-900">{log.user?.name || "System/Unknown"}</div>
                                    <div className="text-xs text-slate-500 mt-0.5">{log.user?.email || "—"}</div>
                                </TableCell>
                                <TableCell>
                                    <ActionBadge action={log.action} />
                                </TableCell>
                                <TableCell>
                                    <code className="text-[10px] bg-slate-100 px-2 py-1 rounded text-slate-600 block max-w-xs truncate" title={log.details}>
                                        {log.details || "N/A"}
                                    </code>
                                </TableCell>
                                <TableCell className="text-right whitespace-nowrap">
                                    <div className="flex items-center justify-end gap-2 text-sm text-slate-600 font-mono">
                                        <CalendarDays className="h-4 w-4 text-slate-400" />
                                        <span dir="ltr">{format(new Date(log.createdAt), 'dd MMM yyyy, HH:mm:ss')}</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>
        </div>
    )
}

function ActionBadge({ action }: { action: string }) {
    switch (action) {
        case 'LOGIN':
            return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 uppercase gap-1"><LogIn className="h-3 w-3" /> دخول منصة</Badge>
        case 'LOGOUT':
            return <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-200 uppercase gap-1"><LogOut className="h-3 w-3" /> خروج نظام</Badge>
        case 'PASSWORD_CHANGE':
            return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200 uppercase gap-1"><KeyRound className="h-3 w-3" /> تغيير كلمة مرور</Badge>
        default:
            return <Badge variant="outline" className="uppercase text-slate-500">{action}</Badge>
    }
}
