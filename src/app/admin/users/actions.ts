'use server'

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

import { checkAuth } from "@/lib/auth-guard"

export async function updateUserRole(userId: string, roleId: string) {
    await checkAuth(['ADMIN'])

    try {
        const role = await (db as any).role.findUnique({ where: { id: roleId } })
        if (!role) return { error: "Invalid role selected" }

        await (db as any).user.update({
            where: { id: userId },
            data: {
                role: role.name,
                roleId: role.id
            }
        })

        revalidatePath('/admin/users')
        return { success: true }
    } catch (e: any) {
        console.error(e)
        return { error: "Failed to update user role" }
    }
}

export async function deleteUser(userId: string) {
    const currentUser = await checkAuth(['ADMIN'])

    if (userId === currentUser?.id) {
        return { error: "Cannot delete your own account" }
    }

    try {
        await (db as any).user.delete({
            where: { id: userId }
        })
        revalidatePath('/admin/users')
        return { success: true }
    } catch (e: any) {
        console.error(e)
        if (e.code === 'P2003') return { error: "Cannot delete user: They have associated records (e.g. Reports, Tasks)." }
        return { error: "Failed to delete user" }
    }
}
