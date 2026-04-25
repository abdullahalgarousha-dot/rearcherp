'use server'

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { checkPermission, hasPermission } from "@/lib/rbac"
import { createProjectFolders } from "@/lib/google-drive"

export async function createProject(formData: FormData) {
    const session = await auth()

    // Auth Check
    const canCreate = await hasPermission('projects', 'createEdit')
    if (!canCreate) {
        return { error: "Unauthorized: Requires Project creation permission" }
    }

    const tenantId = (session?.user as any).tenantId
    if (!tenantId) return { error: "Unauthorized: No tenant ID found" }

    const name = formData.get("name") as string
    const brandId = formData.get("brandId") as string
    const branchId = formData.get("branchId") as string
    const projectTypeId = formData.get("projectTypeId") as string

    // Client handling
    const clientName = formData.get("client") as string
    const clientAddress = formData.get("clientAddress") as string
    const clientVat = formData.get("clientVat") as string
    const clientBio = formData.get("clientBio") as string
    const type = formData.get("type") as string || "DESIGN"
    const contractValue = parseFloat(formData.get("contractValue") as string)
    const vatAmount = parseFloat(formData.get("vatAmount") as string) || 0
    const leadEngineerId = formData.get("leadEngineerId") as string
    // const contractDuration = parseInt(formData.get("contractDuration") as string) || 0 // Deprecated, mapped from supervisionDuration

    // Financial Fields
    const designValue = parseFloat(formData.get("designValue") as string) || null
    const supervisionPaymentType = formData.get("supervisionPaymentType") as string || null
    const supervisionMonthlyValue = parseFloat(formData.get("supervisionMonthlyValue") as string) || null
    const supervisionDuration = parseInt(formData.get("supervisionDuration") as string) || null
    const supervisionPackageValue = parseFloat(formData.get("supervisionPackageValue") as string) || null

    // Parse engineerIds safely
    let engineerIds: string[] = []
    try {
        engineerIds = JSON.parse(formData.get("engineerIds") as string)
    } catch (e) {
        engineerIds = []
    }

    let disciplines: string[] = []
    try {
        disciplines = JSON.parse(formData.get("disciplines") as string)
    } catch (e) {
        disciplines = []
    }

    if (!name || !brandId || !clientName || !projectTypeId || isNaN(contractValue)) {
        return { error: "Missing required fields (Project Name, Brand, Client, and Category are mandatory)" }
    }

    try {
        // Auto-Coding Logic
        const year = 2026
        const brand = await db.brand.findUnique({ where: { id: brandId, tenantId } })
        if (!brand) return { error: "Brand not found" }

        // Use ShortName if available, else first 3 chars of EN name
        const brandCode = brand.shortName || brand.nameEn.substring(0, 3).toUpperCase()

        // Get last sequence for this brand/year – strictly scoped to tenant
        const lastProject = await db.project.findFirst({
            where: { brandId, year, tenantId },
            orderBy: { sequence: 'desc' },
        });

        const sequence = (lastProject?.sequence || 0) + 1
        const code = `${brandCode}-${year}-${sequence.toString().padStart(3, '0')}`

        // Auto-Create or Find Client in CRM
        const { findOrCreateClient } = await import("@/app/admin/crm/actions")
        const crmClient = await findOrCreateClient(clientName, {
            address: clientAddress,
            taxNumber: clientVat
        })

        // ── Google Drive Folder Creation ────────────────────────────────────
        let driveFolderId = `mock_${code}`
        let driveLink = ""
        let driveSubFolderIds: string | null = null

        try {
            const { getDriveSettings } = await import('@/lib/google-drive')
            const tenantId = (session?.user as any).tenantId
            await getDriveSettings(tenantId) // Will throw if Drive not configured

            const folderMap = await createProjectFolders(tenantId, brand.nameEn, code, name, {
                serviceType: (type === 'SUPERVISION' || type === 'BOTH' || type === 'DESIGN')
                    ? type as 'DESIGN' | 'SUPERVISION' | 'BOTH'
                    : 'DESIGN',
                disciplines
            })

            driveFolderId = folderMap.root
            driveLink = `https://drive.google.com/drive/folders/${folderMap.root}`
            driveSubFolderIds = JSON.stringify(folderMap)
        } catch (driveErr) {
            console.warn("[Drive] Failed to create project folders (non-blocking):", driveErr)
        }
        // ── End Google Drive ─────────────────────────────────────────────────

        // Create Project Record
        await (db as any).project.create({
            data: {
                tenantId,
                name,
                code,
                clientId: crmClient.id,
                legacyClientName: clientName,
                legacyClientAddr: clientAddress,
                legacyClientVat: clientVat,
                legacyClientBio: clientBio,
                serviceType: type,
                contractValue,
                vatAmount,
                contractDuration: supervisionDuration ?? 0,
                brandId,
                branchId: branchId || null,
                year,
                sequence,
                driveFolderId,
                driveLink,
                driveSubFolderIds,
                projectTypeId,
                leadEngineerId: leadEngineerId || null,
                disciplines: JSON.stringify(disciplines),
                engineers: {
                    connect: engineerIds.map((id: string) => ({ id }))
                }
            }
        })

        return { success: true }

    } catch (e: any) {
        console.error(e)
        if (e.code === 'P2002') return { error: "Project code already exists (concurrency issue?)" }
        return { error: "Failed to create project: " + e.message }
    }
}

export async function updateProject(id: string, formData: FormData) {
    const session = await auth()

    // Auth Check
    const canEdit = await hasPermission('projects', 'createEdit')
    if (!canEdit) {
        return { error: "Unauthorized: Requires Project edit permission" }
    }

    const tenantId = (session?.user as any).tenantId
    if (!tenantId) return { error: "Unauthorized: No tenant ID found" }

    try {
        const name = formData.get("name") as string
        const branchId = formData.get("branchId") as string
        const projectTypeId = formData.get("projectTypeId") as string

        // Client Handling
        const clientName = formData.get("client") as string
        const clientAddress = formData.get("clientAddress") as string
        const clientVat = formData.get("clientVat") as string
        const clientBio = formData.get("clientBio") as string
        const type = formData.get("type") as string || "DESIGN"

        // Auto-Create or Find Client in CRM
        const { findOrCreateClient } = await import("@/app/admin/crm/actions")
        const crmClient = await findOrCreateClient(clientName, {
            address: clientAddress,
            taxNumber: clientVat
        })

        const contractValue = parseFloat(formData.get("contractValue") as string)
        const vatAmount = parseFloat(formData.get("vatAmount") as string) || 0
        const leadEngineerId = formData.get("leadEngineerId") as string

        // Parse engineers & disciplines
        const engineerIds = JSON.parse(formData.get("engineerIds") as string || "[]")
        const disciplines = JSON.parse(formData.get("disciplines") as string || "[]")

        const designValue = parseFloat(formData.get("designValue") as string) || null
        const supervisionPaymentType = formData.get("supervisionPaymentType") as string || null
        const supervisionMonthlyValue = parseFloat(formData.get("supervisionMonthlyValue") as string) || null
        const supervisionDuration = parseInt(formData.get("supervisionDuration") as string) || null
        const supervisionPackageValue = parseFloat(formData.get("supervisionPackageValue") as string) || null

        // We use updateMany to enforce the tenantId ownership check in the where clause
        const updateResult = await (db as any).project.updateMany({
            where: { id, tenantId },
            data: {
                name,
                clientId: crmClient.id,
                legacyClientName: clientName,
                legacyClientAddr: clientAddress,
                legacyClientVat: clientVat,
                legacyClientBio: clientBio,
                branchId: branchId || null,
                serviceType: type,
                contractValue,
                vatAmount,
                contractDuration: supervisionDuration,
                projectTypeId,
                designValue,
                supervisionPaymentType,
                supervisionMonthlyValue,
                supervisionDuration,
                supervisionPackageValue,
                leadEngineerId: leadEngineerId || null,
                disciplines: JSON.stringify(disciplines),
            }
        })

        // If we also need to update relationships (engineers), we must do it separately
        // but only if the user actually owns the project.
        if (updateResult.count > 0) {
            await (db as any).project.update({
                where: { id },
                data: {
                    engineers: {
                        set: engineerIds.map((id: string) => ({ id }))
                    }
                }
            })
        } else {
            return { error: "Project not found or access denied" }
        }
        return { success: true }
    } catch (e: any) {
        console.error(e)
        return { error: "Failed to update project: " + e.message }
    }
}

export async function deleteProject(id: string) {
    const session = await auth()

    // Auth Check
    const canDelete = await hasPermission('projects', 'delete')
    const tenantId = (session?.user as any).tenantId
    if (!tenantId) return { error: "Unauthorized: No tenant ID found" }

    try {
        // Enforce tenant isolation via deleteMany
        const deleteResult = await (db as any).project.deleteMany({
            where: { id, tenantId }
        })

        if (deleteResult.count === 0) {
            return { error: "Project not found or access denied" }
        }

        return { success: true }
    } catch (e: any) {
        console.error(e)
        return { error: "Failed to delete project" }
    }
}
