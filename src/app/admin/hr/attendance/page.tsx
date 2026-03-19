import { auth } from "@/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { AttendanceAdminClient } from "./client-view"

export const metadata = {
    title: 'سجل الحضور | نظام الموارد البشرية',
}

export default async function AttendanceAdminPage(props: {
    searchParams: Promise<{ date?: string }>
}) {
    const searchParams = await props.searchParams
    const session = await auth()
    const role = (session?.user as any)?.role

    if (!session || (role !== 'ADMIN' && role !== 'HR')) {
        redirect('/admin')
    }

    // Default to today
    const targetDate = searchParams.date ? new Date(searchParams.date) : new Date()
    targetDate.setHours(0, 0, 0, 0)

    const endOfDay = new Date(targetDate)
    endOfDay.setHours(23, 59, 59, 999)

    // Fetch Attendance Records
    const records = await (db as any).attendance.findMany({
        where: {
            date: {
                gte: targetDate,
                lte: endOfDay
            }
        },
        include: {
            user: {
                select: {
                    name: true,
                    profile: {
                        select: {
                            employeeCode: true,
                            position: true,
                            department: true
                        }
                    }
                }
            }
        },
        orderBy: { checkIn: 'asc' }
    })

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">سجل الحضور والانصراف المباشر</h1>
                    <p className="text-slate-500">مراقبة توقيتات دخول وخروج الموظفين بشكل يومي</p>
                </div>
            </div>

            <AttendanceAdminClient initialRecords={records} selectedDate={targetDate.toISOString().split('T')[0]} />
        </div>
    )
}
