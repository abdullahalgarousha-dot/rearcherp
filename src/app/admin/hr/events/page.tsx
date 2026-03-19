import { auth } from "@/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { EventsAdminClient } from "./client-view"

export const metadata = {
    title: 'إدارة الفعاليات | نظام الموارد البشرية',
}

export default async function EventsAdminPage() {
    const session = await auth()
    const role = (session?.user as any)?.role

    if (!session || (role !== 'ADMIN' && role !== 'HR')) {
        redirect('/admin')
    }

    // Fetch all events
    const events = await (db as any).companyEvent.findMany({
        orderBy: { date: 'desc' }
    })

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">إدارة الفعاليات والإعلانات</h1>
                    <p className="text-slate-500">نشر وإدارة الفعاليات التي تظهر على لوحة الموظفين</p>
                </div>
            </div>

            <EventsAdminClient initialEvents={events} />
        </div>
    )
}
