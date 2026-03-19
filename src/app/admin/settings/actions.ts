'use server'

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function getRoleMappings() {
    const setting = await (db as any).systemSetting.findUnique({
        where: { key: 'ROLE_MAPPING' }
    })
    if (!setting) return []
    try {
        return JSON.parse(setting.value)
    } catch {
        return []
    }
}

export async function saveRoleMappings(mappings: any[]) {
    await (db as any).systemSetting.upsert({
        where: { key: 'ROLE_MAPPING' },
        create: {
            key: 'ROLE_MAPPING',
            value: JSON.stringify(mappings),
            description: "Maps Job Titles to System Roles"
        },
        update: {
            value: JSON.stringify(mappings)
        }
    })
    revalidatePath('/admin/settings')
    return { success: true }
}

export async function syncUserRoles() {
    try {
        // 1. Get Mappings
        const setting = await (db as any).systemSetting.findUnique({
            where: { key: 'ROLE_MAPPING' }
        })
        if (!setting) return { error: "No mappings defined" }

        const mappings = JSON.parse(setting.value) as { jobTitle: string, role: string }[]
        const map = new Map(mappings.map(m => [m.jobTitle.trim().toLowerCase(), m.role]))

        // 2. Fetch Users
        const users = await (db as any).user.findMany({
            include: { profile: true }
        })

        let updated = 0

        for (const user of users) {
            if (!user.profile?.position) continue

            const jobTitle = user.profile.position.trim().toLowerCase()
            const targetRole = map.get(jobTitle)

            if (targetRole && user.role !== targetRole) {
                await (db as any).user.update({
                    where: { id: user.id },
                    data: { role: targetRole }
                })
                updated++
            }
        }

        revalidatePath('/admin/settings')
        revalidatePath('/admin/hr/staff')
        return { success: true, updated }

    } catch (e: any) {
        console.error("Sync Roles Error:", e)
        return { error: e.message }
    }
}
