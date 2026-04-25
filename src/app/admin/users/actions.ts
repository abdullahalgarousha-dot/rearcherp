'use server'

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { checkAuth } from "@/lib/auth-guard"

export async function updateUserRole(userId: string, roleId: string) {
    const currentUser = await checkAuth(['ADMIN'])
    const tenantId = (currentUser as any).tenantId

    try {
        // 1. Verify the target user belongs to the caller's tenant (TARGET 2)
        const targetUser = await (db as any).user.findFirst({
            where: { id: userId, tenantId },
        })
        if (!targetUser) return { error: "User not found in your organisation" }

        // 2. Scope role lookup to caller's tenant — prevents cross-tenant role assignment (Sprint 1)
        const role = await (db as any).role.findFirst({ where: { id: roleId, tenantId } })
        if (!role) return { error: "Invalid role selected" }

        // 3. Apply the role update — where clause doubles as an ownership assertion
        await (db as any).user.update({
            where: { id: userId, tenantId },   // belt-and-suspenders tenant guard
            data: {
                role:   role.name,
                roleId: role.id,
            },
        })

        revalidatePath('/admin/users')
        return { success: true }
    } catch (e: any) {
        console.error("updateUserRole error:", e)
        return { error: "Failed to update user role" }
    }
}

export async function deleteUser(userId: string) {
    const currentUser = await checkAuth(['ADMIN'])
    const tenantId = (currentUser as any).tenantId

    // Self-deletion guard
    if (userId === (currentUser as any).id) {
        return { error: "Cannot delete your own account" }
    }

    try {
        // TARGET 2: Verify the user to delete belongs to the caller's tenant before
        // touching the DB. Without this check an admin could delete users from other
        // tenants by guessing their ID.
        const userToDelete = await (db as any).user.findFirst({
            where: { id: userId, tenantId },
        })
        if (!userToDelete) return { error: "User not found in your organisation" }

        await (db as any).user.delete({
            where: { id: userId },
        })

        revalidatePath('/admin/users')
        return { success: true }
    } catch (e: any) {
        console.error("deleteUser error:", e)
        if (e.code === 'P2003') {
            return { error: "Cannot delete user: they have associated records (e.g. Reports, Tasks)." }
        }
        return { error: "Failed to delete user" }
    }
}
