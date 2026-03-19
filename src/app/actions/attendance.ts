"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"

// -------------------------------------------------------------------------------- //
// 1. Get Today's Attendance Record
// -------------------------------------------------------------------------------- //
export async function getTodayAttendance() {
    const session = await auth()
    const userId = (session?.user as any)?.id

    if (!userId) return { error: "Unauthorized" }

    try {
        // Find record for TODAY
        const startOfDay = new Date()
        startOfDay.setHours(0, 0, 0, 0)

        const endOfDay = new Date()
        endOfDay.setHours(23, 59, 59, 999)

        const record = await (db as any).attendance.findFirst({
            where: {
                userId,
                date: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            }
        })

        return { success: true, data: record }
    } catch (e) {
        console.error("Error fetching attendance:", e)
        return { error: "Failed to fetch attendance record" }
    }
}

// -------------------------------------------------------------------------------- //
// 2. Punch In (Check-In)
// -------------------------------------------------------------------------------- //
export async function punchIn() {
    const session = await auth()
    const userId = (session?.user as any)?.id

    if (!userId) return { error: "Unauthorized" }

    try {
        const startOfDay = new Date()
        startOfDay.setHours(0, 0, 0, 0)

        const endOfDay = new Date()
        endOfDay.setHours(23, 59, 59, 999)

        const existing = await (db as any).attendance.findFirst({
            where: {
                userId,
                date: { gte: startOfDay, lte: endOfDay }
            }
        })

        if (existing) {
            return { error: "Already punched in for today." }
        }

        const now = new Date()

        // Define standard start time (e.g., 08:00 AM) to check if late
        const standardStartTime = new Date()
        standardStartTime.setHours(8, 0, 0, 0)

        // Allow 15 mins grace period
        const graceEnd = new Date(standardStartTime.getTime() + 15 * 60000)

        const status = now > graceEnd ? "LATE" : "PRESENT"

        const record = await db.attendance.create({
            data: {
                userId,
                checkIn: now,
                date: now,
                status
            }
        })

        return { success: true, data: record }
    } catch (e) {
        console.error("Punch In Error:", e)
        return { error: "Failed to punch in" }
    }
}

// -------------------------------------------------------------------------------- //
// 3. Punch Out (Check-Out)
// -------------------------------------------------------------------------------- //
export async function punchOut() {
    const session = await auth()
    const userId = (session?.user as any)?.id

    if (!userId) return { error: "Unauthorized" }

    try {
        const startOfDay = new Date()
        startOfDay.setHours(0, 0, 0, 0)

        const endOfDay = new Date()
        endOfDay.setHours(23, 59, 59, 999)

        const existing = await (db as any).attendance.findFirst({
            where: {
                userId,
                date: { gte: startOfDay, lte: endOfDay }
            }
        })

        if (!existing) {
            return { error: "You must punch in first." }
        }

        if (existing.checkOut) {
            return { error: "Already punched out for today." }
        }

        const record = await (db as any).attendance.update({
            where: { id: existing.id },
            data: { checkOut: new Date() }
        })

        return { success: true, data: record }
    } catch (e) {
        console.error("Punch Out Error:", e)
        return { error: "Failed to punch out" }
    }
}
