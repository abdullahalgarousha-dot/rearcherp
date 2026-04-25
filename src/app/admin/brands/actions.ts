"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import fs from "fs/promises"
import path from "path"

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

export async function createBrand(_tenantIdFromClient: string, formData: FormData) {
    // Always resolve tenantId from the server session
    let tenantIdStr: string
    try {
        const { tenantId } = await getAuthedTenant()
        tenantIdStr = tenantId
    } catch (authErr: any) {
        console.error("[createBrand] Auth error:", authErr.message)
        return { success: false, error: authErr.message }
    }

    try {
        const data: any = {}
        formData.forEach((value, key) => {
            // Explicitly ignore any logo related fields to avoid giant base64 strings in 'data'
            if (key !== 'logo' && key !== 'logoFile' && key !== 'logoUrl') {
                data[key] = value
            }
        })

        if (!data.nameEn?.trim()) return { success: false, error: "English name is required" }
        if (!data.nameAr?.trim()) return { success: false, error: "Arabic name is required" }
        if (!data.abbreviation?.trim()) return { success: false, error: "Abbreviation / ID Prefix is required" }

        // Handle Image Upload (Binary logoFile takes priority)
        let logoUrl = null
        const file = formData.get("logoFile") as File
        if (file && file.size > 0) {
            const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
            const filename = `brand-logo-${Date.now()}.${ext}`
            const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'brands')
            await fs.mkdir(uploadDir, { recursive: true })
            const buffer = Buffer.from(await file.arrayBuffer())
            await fs.writeFile(path.join(uploadDir, filename), buffer)
            logoUrl = `/uploads/brands/${filename}`
        }

        await (db as any).brand.create({
            data: {
                tenantId: tenantIdStr,
                nameEn: data.nameEn.trim(),
                nameAr: data.nameAr.trim(),
                shortName: data.shortName || data.abbreviation?.toUpperCase(),
                fullName: data.fullName || null,
                logoUrl,
                primaryColor: data.primaryColor || "#10b981",
                accentColor: data.accentColor || "#059669",
                taxNumber: data.taxNumber || null,
                crNumber: data.crNumber || null,
                nationalAddress: data.nationalAddress || null,
                abbreviation: data.abbreviation.toUpperCase(),
                iban: data.iban || null,
                bankName: data.bankName || null,
                addressAr: data.addressAr || null,
                addressEn: data.addressEn || null,
                isDefault: data.isDefault === "true",
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

export async function updateBrand(brandId: string, formData: FormData) {
    const session = await auth()
    const user = session?.user as any
    if (!user) return { success: false, error: "Not authenticated" }
    if (!ALLOWED_ROLES.includes(user.role)) return { success: false, error: "Unauthorized" }

    const isGSA = user.role === 'GLOBAL_SUPER_ADMIN'

    try {
        const data: any = {}
        formData.forEach((value, key) => {
            // Explicitly ignore any logo related fields to avoid giant base64 strings in 'data'
            if (key !== 'logo' && key !== 'logoFile' && key !== 'logoUrl') {
                data[key] = value
            }
        })

        // Look up the brand to get its real tenantId
        const existing = await (db as any).brand.findUnique({ where: { id: brandId } })
        if (!existing) return { success: false, error: "Brand not found" }

        // Tenant admins can only edit their own brands
        if (!isGSA && existing.tenantId !== user.tenantId) {
            return { success: false, error: "Brand not found in your tenant" }
        }

        // Handle Image Upload (Binary logoFile takes priority)
        let logoUrl = existing.logoUrl
        const file = formData.get("logoFile") as File
        if (file && file.size > 0) {
            const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
            const filename = `brand-logo-${Date.now()}.${ext}`
            const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'brands')
            await fs.mkdir(uploadDir, { recursive: true })
            const buffer = Buffer.from(await file.arrayBuffer())
            await fs.writeFile(path.join(uploadDir, filename), buffer)
            logoUrl = `/uploads/brands/${filename}`
        }

        // tenantId is intentionally excluded from the update payload
        await (db as any).brand.update({
            where: { id: brandId },
            data: {
                nameEn: data.nameEn,
                nameAr: data.nameAr,
                shortName: data.shortName || data.abbreviation?.toUpperCase(),
                fullName: data.fullName || null,
                logoUrl,
                primaryColor: data.primaryColor,
                accentColor: data.accentColor,
                taxNumber: data.taxNumber || null,
                crNumber: data.crNumber || null,
                nationalAddress: data.nationalAddress || null,
                abbreviation: data.abbreviation?.toUpperCase(),
                iban: data.iban || null,
                bankName: data.bankName || null,
                addressAr: data.addressAr || null,
                addressEn: data.addressEn || null,
                isDefault: data.isDefault === "true",
            }
        })
        revalidatePath('/admin/brands')
        revalidatePath('/admin/projects')
        return { success: true }
    } catch (error: any) {
        console.error("[updateBrand] DB error:", error?.message, error?.code)
        return { success: false, error: error?.message || "Failed to update brand" }
    }
}

export async function deleteBrand(brandId: string) {
    const session = await auth()
    const user = session?.user as any
    if (!user) return { success: false, error: "Not authenticated" }
    if (!ALLOWED_ROLES.includes(user.role)) return { success: false, error: "Unauthorized" }

    const isGSA = user.role === 'GLOBAL_SUPER_ADMIN'

    try {
        if (isGSA) {
            // GSA: delete by id only — no tenantId constraint (used for cross-tenant cleanup)
            await (db as any).brand.delete({ where: { id: brandId } })
        } else {
            // Tenant admin: scope delete to their own tenant for safety
            const tenantId = user.tenantId as string
            if (!tenantId || tenantId === 'system') return { success: false, error: "No tenant context" }
            await (db as any).brand.delete({ where: { id: brandId, tenantId } })
        }
        revalidatePath('/admin/brands')
        revalidatePath('/admin/projects')
        return { success: true }
    } catch (error: any) {
        console.error("[deleteBrand] DB error:", error?.message)
        return { success: false, error: error?.message || "Failed to delete brand" }
    }
}

export async function setDefaultBrand(brandId: string, brandTenantId: string) {
    const session = await auth()
    const user = session?.user as any
    if (!user) return { success: false, error: "Not authenticated" }
    if (!ALLOWED_ROLES.includes(user.role)) return { success: false, error: "Unauthorized" }

    // Use the brand's own tenantId (passed from page) — never the GSA's 'system'
    const targetTenantId = brandTenantId && brandTenantId !== 'system' ? brandTenantId : null
    if (!targetTenantId) return { success: false, error: "Invalid tenant context for this brand" }

    try {
        // Clear existing default within this brand's tenant scope
        await (db as any).brand.updateMany({
            where: { tenantId: targetTenantId, isDefault: true },
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
