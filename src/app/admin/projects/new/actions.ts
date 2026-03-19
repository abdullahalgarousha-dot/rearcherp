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

    const name = formData.get("name") as string
    const brandId = formData.get("brandId") as string
    const branchId = formData.get("branchId") as string

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

    if (!name || !brandId || !clientName || isNaN(contractValue)) {
        return { error: "Missing required fields" }
    }

    try {
        // Auto-Coding Logic
        const year = 2026
        const brand = await (db as any).brand.findUnique({ where: { id: brandId } })
        if (!brand) return { error: "Brand not found" }

        // Use ShortName if available, else first 3 chars of EN name
        const brandCode = brand.shortName || brand.nameEn.substring(0, 3).toUpperCase()

        // Get last sequence for this brand/year
        const lastProject = await (db as any).project.findFirst({
            where: { brandId, year },
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

    try {
        const name = formData.get("name") as string
        const branchId = formData.get("branchId") as string

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

        await (db as any).project.update({
            where: { id },
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

                designValue,
                supervisionPaymentType,
                supervisionMonthlyValue,
                supervisionDuration,
                supervisionPackageValue,
                leadEngineerId: leadEngineerId || null,
                disciplines: JSON.stringify(disciplines),
                engineers: {
                    set: engineerIds.map((id: string) => ({ id }))
                }
            }
        })
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
    if (!canDelete) {
        return { error: "Unauthorized: Only Administrators can delete projects" }
    }

    try {
        await (db as any).project.delete({ where: { id } })
        return { success: true }
    } catch (e: any) {
        console.error(e)
        return { error: "Failed to delete project" }
    }
}
