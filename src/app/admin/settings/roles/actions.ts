"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function savePermissionsMatrix(permissions: any[]) {
    const session = await auth()
    if (!session || (session.user as any).role !== 'ADMIN' && (session.user as any).role !== 'SUPER_ADMIN') {
        throw new Error("Unauthorized")
    }

    try {
        await db.$transaction(
            permissions.map(p =>
                (db as any).rolePermission.upsert({
                    where: {
                        roleName_module: {
                            roleName: p.roleName,
                            module: p.module
                        }
                    },
                    update: {
                        canRead: p.canRead,
                        canWrite: p.canWrite,
                        canApprove: p.canApprove
                    },
                    create: {
                        roleName: p.roleName,
                        module: p.module,
                        canRead: p.canRead,
                        canWrite: p.canWrite,
                        canApprove: p.canApprove
                    }
                })
            )
        )

        revalidatePath('/admin/settings/roles')
        return { success: true }
    } catch (error) {
        console.error("Save Matrix Error:", error)
        return { error: "Failed to save permissions" }
    }
}

export async function updatePermissions(roleId: string, permissions: any) {
    const session = await auth()
    if (!session || (session.user as any).role !== 'ADMIN') {
        throw new Error("Unauthorized")
    }

    try {
        await (db as any).role.update({
            where: { id: roleId },
            data: {
                permissionMatrix: JSON.stringify(permissions)
            }
        })

        revalidatePath(`/admin/settings/roles/${roleId}`)
        return { success: true }
    } catch (error) {
        console.error("Update Permissions Error:", error)
        return { error: "Failed to update permissions" }
    }
}

export async function deleteRole(roleId: string) {
    const session = await auth()
    if (!session || (session.user as any).role !== 'ADMIN') {
        throw new Error("Unauthorized")
    }

    try {
        await (db as any).role.delete({
            where: { id: roleId }
        })

        revalidatePath('/admin/settings/roles')
        return { success: true }
    } catch (error) {
        console.error("Delete Role Error:", error)
        return { error: "Failed to delete role" }
    }
}

