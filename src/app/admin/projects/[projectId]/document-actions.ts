'use server'

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import {
    getEdcDisciplineFolder,
    getEdcPendingFolder,
    uploadToDrive,
    moveFileToArchive,
    resolveDrivePath,
    getDrive
} from "@/lib/google-drive"
import { hasPermission } from "@/lib/rbac"

export async function uploadDrawingRevision(projectId: string, data: {
    drawingCode: string
    title: string
    discipline: string
    fileBase64: string
    mimeType: string
    fileName: string
    changeReason?: string
}) {
    const session = await auth()
    if (!session?.user) return { error: "Not authenticated" }
    const userId = session.user.id!

    try {
        // 1. Find or create the master Drawing record
        let drawing = await (db as any).drawing.findUnique({
            where: {
                projectId_drawingCode: {
                    projectId,
                    drawingCode: data.drawingCode
                }
            },
            include: { revisions: true }
        })

        if (!drawing) {
            drawing = await (db as any).drawing.create({
                data: {
                    projectId,
                    drawingCode: data.drawingCode,
                    title: data.title,
                    discipline: data.discipline
                },
                include: { revisions: true }
            })
        }

        const nextVersion = drawing.revisions.length + 1

        // 2. Upload to Pending_Review
        const tenantId = (session.user as any).tenantId
        const pendingFolderId = await getEdcPendingFolder(tenantId, projectId)

        // Convert Base64 to Buffer
        const base64Data = data.fileBase64.replace(/^data:.*,/, '')
        const fileBuffer = Buffer.from(base64Data, 'base64')
        const finalFileName = `${data.drawingCode}_V${nextVersion}_${data.fileName}`

        const uploadResult = await uploadToDrive(tenantId, finalFileName, fileBuffer, data.mimeType, pendingFolderId)

        if (!uploadResult.fileId) throw new Error("Failed to upload to Google Drive")

        // 3. Create the DrawingRevision (PENDING by default)
        await (db as any).drawingRevision.create({
            data: {
                drawingId: drawing.id,
                versionNumber: nextVersion,
                status: 'PENDING',
                googleDriveFileId: uploadResult.fileId,
                fileUrl: uploadResult.webViewLink,
                uploadedById: userId,
                changeReason: nextVersion > 1 ? data.changeReason : 'Initial Upload',
            }
        })

        revalidatePath(`/admin/projects/${projectId}`)
        return { success: true }
    } catch (e: any) {
        console.error("Upload error:", e)
        return { error: e.message || "Failed to upload drawing revision" }
    }
}

export async function approveDrawingRevision(projectId: string, revisionId: string) {
    const session = await auth()
    if (!session?.user) return { error: "Not authenticated" }

    // Check permission (Design/Supervision Leads or Admins)
    const isAdmin = ['SUPER_ADMIN', 'ADMIN', 'DESIGN_LEAD'].includes((session.user as any).role)
    // Here we can also use hasPermission if we configured a specific EDC module
    if (!isAdmin) return { error: "Unauthorized. Require Approver privileges." }

    try {
        const currentRevision = await (db as any).drawingRevision.findUnique({
            where: { id: revisionId },
            include: { drawing: true }
        })

        if (!currentRevision || currentRevision.status !== 'PENDING') {
            return { error: "Revision not found or is not PENDING." }
        }

        const drawing = currentRevision.drawing

        // Find previously approved revision (to displace it)
        const previousRevision = await (db as any).drawingRevision.findFirst({
            where: {
                drawingId: drawing.id,
                status: 'APPROVED',
                id: { not: revisionId }
            },
            orderBy: { versionNumber: 'desc' }
        })

        const tenantId = (session.user as any).tenantId
        const folders = await getEdcDisciplineFolder(tenantId, projectId, drawing.discipline)
        const drive = await getDrive(tenantId)

        // Displacement Logic: Move old file to Archive
        if (previousRevision && previousRevision.googleDriveFileId) {
            try {
                // Fetch old file name
                const oldFile = await drive.files.get({ fileId: previousRevision.googleDriveFileId, fields: 'name' })
                if (oldFile.data.name) {
                    await moveFileToArchive(
                        tenantId,
                        previousRevision.googleDriveFileId,
                        oldFile.data.name,
                        previousRevision.versionNumber,
                        folders.archiveId
                    )
                }

                // Mark DB old revision as ARCHIVED
                await (db as any).drawingRevision.update({
                    where: { id: previousRevision.id },
                    data: { status: 'ARCHIVED' }
                })
            } catch (err) {
                console.error("Failed to archive previous revision. Might already be deleted from Drive", err)
            }
        }

        // Displacement Logic: Move new file from Pending to Active Discipline Folder
        if (currentRevision.googleDriveFileId) {
            const file = await drive.files.get({
                fileId: currentRevision.googleDriveFileId,
                fields: 'parents'
            })
            const previousParents = file.data.parents ? file.data.parents.join(',') : ''

            await drive.files.update({
                fileId: currentRevision.googleDriveFileId,
                addParents: folders.activeId,
                removeParents: previousParents,
                fields: 'id, parents'
            })
        }

        // Mark current revision as APPROVED
        await (db as any).drawingRevision.update({
            where: { id: revisionId },
            data: {
                status: 'APPROVED',
                approvedById: session.user.id
            }
        })

        revalidatePath(`/admin/projects/${projectId}`)
        return { success: true }
    } catch (e: any) {
        console.error("Approval error:", e)
        return { error: e.message || "Failed to approve drawing revision" }
    }
}

export async function rejectDrawingRevision(projectId: string, revisionId: string, notes: string) {
    const session = await auth()
    if (!session?.user) return { error: "Not authenticated" }

    // Check permission
    const isAdmin = ['SUPER_ADMIN', 'ADMIN', 'DESIGN_LEAD'].includes((session.user as any).role)
    if (!isAdmin) return { error: "Unauthorized." }

    try {
        await (db as any).drawingRevision.update({
            where: { id: revisionId },
            data: {
                status: 'REJECTED',
                approvalNotes: notes,
                approvedById: session.user.id // The one who rejected
            }
        })

        revalidatePath(`/admin/projects/${projectId}`)
        return { success: true }
    } catch (e: any) {
        return { error: e.message || "Failed to reject drawing revision" }
    }
}

// ==========================================
// COLLABORATIVE COMMENTING SYSTEM
// ==========================================

export async function addFileComment(projectId: string, revisionId: string, text: string) {
    const session = await auth()
    if (!session?.user) return { error: "Not authenticated" }

    try {
        await (db as any).fileComment.create({
            data: {
                revisionId,
                userId: session.user.id,
                text
            }
        })
        revalidatePath(`/admin/projects/${projectId}`)
        return { success: true }
    } catch (e: any) {
        console.error("Comment error:", e)
        return { error: e.message || "Failed to add comment" }
    }
}

// ==========================================
// TARGETED NOTIFICATIONS & DIRECT UPLOAD
// ==========================================

export async function finalizeDirectUpload(projectId: string, data: {
    drawingCode: string
    title: string
    discipline: string
    googleDriveFileId: string
    changeReason?: string
}) {
    const session = await auth()
    if (!session?.user) return { error: "Not authenticated" }
    const userId = session.user.id!

    try {
        // 1. Find or create master Drawing
        let drawing = await (db as any).drawing.findUnique({
            where: { projectId_drawingCode: { projectId, drawingCode: data.drawingCode } },
            include: { revisions: true }
        })

        if (!drawing) {
            drawing = await (db as any).drawing.create({
                data: { projectId, drawingCode: data.drawingCode, title: data.title, discipline: data.discipline },
                include: { revisions: true }
            })
        }

        const nextVersion = drawing.revisions.length + 1

        // 2. We already pushed to Google Drive directly from UI.
        // Get the view link from Drive if possible (Optional, but good for UI)
        const tenantId = (session.user as any).tenantId
        const drive = await getDrive(tenantId)
        const fileInfo = await drive.files.get({ fileId: data.googleDriveFileId, fields: 'webViewLink' })
        const fileUrl = fileInfo.data.webViewLink

        // 3. Create the DrawingRevision record
        await (db as any).drawingRevision.create({
            data: {
                drawingId: drawing.id,
                versionNumber: nextVersion,
                status: 'PENDING',
                googleDriveFileId: data.googleDriveFileId,
                fileUrl: fileUrl,
                uploadedById: userId,
                changeReason: nextVersion > 1 ? data.changeReason : 'Initial Upload',
            }
        })

        // 4. Dispatch Targeted In-App Notifications
        const project = await db.project.findUnique({
            where: { id: projectId },
            include: { engineers: true }
        })

        if (project && project.engineers.length > 0) {
            const notifications = project.engineers.map((eng: any) => ({
                userId: eng.id,
                title: 'New Document Uploaded',
                message: `A new ${data.discipline} document (${data.drawingCode}) was uploaded for ${project.name} by ${session.user?.name || 'an engineer'}.`,
                type: 'DOCUMENT_UPLOAD',
                link: `/admin/projects/${projectId}?tab=documents`
            }))

            await (db as any).inAppNotification.createMany({ data: notifications })
        }

        revalidatePath(`/admin/projects/${projectId}`)
        return { success: true }
    } catch (e: any) {
        console.error("Finalize upload error:", e)
        return { error: e.message || "Failed to finalize direct upload" }
    }
}
