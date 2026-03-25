"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

/**
 * Purge all operational data for the current tenant.
 * Deletes: Tasks, TimeLogs, DesignStageFiles, DesignStages,
 *          Projects, Clients, Brands, Invoices, Expenses,
 *          EmployeeTasks, Teams (members cascade), Milestones,
 *          DailyReports, InspectionRequests, NCRs, Drawings.
 *
 * Does NOT delete: the Tenant row, Users, Roles, or CompanyProfile.
 */
export async function purgeAllTenantData(): Promise<{ success: boolean; error?: string }> {
    const session = await auth()
    const user = session?.user as any
    const tenantId = user?.tenantId as string | undefined

    if (!tenantId || tenantId === "system") {
        return { success: false, error: "Cannot purge: no tenant context." }
    }

    const allowedRoles = ["ADMIN", "GLOBAL_SUPER_ADMIN", "SUPER_ADMIN"]
    if (!allowedRoles.includes(user?.role)) {
        return { success: false, error: "Unauthorized." }
    }

    try {
        const w = { tenantId }

        // Delete leaf models first to avoid FK violations
        await (db as any).employeeTask.deleteMany({ where: w })
        // TeamMember rows cascade-delete when their Team is deleted
        await (db as any).team.deleteMany({ where: w })
        await (db as any).timeLog.deleteMany({ where: w })
        await (db as any).task.deleteMany({ where: w })
        await (db as any).milestone.deleteMany({ where: w })
        await (db as any).dailyReport.deleteMany({ where: w })
        await (db as any).fileComment.deleteMany({ where: w })
        await (db as any).designStageFile.deleteMany({ where: w })
        await (db as any).drawing.deleteMany({ where: w })
        await (db as any).inspectionRequest.deleteMany({ where: w })
        await (db as any).ncr.deleteMany({ where: w })
        await (db as any).materialSubmittal.deleteMany({ where: w })
        await (db as any).variationOrder.deleteMany({ where: w })
        await (db as any).subContract.deleteMany({ where: w })
        await (db as any).designStage.deleteMany({ where: w })
        await (db as any).project.deleteMany({ where: w })
        await (db as any).client.deleteMany({ where: w })
        await (db as any).brand.deleteMany({ where: w })
        await (db as any).invoice.deleteMany({ where: w })
        await (db as any).expense.deleteMany({ where: w })
        await (db as any).vendor.deleteMany({ where: w })
        await (db as any).contractor.deleteMany({ where: w })

        revalidatePath("/", "layout")
        return { success: true }
    } catch (e: any) {
        console.error("[PURGE] Failed:", e)
        return { success: false, error: e.message }
    }
}
