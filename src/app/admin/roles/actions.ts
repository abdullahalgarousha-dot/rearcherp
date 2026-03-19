'use server'

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { checkPermission } from "@/lib/rbac"
import { revalidatePath } from "next/cache"

export async function createRole(formData: FormData) {
    const session = await auth()
    const isAdmin = await checkPermission('ROLES', 'write')

    // Fallback: If no role matrix exists yet, only master admins can create roles
    if (!isAdmin && session?.user?.email !== "admin@fts.com") {
        return { error: "Unauthorized: Only Administrators can create roles." }
    }

    const name = formData.get("name") as string
    const description = formData.get("description") as string
    const permissionMatrixStr = formData.get("permissionMatrix") as string

    if (!name || !permissionMatrixStr) {
        return { error: "Name and permissions are required" }
    }

    try {
        // Validate JSON
        JSON.parse(permissionMatrixStr)

        await db.role.create({
            data: {
                name,
                description,
                permissionMatrix: permissionMatrixStr // Stored as string in SQLite
            }
        })

        revalidatePath('/admin/roles')
        return { success: true }
    } catch (e: any) {
        console.error(e)
        if (e.code === 'P2002') return { error: "Role name already exists" }
        return { error: "Failed to create role" }
    }
}

export async function updateRole(id: string, formData: FormData) {
    const session = await auth()
    const isAdmin = await checkPermission('ROLES', 'write')

    if (!isAdmin && session?.user?.email !== "admin@fts.com") {
        return { error: "Unauthorized: Only Administrators can edit roles." }
    }

    const name = formData.get("name") as string
    const description = formData.get("description") as string
    const permissionMatrixStr = formData.get("permissionMatrix") as string

    try {
        if (permissionMatrixStr) JSON.parse(permissionMatrixStr)

        await db.role.update({
            where: { id },
            data: {
                name,
                description,
                permissionMatrix: permissionMatrixStr
            }
        })

        revalidatePath('/admin/roles')
        return { success: true }
    } catch (e: any) {
        console.error(e)
        return { error: "Failed to update role" }
    }
}

export async function deleteRole(id: string) {
    const session = await auth()
    const isAdmin = await checkPermission('ROLES', 'write')

    if (!isAdmin && session?.user?.email !== "admin@fts.com") {
        return { error: "Unauthorized: Only Administrators can delete roles." }
    }

    try {
        // Prevent deleting roles that have users assigned
        const role = await db.role.findUnique({
            where: { id },
            include: { _count: { select: { users: true } } }
        })

        if (!role) return { error: "Role not found." }
        if (role.name === "SUPER_ADMIN" || role.name === "ADMIN") return { error: "Cannot delete core system roles." }
        if (role._count.users > 0) return { error: "Cannot delete role because it is assigned to active employees." }

        await db.role.delete({
            where: { id }
        })
        revalidatePath('/admin/roles')
        return { success: true }
    } catch (e: any) {
        console.error(e)
        if (e.code === 'P2003') return { error: "Cannot delete role: It is assigned to users." }
        return { error: "Failed to delete role" }
    }
}
