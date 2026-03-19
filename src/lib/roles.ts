"use server"

import { db } from "@/lib/db"

export async function getAvailableRoles() {
    return await (db as any).role.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' }
    })
}
