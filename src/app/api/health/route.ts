import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
    try {
        const startTime = Date.now()
        // Use a simple query to verify connection
        await (db as any).$queryRaw`SELECT 1`
        const dbLatency = Date.now() - startTime

        return NextResponse.json({
            status: "UP",
            timestamp: new Date().toISOString(),
            database: {
                status: "CONNECTED",
                latency: `${dbLatency}ms`,
            }
        })
    } catch (error: any) {
        return NextResponse.json({
            status: "DOWN",
            timestamp: new Date().toISOString()
        }, { status: 503 })
    }
}

