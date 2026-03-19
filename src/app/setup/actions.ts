"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

export async function completeSetup(data: {
    zatcaVatNumber: string
    zatcaTaxId: string
    // In a real scenario, we'd also handle Google Drive OAuth flow here
    // For now, we simulate saving these fields
}) {
    const session = await auth()
    if (!session?.user) return { error: "Unauthorized" }

    const tenantId = (session.user as any).tenantId
    if (!tenantId) return { error: "No tenant context found" }

    try {
        await (db as any).tenant.update({
            where: { id: tenantId },
            data: {
                zatcaVatNumber: data.zatcaVatNumber,
                zatcaTaxId: data.zatcaTaxId,
                setupCompleted: true
            }
        })

        revalidatePath('/', 'layout')
        return { success: true }
    } catch (e: any) {
        console.error("Setup Completion Error:", e)
        return { error: e.message || "Failed to finalize setup" }
    }
}
