"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { CalendarDays, MapPin, Loader2, Plus, Trash2, Edit } from "lucide-react"
import { createEvent, toggleEventStatus, deleteEvent } from "@/app/actions/company-events"
import { toast } from "sonner"
import { format } from "date-fns"
import { ar } from "date-fns/locale"
import { useRouter } from "next/navigation"

export function EventsAdminClient({ initialEvents }: { initialEvents: any[] }) {
    const router = useRouter()
    const [events, setEvents] = useState(initialEvents)
    const [isAddOpen, setIsAddOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    // Form State
    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")
    const [date, setDate] = useState("")
    const [location, setLocation] = useState("")

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        const res = await createEvent({
            title,
            description,
            date: new Date(date),
            location: location || undefined
        })

        if (res.success && res.data) {
            toast.success("تمت إضافة الفعالية بنجاح")
            setEvents([res.data, ...events])
            setIsAddOpen(false)
            // Reset form
            setTitle("")
            setDescription("")
            setDate("")
            setLocation("")
            router.refresh()
        } else {
            toast.error(res.error || "حدث خطأ")
        }
        setLoading(false)
    }

    const handleToggle = async (id: string, currentStatus: boolean) => {
        // Optimistic UI update
        setEvents(events.map(ev => ev.id === id ? { ...ev, isActive: !currentStatus } : ev))

        const res = await toggleEventStatus(id, !currentStatus)
        if (!res.success) {
            // Revert on failure
            toast.error(res.error || "تعذر التحديث")
            setEvents(events.map(ev => ev.id === id ? { ...ev, isActive: currentStatus } : ev))
        } else {
            router.refresh()
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("هل أنت متأكد من حذف هذه الفعالية؟")) return

        const res = await deleteEvent(id)
        if (res.success) {
            toast.success("تم الحذف بنجاح")
            setEvents(events.filter(ev => ev.id !== id))
            router.refresh()
        } else {
            toast.error(res.error || "تعذر الحذف")
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild>
                        <Button className="font-bold rounded-xl shadow-lg bg-indigo-600 hover:bg-indigo-700 text-white">
                            <Plus className="ml-2 h-4 w-4" />
                            إضافة فعالية جديدة
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>إنشاء فعالية / إعلان جديد</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleCreate} className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label>عنوان الفعالية</Label>
                                <Input required value={title} onChange={e => setTitle(e.target.value)} placeholder="مثال: اجتماع ربع سنوي" />
                            </div>
                            <div className="space-y-2">
                                <Label>تاريخ الفعالية</Label>
                                <Input required type="date" value={date} onChange={e => setDate(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>الموقع (اختياري)</Label>
                                <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="المقر الرئيسي" />
                            </div>
                            <div className="space-y-2">
                                <Label>وصف الفعالية</Label>
                                <Textarea required value={description} onChange={e => setDescription(e.target.value)} className="min-h-[100px]" placeholder="تفاصيل..." />
                            </div>
                            <DialogFooter className="pt-4">
                                <Button type="submit" disabled={loading} className="w-full">
                                    {loading ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : "حفظ ونشر"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card className="shadow-xl bg-white/50 backdrop-blur-sm border-white/20">
                <Table>
                    <TableHeader className="bg-slate-50/50">
                        <TableRow>
                            <TableHead className="w-[300px]">العنوان</TableHead>
                            <TableHead>التاريخ</TableHead>
                            <TableHead>الموقع</TableHead>
                            <TableHead className="text-center">الحالة (نشط)</TableHead>
                            <TableHead className="text-right">إجراءات</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {events.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-slate-500">لا توجد فعاليات مسجلة.</TableCell>
                            </TableRow>
                        )}
                        {events.map((event) => (
                            <TableRow key={event.id}>
                                <TableCell className="font-bold text-slate-900">
                                    {event.title}
                                    <p className="text-xs text-slate-500 font-normal line-clamp-1 mt-1">{event.description}</p>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                        <CalendarDays className="h-4 w-4 text-slate-400" />
                                        <span dir="ltr">{format(new Date(event.date), 'dd MMM yyyy', { locale: ar })}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                        <MapPin className="h-4 w-4 text-slate-400" />
                                        {event.location || "—"}
                                    </div>
                                </TableCell>
                                <TableCell className="text-center">
                                    <Switch
                                        checked={event.isActive}
                                        onCheckedChange={() => handleToggle(event.id, event.isActive)}
                                        className="mx-auto"
                                    />
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" className="text-rose-500 hover:text-rose-700 hover:bg-rose-50" onClick={() => handleDelete(event.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>
        </div>
    )
}
