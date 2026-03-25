"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

const ALLOWED_ROLES = ["ADMIN", "GLOBAL_SUPER_ADMIN", "SUPER_ADMIN"]

async function getAuthedTenant() {
    const session = await auth()
    const user = session?.user as any
    if (!user) throw new Error("Not authenticated")
    if (!ALLOWED_ROLES.includes(user.role)) throw new Error("Unauthorized: requires ADMIN role")

    const tenantId = user.tenantId as string
    if (!tenantId || tenantId === "system") {
        throw new Error("No tenant context. Please log in as a tenant admin, not as super admin.")
    }
    return { tenantId, user }
}

export async function createBrand(_tenantIdFromClient: string, data: any) {
    // Always resolve tenantId from the server session — never trust the client parameter.
    let tenantId: string
    try {
        ;({ tenantId } = await getAuthedTenant())
    } catch (authErr: any) {
        console.error("[createBrand] Auth error:", authErr.message)
        return { success: false, error: authErr.message }
    }

    try {
        if (!data.nameEn?.trim()) return { success: false, error: "English name is required" }
        if (!data.nameAr?.trim()) return { success: false, error: "Arabic name is required" }
        if (!data.abbreviation?.trim()) return { success: false, error: "Abbreviation / ID Prefix is required" }

        await (db as any).brand.create({
            data: {
                tenantId,
                nameEn: data.nameEn.trim(),
                nameAr: data.nameAr.trim(),
                shortName: data.shortName || data.abbreviation?.toUpperCase(),
                fullName: data.fullName || null,
                logoUrl: data.logoUrl || null,
                primaryColor: data.primaryColor || "#10b981",
                accentColor: data.accentColor || "#059669",
                taxNumber: data.taxNumber || null,
                crNumber: data.crNumber || null,
                abbreviation: data.abbreviation.toUpperCase(),
                iban: data.iban || null,
                bankName: data.bankName || null,
                addressAr: data.addressAr || null,
                addressEn: data.addressEn || null,
                isDefault: data.isDefault || false,
            }
        })
        revalidatePath('/admin/brands')
        return { success: true }
    } catch (error: any) {
        console.error("[createBrand] DB error:", error?.message, error?.code)
        const msg = error?.code === "P2002"
            ? "An entity with this abbreviation already exists."
            : error?.message || "Database error while creating brand"
        return { success: false, error: msg }
    }
}

export async function updateBrand(brandId: string, data: any) {
    let tenantId: string
    try {
        ;({ tenantId } = await getAuthedTenant())
    } catch (authErr: any) {
        console.error("[updateBrand] Auth error:", authErr.message)
        return { success: false, error: authErr.message }
    }

    try {
        const existing = await (db as any).brand.findFirst({ where: { id: brandId, tenantId } })
        if (!existing) return { success: false, error: "Brand not found in your tenant" }

        await (db as any).brand.update({
            where: { id: brandId },
            data: {
                nameEn: data.nameEn,
                nameAr: data.nameAr,
                shortName: data.shortName || data.abbreviation?.toUpperCase(),
                fullName: data.fullName || null,
                logoUrl: data.logoUrl || null,
                primaryColor: data.primaryColor,
                accentColor: data.accentColor,
                taxNumber: data.taxNumber || null,
                crNumber: data.crNumber || null,
                abbreviation: data.abbreviation?.toUpperCase(),
                iban: data.iban || null,
                bankName: data.bankName || null,
                addressAr: data.addressAr || null,
                addressEn: data.addressEn || null,
                isDefault: data.isDefault,
            }
        })
        revalidatePath('/admin/brands')
        return { success: true }
    } catch (error: any) {
        console.error("[updateBrand] DB error:", error?.message, error?.code)
        return { success: false, error: error?.message || "Failed to update brand" }
    }
}

export async function deleteBrand(brandId: string) {
    let tenantId: string
    try {
        ;({ tenantId } = await getAuthedTenant())
    } catch (authErr: any) {
        return { success: false, error: authErr.message }
    }

    try {
        await (db as any).brand.delete({ where: { id: brandId, tenantId } })
        revalidatePath('/admin/brands')
        return { success: true }
    } catch (error: any) {
        console.error("[deleteBrand] DB error:", error?.message)
        return { success: false, error: error?.message || "Failed to delete brand" }
    }
}

export async function setDefaultBrand(brandId: string, _tenantIdFromClient: string) {
    let tenantId: string
    try {
        ;({ tenantId } = await getAuthedTenant())
    } catch (authErr: any) {
        return { success: false, error: authErr.message }
    }

    try {
        await (db as any).brand.updateMany({
            where: { tenantId, isDefault: true },
            data: { isDefault: false }
        })
        await (db as any).brand.update({
            where: { id: brandId },
            data: { isDefault: true }
        })
        revalidatePath('/admin/brands')
        return { success: true }
    } catch (error: any) {
        console.error("[setDefaultBrand] DB error:", error?.message)
        return { success: false, error: error?.message || "Failed to set default brand" }
    }
}
