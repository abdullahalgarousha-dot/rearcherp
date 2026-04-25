"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

export async function completeSetup(data: {
    zatcaVatNumber: string
    zatcaTaxId: string
}) {
    const session = await auth()
    if (!session?.user) return { error: "Unauthorized" }

    const user = session.user as any
    const tenantId = user.tenantId
    if (!tenantId) return { error: "No tenant context found" }

    // TARGET 1A: Role guard — only the tenant ADMIN or SUPER_ADMIN may complete setup.
    // Any lower-privileged user who somehow reaches this action is blocked here.
    const role = user.role as string
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
        return { error: "Unauthorized: Only the tenant Admin can complete setup" }
    }

    try {
        // TARGET 1B: Idempotency guard — once setup is marked complete it cannot be
        // overwritten by a second (possibly malicious) call.  This prevents an attacker
        // who acquires a valid ADMIN session from silently replacing the ZATCA Tax ID
        // after the original owner has already finalised the account.
        const tenant = await (db as any).tenant.findUnique({
            where: { id: tenantId },
            select: { setupCompleted: true },
        })
        if (!tenant) return { error: "Tenant not found" }
        if (tenant.setupCompleted === true) {
            return { error: "Setup has already been completed and cannot be overwritten" }
        }

        await (db as any).tenant.update({
            where: { id: tenantId },
            data: {
                zatcaVatNumber:  data.zatcaVatNumber,
                zatcaTaxId:      data.zatcaTaxId,
                setupCompleted:  true,
            },
        })

        revalidatePath('/', 'layout')
        return { success: true }
    } catch (e: any) {
        console.error("completeSetup error:", e)
        return { error: e.message || "Failed to finalise setup" }
    }
}
