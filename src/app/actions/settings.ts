"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { getDriveSettings, clearDriveCache } from "@/lib/google-drive"
import { google } from "googleapis"
import { checkPermission, hasPermission } from "@/lib/rbac"
import { auth } from "@/auth"

export async function getSystemSettings() {
    try {
        const session = await auth()
        const tenantId = (session?.user as any)?.tenantId as string | undefined

        // Only fall back to "default-tenant" for authenticated sessions —
        // unauthenticated callers (login page) must not trigger tenant creation.
        const currentTenantId = tenantId && tenantId !== "system" ? tenantId : null
        let profile: any = null

        // "system" is the virtual tenantId used by the Super Admin emergency
        // bypass — no real Tenant row exists for it, so skip DB entirely.
        if (currentTenantId) {
            // Ensure the Tenant row exists before touching any FK-constrained table
            await (db as any).tenant.upsert({
                where: { id: currentTenantId },
                update: {},
                create: { id: currentTenantId, name: 'FTS Office', slug: currentTenantId }
            })

            // Tenant-scoped lookup — each tenant has their own CompanyProfile
            profile = await (db as any).companyProfile.findFirst({
                where: { tenantId: currentTenantId }
            })
            if (!profile) {
                profile = await (db as any).companyProfile.create({
                    data: {
                        tenantId: currentTenantId,
                        companyNameAr: "اسم الشركة",
                        companyNameEn: "Company Name",
                        vatPercentage: 15,
                        defaultCurrency: "SAR",
                        workingHoursPerDay: 8,
                        workingDaysPerWeek: 5,
                        weekendDays: "Friday,Saturday"
                    }
                })
            }
        } else {
            // Unauthenticated (e.g. login page) — try legacy SINGLETON, then first available
            profile = await (db as any).companyProfile.findUnique({ where: { id: "SINGLETON" } })
                ?? await (db as any).companyProfile.findFirst()
        }

        return profile ?? {
            id: "fallback",
            companyNameAr: "اسم الشركة",
            companyNameEn: "Company Name",
            logoUrl: null,
            vatNumber: null,
            vatPercentage: 15,
            defaultCurrency: "SAR",
            contactEmail: null,
            contactPhone: null,
            address: null,
            buildingNumber: null,
            streetName: null,
            district: null,
            city: null,
            postalCode: null,
            additionalNumber: null,
            zatcaApiToken: null,
            driveClientId: null,
            driveClientSecret: null,
            driveRefreshToken: null,
            driveFolderId: null,
            workingHoursPerDay: 8,
            workingDaysPerWeek: 5,
            weekendDays: "Friday,Saturday"
        }
    } catch (error) {
        console.error("Error fetching company profile:", error)
        return {
            id: "fallback",
            companyNameAr: "اسم الشركة",
            companyNameEn: "Company Name",
            logoUrl: null,
            vatNumber: null,
            vatPercentage: 15,
            defaultCurrency: "SAR",
            contactEmail: null,
            contactPhone: null,
            address: null,
            buildingNumber: null,
            streetName: null,
            district: null,
            city: null,
            postalCode: null,
            additionalNumber: null,
            zatcaApiToken: null,
            driveClientId: null,
            driveClientSecret: null,
            driveRefreshToken: null,
            driveFolderId: null,
            workingHoursPerDay: 8,
            workingDaysPerWeek: 5,
            weekendDays: "Friday,Saturday"
        }
    }
}

export async function getProjectTypes() {
    try {
        const types = await (db as any).projectType.findMany({
            where: { isActive: true },
            orderBy: { nameEn: 'asc' }
        })
        return types
    } catch (error) {
        console.error("Error fetching project types:", error)
        return []
    }
}

export async function getSystemLookups(category?: string, includeInactive = false) {
    try {
        let whereClause: any = {}
        if (category) whereClause.category = category
        if (!includeInactive) whereClause.isActive = true

        const lookups = await (db as any).systemLookup.findMany({
            where: whereClause,
            orderBy: [{ category: 'asc' }, { labelEn: 'asc' }]
        })

        return lookups
    } catch (error) {
        console.error("Error fetching system lookups:", error)
        return []
    }
}

export async function updateSystemSettings(formData: FormData) {
    const isAllowed = await checkPermission('SETTINGS', 'write')
    if (!isAllowed) return { error: "Unauthorized: You don't have permission to manage settings" }

    try {
        const companyNameAr = formData.get("companyNameAr") as string || undefined
        const companyNameEn = formData.get("companyNameEn") as string || undefined
        const vatNumber = formData.get("taxNumber") as string || null      // UI uses "taxNumber"
        const vatPercentage = parseFloat(formData.get("vatPercentage") as string) || undefined
        const defaultCurrency = formData.get("defaultCurrency") as string || undefined
        const contactEmail = formData.get("contactEmail") as string || null
        const contactPhone = formData.get("contactPhone") as string || null
        const address = formData.get("address") as string || null
        const buildingNumber = formData.get("buildingNumber") as string || null
        const streetName = formData.get("streetName") as string || null
        const district = formData.get("district") as string || null
        const city = formData.get("city") as string || null
        const postalCode = formData.get("postalCode") as string || null
        const additionalNumber = formData.get("additionalNumber") as string || null
        const zatcaApiToken = formData.get("zatcaApiToken") as string || null
        const driveClientId = formData.get("driveClientId") as string || null
        const driveClientSecret = formData.get("driveClientSecret") as string || null
        const driveRefreshToken = formData.get("driveRefreshToken") as string || null
        const driveFolderId = formData.get("driveFolderId") as string || null
        const logoUrl = formData.get("logoUrl") as string || null
        const workingHoursPerDay = parseFloat(formData.get("workingHoursPerDay") as string) || 8
        const workingDaysPerWeek = parseInt(formData.get("workingDaysPerWeek") as string) || 5
        const weekendDays = formData.get("weekendDays") as string || "Friday,Saturday"

        const session = await auth()
        if (!session?.user) return { error: "Unauthorized" }
        const tenantId = (session.user as any)?.tenantId as string | undefined
        const currentTenantId = tenantId && tenantId !== "system" ? tenantId : null

        const updateData = {
            ...(companyNameAr && { companyNameAr }),
            ...(companyNameEn && { companyNameEn }),
            vatNumber, vatPercentage,
            ...(defaultCurrency && { defaultCurrency }),
            contactEmail, contactPhone, address,
            buildingNumber, streetName, district, city, postalCode, additionalNumber, zatcaApiToken,
            driveClientId, driveClientSecret, driveRefreshToken, driveFolderId,
            logoUrl,
            workingHoursPerDay, workingDaysPerWeek, weekendDays
        }

        if (currentTenantId) {
            // Ensure the Tenant row exists before touching any FK-constrained table
            await (db as any).tenant.upsert({
                where: { id: currentTenantId },
                update: {},
                create: { id: currentTenantId, name: 'FTS Office', slug: currentTenantId }
            })

            // Per-tenant: find and update, or create new
            const existing = await (db as any).companyProfile.findFirst({ where: { tenantId: currentTenantId } })
            if (existing) {
                await (db as any).companyProfile.update({ where: { id: existing.id }, data: updateData })
            } else {
                await (db as any).companyProfile.create({
                    data: {
                        tenantId: currentTenantId,
                        companyNameAr: companyNameAr || "Company Name",
                        companyNameEn: companyNameEn || "Company Name",
                        vatNumber, vatPercentage: vatPercentage || 15,
                        defaultCurrency: defaultCurrency || "SAR",
                        contactEmail, contactPhone, address,
                        buildingNumber, streetName, district, city, postalCode, additionalNumber, zatcaApiToken,
                        driveClientId, driveClientSecret, driveRefreshToken, driveFolderId,
                        logoUrl,
                        workingHoursPerDay, workingDaysPerWeek, weekendDays
                    }
                })
            }
        } else {
            // Fallback to legacy SINGLETON (super-admin)
            await (db as any).companyProfile.upsert({
                where: { id: "SINGLETON" },
                create: {
                    id: "SINGLETON",
                    companyNameAr: companyNameAr || "Company Name",
                    companyNameEn: companyNameEn || "Company Name",
                    vatNumber, vatPercentage: vatPercentage || 15,
                    defaultCurrency: defaultCurrency || "SAR",
                    contactEmail, contactPhone, address,
                    buildingNumber, streetName, district, city, postalCode, additionalNumber, zatcaApiToken,
                    driveClientId, driveClientSecret, driveRefreshToken, driveFolderId,
                    logoUrl,
                    workingHoursPerDay, workingDaysPerWeek, weekendDays
                },
                update: updateData
            })
        }

        revalidatePath('/', 'layout')
        return { success: true }
    } catch (e: any) {
        console.error("Failed to update company profile:", e)
        return { error: e.message }
    }
}

export async function upsertSystemLookup(formData: FormData) {
    const isAllowed = await checkPermission('SETTINGS', 'write')
    if (!isAllowed) return { error: "Unauthorized" }

    try {
        const id = formData.get("id") as string
        const category = formData.get("category") as string
        const value = formData.get("value") as string
        const labelAr = formData.get("labelAr") as string
        const labelEn = formData.get("labelEn") as string
        const isActive = formData.get("isActive") === "true"

        if (id) {
            await (db as any).systemLookup.update({
                where: { id },
                data: { labelAr, labelEn, isActive } // Category and Value usually shouldn't change
            })
        } else {
            await (db as any).systemLookup.create({
                data: { category, value, labelAr, labelEn, isActive }
            })
        }

        revalidatePath('/admin/settings/general')
        return { success: true }
    } catch (e: any) {
        console.error("Failed to upsert lookup:", e)
        return { error: e.message }
    }
}

export async function deleteSystemLookup(id: string) {
    const isAllowed = await checkPermission('SETTINGS', 'write')
    if (!isAllowed) return { error: "Unauthorized" }

    try {
        await (db as any).systemLookup.delete({ where: { id } })
        revalidatePath('/admin/settings/general')
        return { success: true }
    } catch (e: any) {
        console.error("Failed to delete lookup:", e)
        return { error: e.message }
    }
}

export async function toggleSystemLookup(id: string, currentlyActive: boolean) {
    const isAllowed = await checkPermission('SETTINGS', 'write')
    if (!isAllowed) return { error: "Unauthorized" }

    try {
        await (db as any).systemLookup.update({
            where: { id },
            data: { isActive: !currentlyActive }
        })
        revalidatePath('/admin/settings/general')
        return { success: true }
    } catch (e: any) {
        console.error("Failed to toggle lookup:", e)
        return { error: e.message }
    }
}

export async function saveDriveCredentials(data: {
    driveClientId: string
    driveClientSecret: string
    driveRefreshToken: string
    driveRootFolderId: string
}) {
    // GLOBAL_SUPER_ADMIN is covered by hasPermission returning true unconditionally.
    const canManage = await hasPermission('system', 'manageSettings')
    if (!canManage) return { error: "Unauthorized: Requires Settings management permission" }

    const session = await auth()
    const tenantId = (session?.user as any)?.tenantId as string | undefined

    // Drive credentials live on the Tenant row (read by getDriveSettings).
    // The "system" virtual tenant used by the emergency GSA has no real row.
    if (!tenantId || tenantId === 'system') {
        return { error: "No tenant context — log in as a tenant admin to configure Drive credentials" }
    }

    const { driveClientId, driveClientSecret, driveRefreshToken, driveRootFolderId } = data

    if (!driveClientId || !driveClientSecret || !driveRefreshToken || !driveRootFolderId) {
        return { error: "All four Drive credential fields are required" }
    }

    try {
        await (db as any).tenant.update({
            where: { id: tenantId },
            data: { driveClientId, driveClientSecret, driveRefreshToken, driveRootFolderId },
        })

        // Evict the cached OAuth2 Drive instance so the next Drive call picks up
        // the new credentials immediately without requiring a server restart.
        clearDriveCache(tenantId)

        revalidatePath('/admin/settings/general')
        return { success: true }
    } catch (e: any) {
        console.error("saveDriveCredentials error:", e)
        return { error: e.message || "Failed to save Drive credentials" }
    }
}

export async function testDriveConnection() {
    const isAllowed = await checkPermission('SETTINGS', 'write')
    if (!isAllowed) return { error: "Unauthorized" }

    try {
        const session = await auth()
        const tenantId = (session?.user as any).tenantId
        const { driveClientId, driveClientSecret, driveRefreshToken, driveFolderId } = await getDriveSettings(tenantId)
        const oauth2Client = new google.auth.OAuth2(
            driveClientId,
            driveClientSecret
        );
        oauth2Client.setCredentials({ refresh_token: driveRefreshToken });
        const drive = google.drive({ version: 'v3', auth: oauth2Client });

        // Retrieve metadata for the root folder
        const res = await drive.files.get({
            fileId: driveFolderId,
            fields: 'id, name, mimeType'
        })

        if (res.data.id && res.data.mimeType === 'application/vnd.google-apps.folder') {
            return {
                success: true,
                message: `Connected successfully! Root Folder: "${res.data.name}"`
            }
        }

        return { success: false, message: 'Connected to Drive, but the specified ID is not a accessible folder.' }
    } catch (e: any) {
        console.error("Failed to test Google Drive connection:", e)
        return { success: false, message: e.message || 'Connection failed check credentials.' }
    }
}
