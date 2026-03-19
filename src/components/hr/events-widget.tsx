"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { CalendarDays, Megaphone, MapPin, Loader2 } from "lucide-react"
import { getActiveEvents } from "@/app/actions/company-events"
import { format } from "date-fns"
import { ar } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"

export function EventsWidget() {
    const [events, setEvents] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchEvents = async () => {
            const res = await getActiveEvents();
            if (res.success && res.data) {
                setEvents(res.data)
            }
            setLoading(false)
        }
        fetchEvents()
    }, [])

    return (
        <Card className="h-full border-white/20 shadow-sm bg-white/60 backdrop-blur-xl">
            <CardHeader className="pb-4 border-b border-slate-100">
                <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-800">
                    <Megaphone className="h-5 w-5 text-indigo-500" />
                    لوحة الإعلانات والفعاليات
                </CardTitle>
                <CardDescription>
                    أحدث الأخبار والأنشطة الداخلية الخاصة بالشركة
                </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                {loading ? (
                    <div className="flex justify-center items-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                    </div>
                ) : events.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                        لا توجد فعاليات أو إعلانات حالية.
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                        {events.map((event) => (
                            <div key={event.id} className="p-4 hover:bg-slate-50/80 transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-slate-900">{event.title}</h3>
                                    {new Date(event.date) < new Date() ? (
                                        <Badge variant="secondary" className="text-[10px] uppercase">منتهية</Badge>
                                    ) : (
                                        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 text-[10px] border-emerald-200 uppercase">قادمة</Badge>
                                    )}
                                </div>
                                <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                                    {event.description}
                                </p>
                                <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-500">
                                    <div className="flex items-center gap-1">
                                        <CalendarDays className="h-3.5 w-3.5" />
                                        {format(new Date(event.date), 'dd MMMM yyyy', { locale: ar })}
                                    </div>
                                    {event.location && (
                                        <div className="flex items-center gap-1">
                                            <MapPin className="h-3.5 w-3.5" />
                                            {event.location}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
