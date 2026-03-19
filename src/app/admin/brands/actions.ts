"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function createBrand(tenantId: string, data: any) {
    try {
        await (db.brand as any).create({
            data: {
                tenantId,
                nameEn: data.nameEn,
                nameAr: data.nameAr,
                shortName: data.shortName,
                fullName: data.fullName,
                logoUrl: data.logoUrl,
                primaryColor: data.primaryColor || "#10b981",
                accentColor: data.accentColor || "#059669",
                taxNumber: data.taxNumber,
                crNumber: data.crNumber,
                abbreviation: data.abbreviation?.toUpperCase(),
                iban: data.iban,
                bankName: data.bankName,
                addressAr: data.addressAr,
                addressEn: data.addressEn,
                isDefault: data.isDefault || false,
            }
        })
        revalidatePath('/admin/brands')
        return { success: true }
    } catch (error) {
        console.error("Failed to create brand:", error)
        return { success: false, error: "Failed to create brand" }
    }
}

export async function updateBrand(brandId: string, data: any) {
    try {
        await (db.brand as any).update({
            where: { id: brandId },
            data: {
                nameEn: data.nameEn,
                nameAr: data.nameAr,
                shortName: data.shortName,
                fullName: data.fullName,
                logoUrl: data.logoUrl,
                primaryColor: data.primaryColor,
                accentColor: data.accentColor,
                taxNumber: data.taxNumber,
                crNumber: data.crNumber,
                abbreviation: data.abbreviation?.toUpperCase(),
                iban: data.iban,
                bankName: data.bankName,
                addressAr: data.addressAr,
                addressEn: data.addressEn,
                isDefault: data.isDefault,
            }
        })
        revalidatePath('/admin/brands')
        return { success: true }
    } catch (error) {
        console.error("Failed to update brand:", error)
        return { success: false, error: "Failed to update brand settings" }
    }
}

export async function deleteBrand(brandId: string) {
    try {
        // Prevent deleting the last brand or default brand?
        // Basic implementation for now
        await (db.brand as any).delete({
            where: { id: brandId }
        })
        revalidatePath('/admin/brands')
        return { success: true }
    } catch (error) {
        console.error("Failed to delete brand:", error)
        return { success: false, error: "Failed to delete brand" }
    }
}

export async function setDefaultBrand(brandId: string, tenantId: string) {
    try {
        // First, unset current default
        await (db.brand as any).updateMany({
            where: { tenantId, isDefault: true },
            data: { isDefault: false }
        })
        // Set new default
        await (db.brand as any).update({
            where: { id: brandId },
            data: { isDefault: true }
        })
        revalidatePath('/admin/brands')
        return { success: true }
    } catch (error) {
        console.error("Failed to set default brand:", error)
        return { success: false, error: "Failed to set default brand" }
    }
}
