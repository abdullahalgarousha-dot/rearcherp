import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
    try {
        // 1. Check DB Connectivity
        const startTime = Date.now()
        await (db as any).$queryRaw`SELECT 1`
        const dbLatency = Date.now() - startTime

        // 2. Aggregate Stats
        const [tenantCount, userCount, projectCount] = await Promise.all([
            (db as any).tenant.count(),
            (db as any).user.count(),
            (db as any).project.count(),
        ])

        return NextResponse.json({
            status: "UP",
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            database: {
                status: "CONNECTED",
                latency: `${dbLatency}ms`,
            },
            counts: {
                tenants: tenantCount,
                users: userCount,
                projects: projectCount
            }
        })
    } catch (error: any) {
        return NextResponse.json({
            status: "DOWN",
            error: error.message,
            timestamp: new Date().toISOString()
        }, { status: 503 })
    }
}
