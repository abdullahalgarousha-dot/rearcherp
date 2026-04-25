'use server'

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { generateOfficeRef, getNextSerial } from "@/lib/archiver"
import {
    findOrCreateFolder,
    uploadToDrive,
    uploadSmartFileToDrive,
    getDsrArchiveFolder,
    generateSmartFileName,
    uploadToDriveWithMeta,
    getProjectDrivePath,
    resolveDrivePath,
    getDriveSettings,
} from "@/lib/google-drive"
import { checkPermission, hasPermission } from "@/lib/rbac"
import { differenceInDays } from "date-fns"
import fs from "fs"
import path from "path"

// ─────────────────────────────────────────────────────────────────────────────
// LOCAL FALLBACK — development / no-Drive environments
// ─────────────────────────────────────────────────────────────────────────────

async function saveFileLocally(file: File): Promise<string> {
    const buffer = Buffer.from(await file.arrayBuffer())
    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })
    const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`
    fs.writeFileSync(path.join(uploadDir, fileName), buffer)
    return `/uploads/${fileName}`
}

// ─────────────────────────────────────────────────────────────────────────────
// DRIVE V2 ROUTING — resolve supervision sub-folder by name
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolves a named folder (e.g. 'NCR', 'IR', 'Site Photos') inside the
 * project's supervision root via the Blueprint v2 driveSubFolderIds JSON.
 * Falls back to legacy path resolution if the JSON map is absent.
 *
 * Returns the folderId string, or null if Drive is not configured.
 */
async function resolveSupervisionSubFolder(
    tenantId: string,
    project: { driveFolderId: string | null; driveSubFolderIds: string | null; brand: { nameEn: string } | null; code: string; name: string },
    subFolderName: string
): Promise<string | null> {
    if (!project.driveFolderId || project.driveFolderId.startsWith('mock_')) return null

    // ── Blueprint v2: parse driveSubFolderIds JSON ────────────────────────
    if (project.driveSubFolderIds) {
        try {
            const map = JSON.parse(project.driveSubFolderIds)
            const supervisionRootId: string | undefined = map.supervision
            if (supervisionRootId) {
                // Idempotent: find-or-create the named sub-folder inside Supervision Hub
                return await findOrCreateFolder(tenantId, subFolderName, supervisionRootId)
            }
        } catch {
            // Malformed JSON — fall through to legacy
        }
    }

    // ── Legacy fallback: resolve via path array ───────────────────────────
    const brandName = project.brand?.nameEn || 'DefaultBrand'
    try {
        const pathArray = await getProjectDrivePath(
            brandName,
            project.code,
            project.name,
            ['الإشراف - Supervision', subFolderName]
        )
        const { driveFolderId: rootId } = await getDriveSettings(tenantId)
        return await resolveDrivePath(tenantId, pathArray, rootId)
    } catch {
        return null
    }
}

/**
 * Uploads a file to Drive using V2 routing, falling back to local storage.
 */
async function uploadToSupervisionFolder(
    tenantId: string,
    project: { driveFolderId: string | null; driveSubFolderIds: string | null; brand: { nameEn: string } | null; code: string; name: string },
    subFolderName: string,
    file: File,
    displayName: string
): Promise<string> {
    const folderId = await resolveSupervisionSubFolder(tenantId, project, subFolderName)
    if (!folderId) return saveFileLocally(file)

    try {
        const buffer = Buffer.from(await file.arrayBuffer())
        const result = await uploadToDrive(tenantId, displayName, buffer, file.type, folderId)
        return result.webViewLink || `https://drive.google.com/file/d/${result.fileId}/view`
    } catch (err) {
        console.error(`[Drive] Upload to ${subFolderName} failed, using local fallback:`, err)
        return saveFileLocally(file)
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTRACTOR ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

export async function createContractor(formData: FormData) {
    const session = await auth()
    const user = session?.user as any
    const tenantId = user?.tenantId

    const canManage = await hasPermission('supervision', 'manageDSR')
    if (!canManage) return { error: "Unauthorized: Requires Supervision management permission" }
    if (!tenantId) return { error: "Unauthorized: tenant context missing" }

    const companyName = formData.get("name") as string
    const contactPerson = formData.get("contactInfo") as string
    const email = (formData.get("email") as string) || ""
    const phone = (formData.get("phone") as string) || ""
    const specialty = (formData.get("specialty") as string) || ""
    const logo = formData.get("logo") as string

    try {
        await db.contractor.create({
            data: { tenantId, companyName, contactPerson, email, phone, specialty, logo }
        })
        revalidatePath('/admin/supervision')
        return { success: true }
    } catch (e) {
        console.error(e)
        return { error: "Failed to create contractor" }
    }
}

export async function updateContractor(id: string, formData: FormData) {
    const session = await auth()
    const tenantId = (session?.user as any)?.tenantId

    const isAllowed = await checkPermission('SUPERVISION', 'write')
    if (!isAllowed) return { error: "Unauthorized" }
    if (!tenantId) return { error: "Unauthorized: tenant context missing" }

    // Verify ownership before mutating
    const existing = await db.contractor.findFirst({ where: { id, tenantId } })
    if (!existing) return { error: "Contractor not found or access denied" }

    const data: any = {}
    if (formData.has("name")) data.companyName = formData.get("name")
    if (formData.has("contactInfo")) data.contactPerson = formData.get("contactInfo")
    if (formData.has("email")) data.email = formData.get("email")
    if (formData.has("phone")) data.phone = formData.get("phone")
    if (formData.has("specialty")) data.specialty = formData.get("specialty")
    if (formData.has("logo")) data.logo = formData.get("logo")

    try {
        await db.contractor.update({ where: { id }, data })
        revalidatePath('/admin/supervision')
        return { success: true }
    } catch (e) {
        console.error(e)
        return { error: "Failed to update contractor" }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// NCR ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

export async function createNCR(formData: FormData) {
    const session = await auth()
    const user = session?.user as any
    const userId = user?.id
    const tenantId = user?.tenantId

    const canManage = await hasPermission('supervision', 'manageNCR')
    if (!canManage) return { error: "Unauthorized: Requires NCR management permission" }
    if (!userId || !tenantId) return { error: "Unauthorized" }

    const projectId = formData.get("projectId") as string
    const contractorId = formData.get("contractorId") as string
    const description = (formData.get("description") as string) || "تقرير فني"
    const severity = (formData.get("severity") as string) || "MEDIUM"

    if (!contractorId) return { error: "Contractor Selection is MANDATORY." }
    if (!description) return { error: "Description is required." }

    const file = formData.get("file") as File
    if (!file || file.size === 0) return { error: "Contractor Document (PDF/Image) is STRICTLY REQUIRED." }

    try {
        // TARGET 2: tenant-scoped project fetch — blocks cross-tenant NCR creation
        const project = await db.project.findFirst({
            where: { id: projectId, tenantId },
            include: { brand: true }
        })
        if (!project) return { error: "Project not found or access denied" }

        const serial = await getNextSerial(projectId, "NCR")
        const officeRef = await generateOfficeRef(projectId, "NCR", serial)

        // TARGET 3: Drive V2 routing — NCR sub-folder inside Supervision Hub
        const contractorDocUrl = await uploadToSupervisionFolder(
            tenantId,
            project as any,
            'NCR',
            file,
            `Pending - ${officeRef} - ${file.name}`
        )

        await (db as any).nCR.create({
            data: {
                projectId,
                contractorId,
                description,
                severity,
                status: "PENDING",
                officeRef,
                currentRev: 0,
                createdById: userId,
                revisions: {
                    create: { revNumber: 0, status: "PENDING", contractorFile: contractorDocUrl, userId }
                }
            }
        })

        revalidatePath(`/admin/projects/${projectId}`)
        revalidatePath('/admin/supervision')
        return { success: true }
    } catch (e) {
        console.error(e)
        return { error: "Failed to create NCR: " + (e as Error).message }
    }
}

export async function updateNCRStatus(id: string, formData: FormData) {
    const session = await auth()
    const currentUser = session?.user as any
    const tenantId = currentUser?.tenantId

    const status = formData.get("status") as string

    if (status === 'APPROVED' || status === 'REJECTED' || status === 'CLOSED') {
        const canApprove = await checkPermission('SUPERVISION', 'approve')
        if (!canApprove) return { error: "Unauthorized: You need Approval permissions." }
    } else {
        const canEdit = await checkPermission('SUPERVISION', 'write')
        if (!canEdit) return { error: "Unauthorized" }
    }

    if (!tenantId) return { error: "Unauthorized: tenant context missing" }

    const consultantDocFile = formData.get("consultantDoc") as File

    const ncr = await (db as any).nCR.findFirst({
        where: { id, project: { tenantId } },
        include: { project: { include: { brand: true } } }
    })
    if (!ncr) return { error: "NCR not found or access denied" }

    const data: any = { status }

    if ((status === 'APPROVED' || status === 'REJECTED' || status === 'CLOSED') && consultantDocFile && consultantDocFile.size > 0) {
        // TARGET 3: Drive V2 routing for consultant response doc
        data.consultantDoc = await uploadToSupervisionFolder(
            tenantId,
            ncr.project as any,
            'NCR',
            consultantDocFile,
            `Response - ${ncr.officeRef} - ${consultantDocFile.name}`
        )
        data.approvedById = currentUser.id
    } else if ((status === 'APPROVED' || status === 'REJECTED' || status === 'CLOSED') && (!consultantDocFile || consultantDocFile.size === 0)) {
        return { error: "Consultant Response (Final Copy) is REQUIRED to Close/Approve/Reject this request." }
    }

    try {
        await (db as any).nCRRevision.updateMany({
            where: { ncrId: id, revNumber: ncr.currentRev },
            data: { status, consultantFile: data.consultantDoc, respondedById: currentUser.id }
        })

        await (db as any).nCR.update({
            where: { id },
            data: {
                status: status === 'REJECTED' ? 'REVISE_RESUBMIT' : status,
                approvedById: status === 'APPROVED' || status === 'CLOSED' ? currentUser.id : null
            }
        })

        revalidatePath('/admin/supervision')
        return { success: true }
    } catch (e) {
        console.error(e)
        return { error: "Failed to update NCR status" }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// IR ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

export async function createInspectionRequest(formData: FormData) {
    const session = await auth()
    const user = session?.user as any
    const userId = user?.id
    const tenantId = user?.tenantId

    const isAllowed = await checkPermission('SUPERVISION', 'write')
    if (!isAllowed) return { error: "Unauthorized" }
    if (!userId || !tenantId) return { error: "Unauthorized" }

    const projectId = formData.get("projectId") as string
    const contractorId = formData.get("contractorId") as string
    const type = (formData.get("type") as string) || "WORK"
    const date = new Date(formData.get("date") as string || new Date().toISOString())
    const description = (formData.get("description") as string) || "تقرير فحص فني"
    const contractorRef = (formData.get("contractorRef") as string) || ""

    if (!contractorId) return { error: "Contractor Selection is MANDATORY." }

    const file = formData.get("file") as File
    if (!file || file.size === 0) return { error: "Contractor Report (File) is STRICTLY REQUIRED." }

    try {
        // TARGET 2: tenant-scoped project fetch — blocks cross-tenant IR creation
        const project = await db.project.findFirst({
            where: { id: projectId, tenantId },
            include: { brand: true }
        })
        if (!project) return { error: "Project not found or access denied" }

        const lastIR = await db.inspectionRequest.findFirst({
            where: { projectId },
            orderBy: { serial: 'desc' }
        })
        const serial = (lastIR?.serial || 0) + 1
        const officeRef = await generateOfficeRef(projectId, "IR", serial)

        // TARGET 3: Drive V2 routing — IR sub-folder inside Supervision Hub
        const contractorDocUrl = await uploadToSupervisionFolder(
            tenantId,
            project as any,
            'IR',
            file,
            `Pending - ${officeRef} - ${file.name}`
        )

        await (db as any).inspectionRequest.create({
            data: {
                projectId,
                contractorId,
                type,
                date,
                description,
                status: "PENDING",
                officeRef,
                serial,
                currentRev: 0,
                createdById: userId,
                revisions: {
                    create: { revNumber: 0, status: "PENDING", contractorFile: contractorDocUrl, userId }
                }
            }
        })

        revalidatePath(`/admin/projects/${projectId}`)
        revalidatePath('/admin/supervision')
        return { success: true }
    } catch (e) {
        console.error(e)
        return { error: "Failed to create IR: " + (e as Error).message }
    }
}

export async function updateInspectionRequestStatus(id: string, formData: FormData) {
    const session = await auth()
    const currentUser = session?.user as any
    const tenantId = currentUser?.tenantId

    const status = formData.get("status") as string

    if (status.includes('APPROVED') || status === 'REJECTED') {
        const canApprove = await hasPermission('supervision', 'approve')
        if (!canApprove) return { error: "Unauthorized: You need Approval permissions." }
    } else {
        const canEdit = await hasPermission('supervision', 'manageIR')
        if (!canEdit) return { error: "Unauthorized" }
    }

    if (!tenantId) return { error: "Unauthorized: tenant context missing" }

    const finalDocFile = formData.get("finalDocument") as File
    const comments = formData.get("comments") as string

    const ir = await db.inspectionRequest.findFirst({
        where: { id, project: { tenantId } },
        include: { project: { include: { brand: true } } }
    })
    if (!ir) return { error: "IR not found or access denied" }

    const data: any = { status }
    if (comments) data.consultantComments = comments

    if ((status.includes('APPROVED') || status === 'REJECTED') && finalDocFile && finalDocFile.size > 0) {
        // TARGET 3: Drive V2 routing for final signed doc
        data.finalDocument = await uploadToSupervisionFolder(
            tenantId,
            ir.project as any,
            'IR',
            finalDocFile,
            `Final - ${ir.officeRef} - ${finalDocFile.name}`
        )
        data.approvedById = currentUser.id
    } else if ((status.includes('APPROVED') || status === 'REJECTED') && (!finalDocFile || finalDocFile.size === 0)) {
        return { error: "Consultant Response (Final Signed Doc) is REQUIRED." }
    }

    try {
        await db.iRRevision.updateMany({
            where: { irId: id, revNumber: ir.currentRev },
            data: { status, consultantFile: data.finalDocument, comments: data.consultantComments, respondedById: currentUser.id }
        })

        await db.inspectionRequest.update({
            where: { id },
            data: {
                status: status === 'REJECTED' ? 'REVISE_RESUBMIT' : status,
                approvedById: status === 'APPROVED' ? currentUser.id : null
            }
        })

        revalidatePath('/admin/supervision')
        return { success: true }
    } catch (e) {
        console.error(e)
        return { error: "Failed to update IR status" }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// DSR ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

export async function createDailyReport(projectId: string, formData: FormData) {
    const session = await auth()
    const user = session?.user as any

    const canManage = await hasPermission('supervision', 'manageDSR')
    if (!canManage) return { error: "Unauthorized: Requires Supervision management permission" }

    // TARGET 1: No bypass. userId must come strictly from the session.
    const userId = user?.id
    const tenantId = user?.tenantId
    if (!userId || !tenantId) return { error: "Unauthorized" }

    const basics = JSON.parse(formData.get("basics") as string)
    const attendees = JSON.parse(formData.get("attendees") as string)
    const contractorData = JSON.parse(formData.get("contractorData") as string || "[]")
    const equipment = JSON.parse(formData.get("equipment") as string || "[]")

    try {
        // TARGET 2: tenant-scoped project fetch — blocks cross-tenant DSR creation
        const project = await db.project.findFirst({
            where: { id: projectId, tenantId },
            include: { brand: true }
        })
        if (!project) return { error: "Project not found or access denied" }

        const { date, weather, workPerformedToday, plannedWorkTomorrow, materialsDelivered,
            safetyStatus, completionPercentage, delayDays } = basics

        const serial = await getNextSerial(projectId, "DSR")
        const officeRef = await generateOfficeRef(projectId, "DSR", serial)

        // TARGET 3: Drive V2 routing — Site Photos folder inside Supervision Hub
        const photoKeys = Array.from(formData.keys()).filter(k => k.startsWith("photo_"))
        const sitePhotosFolder = await resolveSupervisionSubFolder(tenantId, project as any, 'Site Photos')

        const uploadPromises = photoKeys.map(async (key) => {
            const index = key.split("_")[1]
            const file = formData.get(key) as File
            const caption = formData.get(`caption_${index}`) as string
            if (!file || file.size === 0) return null

            const extension = file.name.split('.').pop()
            const newFileName = `IMG-${officeRef}-${index}.${extension}`
            const renamedFile = new File([file], newFileName, { type: file.type })

            try {
                if (sitePhotosFolder) {
                    const buffer = Buffer.from(await renamedFile.arrayBuffer())
                    const result = await uploadToDrive(tenantId, newFileName, buffer, renamedFile.type, sitePhotosFolder)
                    const url = result.webViewLink || `https://drive.google.com/uc?id=${result.fileId}&export=download`
                    return { url, caption }
                }
            } catch (err) {
                console.error("[Drive] Photo upload failed, falling back to local:", err)
            }
            const url = await saveFileLocally(renamedFile)
            return { url, caption }
        })

        const sitePhotos = (await Promise.all(uploadPromises)).filter(Boolean) as { url: string; caption: string }[]

        let elapsedDays = 0
        if (project.startDate) {
            elapsedDays = Math.max(0, differenceInDays(new Date(date), project.startDate))
        }

        const totalStaff = contractorData.reduce((sum: number, c: any) => {
            const laborSum = (c.labor ?? []).reduce((lSum: number, l: any) => lSum + (parseInt(l.count) || 0), 0)
            return sum + laborSum
        }, 0)

        let finalCompletionPercentage = Number(completionPercentage) || 0
        if (finalCompletionPercentage === 0) {
            const prev = await db.dailyReport.findFirst({
                where: { projectId },
                orderBy: { date: 'desc' },
                select: { completionPercentage: true, currentCompletion: true }
            })
            if (prev) finalCompletionPercentage = prev.currentCompletion || prev.completionPercentage || 0
        }

        const report = await db.dailyReport.create({
            data: {
                tenantId,
                projectId,
                contractorId: (formData.get("contractorId") as string) || null,
                date: new Date(date),
                weather,
                workPerformedToday,
                plannedWorkTomorrow,
                contractorData: JSON.stringify(contractorData),
                equipment: JSON.stringify(equipment),
                consultantStaff: JSON.stringify(
                    attendees.filter((a: any) => a.present).map((a: any) => ({ role: "Engineer", name: a.name, userId: a.userId }))
                ),
                totalManpower: totalStaff,
                sitePhotos: JSON.stringify(sitePhotos),
                completionPercentage: finalCompletionPercentage,
                currentCompletion: finalCompletionPercentage,
                delayDays: Number(delayDays) || 0,
                materialsDelivered,
                safetyStatus,
                officeRef,
                serial,
                elapsedDays,
                createdById: userId,
                status: "PENDING",
            }
        })

        revalidatePath(`/admin/supervision/dsr/${projectId}`)
        revalidatePath(`/admin/projects/${projectId}`)
        return { success: true, id: report.id }
    } catch (e: any) {
        console.error(e)
        return { error: "Failed to create report: " + e.message }
    }
}

export async function updateDailyReport(reportId: string, projectId: string, formData: FormData) {
    const session = await auth()
    const user = session?.user as any
    const tenantId = user?.tenantId

    const isAllowed = await checkPermission('SUPERVISION', 'write')
    if (!isAllowed) return { error: "Unauthorized" }
    if (!tenantId) return { error: "Unauthorized: tenant context missing" }

    const basics = JSON.parse(formData.get("basics") as string)
    const attendees = JSON.parse(formData.get("attendees") as string)
    const contractorData = JSON.parse(formData.get("contractorData") as string || "[]")
    const equipment = JSON.parse(formData.get("equipment") as string || "[]")

    try {
        // Tenant-scoped fetch for both report and project
        const report = await db.dailyReport.findFirst({ where: { id: reportId, tenantId } })
        if (!report) return { error: "Report not found or access denied" }

        const project = await db.project.findFirst({
            where: { id: projectId, tenantId },
            include: { brand: true }
        })
        if (!project) return { error: "Project not found or access denied" }

        // Preserve existing photos then append new ones
        let existingPhotos: { url: string; caption: string }[] = []
        try { existingPhotos = JSON.parse(report.sitePhotos as string || "[]") } catch { }

        const photoKeys = Array.from(formData.keys()).filter(k => k.startsWith("photo_"))
        const sitePhotosFolder = await resolveSupervisionSubFolder(tenantId, project as any, 'Site Photos')

        const uploadPromises = photoKeys.map(async (key) => {
            const index = key.split("_")[1]
            const file = formData.get(key) as File
            const caption = formData.get(`caption_${index}`) as string
            if (!file || file.size === 0) return null

            const extension = file.name.split('.').pop()
            const newFileName = `IMG-${report.officeRef || report.serial}-${index}.${extension}`
            const renamedFile = new File([file], newFileName, { type: file.type })

            try {
                if (sitePhotosFolder) {
                    const buffer = Buffer.from(await renamedFile.arrayBuffer())
                    const result = await uploadToDrive(tenantId, newFileName, buffer, renamedFile.type, sitePhotosFolder)
                    const url = result.webViewLink || `https://drive.google.com/uc?id=${result.fileId}&export=download`
                    return { url, caption }
                }
            } catch (err) {
                console.error("[Drive] Photo upload failed, falling back to local:", err)
            }
            const url = await saveFileLocally(renamedFile)
            return { url, caption }
        })

        const newPhotos = (await Promise.all(uploadPromises)).filter(Boolean) as { url: string; caption: string }[]
        const combinedPhotos = [...existingPhotos, ...newPhotos]

        let elapsedDays = report.elapsedDays
        if (basics.date && project.startDate) {
            elapsedDays = Math.max(0, differenceInDays(new Date(basics.date), project.startDate))
        }

        const totalStaff = contractorData.reduce((sum: number, c: any) => {
            const laborSum = (c.labor ?? []).reduce((lSum: number, l: any) => lSum + (parseInt(l.count) || 0), 0)
            return sum + laborSum
        }, 0)

        const { date, weather, workPerformedToday, plannedWorkTomorrow, materialsDelivered,
            safetyStatus, completionPercentage, delayDays } = basics

        await db.dailyReport.update({
            where: { id: reportId },
            data: {
                contractorId: (formData.get("contractorId") as string) || null,
                date: new Date(date),
                weather,
                workPerformedToday,
                plannedWorkTomorrow,
                contractorData: JSON.stringify(contractorData),
                consultantStaff: JSON.stringify(
                    attendees.filter((a: any) => a.present).map((a: any) => ({ role: "Engineer", name: a.name, userId: a.userId }))
                ),
                equipment: JSON.stringify(equipment),
                totalManpower: totalStaff,
                sitePhotos: JSON.stringify(combinedPhotos),
                completionPercentage: Number(completionPercentage) || 0,
                delayDays: Number(delayDays) || 0,
                materialsDelivered,
                safetyStatus,
                elapsedDays,
            }
        })

        revalidatePath(`/admin/supervision/dsr/${projectId}/${reportId}`)
        return { success: true }
    } catch (e: any) {
        console.error(e)
        return { error: "Update failed: " + e.message }
    }
}

export async function approveDailyReport(reportId: string) {
    const session = await auth()
    const currentUser = session?.user as any
    const tenantId = currentUser?.tenantId

    const canApprove = await checkPermission('SUPERVISION', 'approve')
    if (!canApprove) return { error: "Forbidden: You need Approval permissions" }
    if (!tenantId) return { error: "Unauthorized: tenant context missing" }

    try {
        const report = await db.dailyReport.findFirst({
            where: { id: reportId, tenantId },
            select: { currentCompletion: true, projectId: true }
        })
        if (!report) return { error: "Report not found or access denied" }

        await db.$transaction([
            db.dailyReport.update({
                where: { id: reportId },
                data: { status: "APPROVED", approvedById: currentUser.id }
            }),
            db.project.update({
                where: { id: report.projectId },
                data: { completionPercent: report.currentCompletion }
            })
        ])

        revalidatePath('/admin/supervision')
        revalidatePath('/admin/supervision/dsr', 'layout')
        revalidatePath(`/admin/projects/${report.projectId}`)
        return { success: true }
    } catch (e) {
        console.error(e)
        return { error: "Failed to approve report" }
    }
}

export async function uploadDsrPdfToDrive(formData: FormData) {
    const session = await auth()
    const tenantId = (session?.user as any)?.tenantId

    const isAllowed = await checkPermission('SUPERVISION', 'write')
    if (!isAllowed) return { error: "Unauthorized" }
    if (!tenantId) return { error: "Unauthorized: tenant context missing" }

    const projectId = formData.get('projectId') as string
    const reportId = formData.get('reportId') as string
    const file = formData.get('file') as File
    if (!file || file.size === 0) return { error: "No file provided" }

    try {
        const project = await db.project.findFirst({
            where: { id: projectId, tenantId },
            include: { brand: true }
        })
        if (!project) return { error: "Project not found or access denied" }

        const buffer = Buffer.from(await file.arrayBuffer())

        // Blueprint v2 DSR archive folder
        const dsrFolderId = await getDsrArchiveFolder(tenantId, projectId)
        if (dsrFolderId) {
            const smartName = generateSmartFileName(project.code, 'DSR', reportId || 'Report') + '.pdf'
            await uploadToDriveWithMeta(tenantId, smartName, buffer, 'application/pdf', dsrFolderId, {
                projectCode: project.code,
                category: 'DSR',
            })
            return { success: true }
        }

        // Legacy path fallback
        if (project.driveFolderId && !project.driveFolderId.startsWith('mock_')) {
            const brandName = project.brand?.nameEn || "DefaultBrand"
            const pathArray = await getProjectDrivePath(brandName, project.code, project.name, ['الإشراف - Supervision', 'التقارير اليومية - Daily Reports'])
            await uploadSmartFileToDrive(tenantId, buffer, file.name, 'application/pdf', pathArray)
            return { success: true }
        }

        return { error: "Google Drive is not configured for this project" }
    } catch (e: any) {
        console.error(e)
        return { error: "Failed to upload PDF: " + e.message }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// WEEKLY / MONTHLY DIGEST — used by the Automated Reports page
// ─────────────────────────────────────────────────────────────────────────────

export async function getWeeklyDigest(startDate: Date, endDate: Date) {
    const session = await auth()
    const user = session?.user as any
    const tenantId = user?.tenantId as string | undefined
    const isGlobalSuperAdmin = user?.role === 'GLOBAL_SUPER_ADMIN'
    const tenantFilter = isGlobalSuperAdmin ? {} : { tenantId }

    const dateRange = { gte: startDate, lte: endDate }

    try {
        const [reports, ncrs] = await Promise.all([
            db.dailyReport.findMany({
                where: { ...tenantFilter, date: dateRange },
                include: {
                    project: { select: { id: true, name: true, code: true } },
                    createdBy: { select: { name: true } },
                },
                orderBy: { date: 'asc' },
            }),
            (db as any).nCR.findMany({
                where: { ...tenantFilter, createdAt: dateRange },
                select: { id: true, status: true, severity: true },
            }),
        ])

        // ── Aggregate totals ──────────────────────────────────────────────────
        const reportCount    = reports.length
        const totalManpower  = reports.reduce((s, r) => s + (r.totalManpower ?? 0), 0)
        const totalManHours  = totalManpower * 8
        const avgCompletion  = reportCount > 0
            ? Math.round(reports.reduce((s, r) => s + (r.currentCompletion ?? 0), 0) / reportCount)
            : 0

        // ── NCR stats ─────────────────────────────────────────────────────────
        const newNCRs      = ncrs.length
        const pendingNCRs  = ncrs.filter((n: any) => n.status === 'PENDING' || n.status === 'OPEN').length
        const criticalNCRs = ncrs.filter((n: any) => n.severity === 'CRITICAL').length

        // ── Per-project breakdown ─────────────────────────────────────────────
        const projectMap = new Map<string, {
            name: string; code: string; reports: number; manpower: number; totalCompletion: number
        }>()

        for (const r of reports) {
            const key = r.projectId
            const existing = projectMap.get(key)
            if (existing) {
                existing.reports        += 1
                existing.manpower       += r.totalManpower ?? 0
                existing.totalCompletion += r.currentCompletion ?? 0
            } else {
                projectMap.set(key, {
                    name:            r.project.name,
                    code:            r.project.code ?? '',
                    reports:         1,
                    manpower:        r.totalManpower ?? 0,
                    totalCompletion: r.currentCompletion ?? 0,
                })
            }
        }

        const projectBreakdown = Array.from(projectMap.values()).map(p => ({
            name:          p.name,
            code:          p.code,
            reports:       p.reports,
            manpower:      p.manpower,
            avgCompletion: p.reports > 0 ? Math.round(p.totalCompletion / p.reports) : 0,
        }))

        return {
            reportCount,
            totalManpower,
            totalManHours,
            avgCompletion,
            newNCRs,
            pendingNCRs,
            criticalNCRs,
            projectBreakdown,
            ncrs,
            reports,
        }
    } catch (e) {
        console.error('[getWeeklyDigest]', e)
        return {
            reportCount: 0, totalManpower: 0, totalManHours: 0, avgCompletion: 0,
            newNCRs: 0, pendingNCRs: 0, criticalNCRs: 0,
            projectBreakdown: [], ncrs: [], reports: [],
        }
    }
}

export async function approveNCR(id: string) {
    const session = await auth()
    const currentUser = session?.user as any
    const tenantId = currentUser?.tenantId

    const canApprove = await checkPermission('SUPERVISION', 'approve')
    if (!canApprove) return { error: "Forbidden: You need Approval permissions" }
    if (!tenantId) return { error: "Unauthorized: tenant context missing" }

    // Tenant-scoped check before mutating
    const ncr = await (db as any).nCR.findFirst({ where: { id, project: { tenantId } } })
    if (!ncr) return { error: "NCR not found or access denied" }

    try {
        await (db as any).nCR.update({
            where: { id },
            data: { status: "APPROVED", approvedById: currentUser.id }
        })
        revalidatePath('/admin/supervision')
        revalidatePath('/admin/supervision', 'layout')
        return { success: true }
    } catch (e) {
        console.error(e)
        return { error: "Failed to approve NCR" }
    }
}
