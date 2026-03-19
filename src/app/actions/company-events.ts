"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"

// -------------------------------------------------------------------------------- //
// 1. Get List of Active Events (For the Employee Dashboard)
// -------------------------------------------------------------------------------- //
export async function getActiveEvents() {
    try {
        const events = await (db as any).companyEvent.findMany({
            where: { isActive: true },
            orderBy: { date: 'desc' },
            take: 10 // Last 10 events
        })

        return { success: true, data: events }
    } catch (e) {
        console.error("Fetch Events Error:", e)
        return { error: "Failed to fetch events" }
    }
}

// -------------------------------------------------------------------------------- //
// 2. Admin CRUD: Get All Events
// -------------------------------------------------------------------------------- //
export async function getAllEventsAdmin() {
    const session = await auth()
    const role = (session?.user as any)?.role

    if (role !== "ADMIN" && role !== "HR") {
        return { error: "Unauthorized" }
    }

    try {
        const events = await (db as any).companyEvent.findMany({
            orderBy: { date: 'desc' }
        })
        return { success: true, data: events }
    } catch (e) {
        console.error(e)
        return { error: "Failed to fetch all events" }
    }
}

// -------------------------------------------------------------------------------- //
// 3. Admin CRUD: Create Event
// -------------------------------------------------------------------------------- //
export async function createEvent(data: { title: string, description: string, date: Date, location?: string, imageUrls?: string }) {
    const session = await auth()
    const role = (session?.user as any)?.role

    if (role !== "ADMIN" && role !== "HR") {
        return { error: "Unauthorized" }
    }

    try {
        const event = await (db as any).companyEvent.create({
            data: {
                title: data.title,
                description: data.description,
                date: data.date,
                location: data.location,
                imageUrls: data.imageUrls,
                isActive: true
            }
        })
        return { success: true, data: event }
    } catch (e) {
        console.error(e)
        return { error: "Failed to create event" }
    }
}

// -------------------------------------------------------------------------------- //
// 4. Admin CRUD: Toggle Event Status (Active/Inactive)
// -------------------------------------------------------------------------------- //
export async function toggleEventStatus(id: string, isActive: boolean) {
    const session = await auth()
    const role = (session?.user as any)?.role

    if (role !== "ADMIN" && role !== "HR") {
        return { error: "Unauthorized" }
    }

    try {
        await db.companyEvent.update({
            where: { id },
            data: { isActive }
        })
        return { success: true }
    } catch (e) {
        console.error(e)
        return { error: "Failed to update event status" }
    }
}

// -------------------------------------------------------------------------------- //
// 5. Admin CRUD: Delete Event
// -------------------------------------------------------------------------------- //
export async function deleteEvent(id: string) {
    const session = await auth()
    const role = (session?.user as any)?.role

    if (role !== "ADMIN" && role !== "HR") {
        return { error: "Unauthorized" }
    }

    try {
        await (db as any).companyEvent.delete({
            where: { id }
        })
        return { success: true }
    } catch (e) {
        console.error(e)
        return { error: "Failed to delete event" }
    }
}
