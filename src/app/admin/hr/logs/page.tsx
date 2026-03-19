import { auth } from "@/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { LogsAdminClient } from "./client-view"

export const metadata = {
    title: 'سجل النظام | نظام الموارد البشرية',
}

export default async function SystemLogsPage() {
    const session = await auth()
    const role = (session?.user as any)?.role

    if (!session || role !== 'ADMIN') {
        // High security route: Only full ADMINs should see system logs.
        redirect('/admin')
    }

    // Fetch the latest 100 System Logs to prevent performance degradation
    const logs = await (db as any).systemLog.findMany({
        take: 100,
        orderBy: { createdAt: 'desc' },
        include: {
            user: {
                select: {
                    name: true,
                    email: true,
                    profile: {
                        select: { employeeCode: true, department: true }
                    }
                }
            }
        }
    })

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">سجل نشاط النظام (System Logs)</h1>
                    <p className="text-slate-500">مراقبة وتسجيل عمليات الدخول والخروج والتعديلات الحساسة</p>
                </div>
            </div>

            <LogsAdminClient initialLogs={logs} />
        </div>
    )
}
