"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { auth } from "@/auth"

/** Returns only branches belonging to the caller's tenant — isolation enforced */
export async function getBranches() {
    const session = await auth()
    const tenantId = (session?.user as any)?.tenantId
    if (!tenantId) throw new Error("Unauthorized: no tenant context")

    return await (db as any).branch.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'asc' }
    })
}

export async function createBranch(formData: FormData) {
    const session = await auth()
    const userRole = (session?.user as any)?.role
    const tenantId = (session?.user as any)?.tenantId
    if (!tenantId) throw new Error("Unauthorized: no tenant context")
    if (userRole !== 'GLOBAL_SUPER_ADMIN' && userRole !== 'SUPER_ADMIN' && userRole !== 'ADMIN') {
        throw new Error("Unauthorized: insufficient role")
    }

    await (db as any).branch.create({
        data: {
            tenantId,
            nameAr: formData.get("nameAr") as string,
            nameEn: formData.get("nameEn") as string,
            location: formData.get("location") as string,
            currencyCode: (formData.get("currencyCode") as string) || "SAR",
            exchangeRateToBase: parseFloat((formData.get("exchangeRateToBase") as string) || "1.0"),
            isMainBranch: formData.get("isMainBranch") === "true",
        }
    })

    revalidatePath("/admin/settings/general")
}

export async function updateBranch(id: string, formData: FormData) {
    const session = await auth()
    const userRole = (session?.user as any)?.role
    const tenantId = (session?.user as any)?.tenantId
    if (!tenantId) throw new Error("Unauthorized: no tenant context")
    if (userRole !== 'GLOBAL_SUPER_ADMIN' && userRole !== 'SUPER_ADMIN' && userRole !== 'ADMIN') {
        throw new Error("Unauthorized: insufficient role")
    }

    // Verify ownership before mutating
    const branch = await (db as any).branch.findUnique({ where: { id }, select: { tenantId: true } })
    if (!branch || branch.tenantId !== tenantId) throw new Error("Forbidden: branch not found in your tenant")

    await (db as any).branch.update({
        where: { id },
        data: {
            nameAr: formData.get("nameAr") as string,
            nameEn: formData.get("nameEn") as string,
            location: formData.get("location") as string,
            currencyCode: (formData.get("currencyCode") as string) || "SAR",
            exchangeRateToBase: parseFloat((formData.get("exchangeRateToBase") as string) || "1.0"),
            isMainBranch: formData.get("isMainBranch") === "true",
        }
    })

    revalidatePath("/admin/settings/general")
}

export async function deleteBranch(id: string) {
    const session = await auth()
    const userRole = (session?.user as any)?.role
    const tenantId = (session?.user as any)?.tenantId
    if (!tenantId) throw new Error("Unauthorized: no tenant context")
    if (userRole !== 'GLOBAL_SUPER_ADMIN' && userRole !== 'SUPER_ADMIN' && userRole !== 'ADMIN') {
        throw new Error("Unauthorized: insufficient role")
    }

    // Verify ownership before deleting
    const branch = await (db as any).branch.findUnique({ where: { id }, select: { tenantId: true } })
    if (!branch || branch.tenantId !== tenantId) throw new Error("Forbidden: branch not found in your tenant")

    await (db as any).branch.delete({ where: { id } })

    revalidatePath("/admin/settings/general")
}
