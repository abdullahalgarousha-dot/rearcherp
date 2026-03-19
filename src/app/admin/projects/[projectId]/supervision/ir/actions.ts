'use server'

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { generateOfficeRef, getNextSerial, archiveDocument } from "@/lib/archiver"
import { uploadToDrive, ensureProjectSubfolder } from "@/lib/google-drive"

import { hasPermission } from "@/lib/rbac"

async function checkPermission(projectId: string, requiredPermission: string) {
    const session = await auth()
    if (!session?.user) throw new Error("Unauthorized")

    const canDo = await hasPermission('supervision', 'manageIR')
    if (!canDo) throw new Error("Forbidden")
    return { ...session.user, tenantId: (session.user as any).tenantId }
}

export async function createIR(projectId: string, formData: FormData) {
    const user = await checkPermission(projectId, 'EDIT')

    const type = formData.get("type") as string
    const date = new Date(formData.get("date") as string)
    const description = formData.get("description") as string
    const contractorRef = formData.get("contractorRef") as string
    const taskId = formData.get("taskId") as string

    const file = formData.get("file") as File
    if (!file) return { error: "Contractor Report is required" }

    try {
        // 1. Upload Contractor Report (Pending)
        const project = await (db as any).project.findUnique({ where: { id: projectId } })
        if (!project) throw new Error("Project not found")

        let parentId = project.driveFolderId
        // If no drive folder, we might skip upload or fail. For now, let's assume valid or mock.
        if (!parentId || parentId.startsWith('mock_')) {
            // Mock upload or handle gracefully
        }

        let contractorReportUrl = ""

        if (parentId && !parentId.startsWith('mock_')) {
            const tenantId = (user as any).tenantId
            const supervisionId = await ensureProjectSubfolder(tenantId, parentId, "03-Supervision")
            if (supervisionId) {
                const irId = await ensureProjectSubfolder(tenantId, supervisionId, "IR")
                if (irId) {
                    const pendingId = await ensureProjectSubfolder(tenantId, irId, "Pending")
                    if (pendingId) {
                        const buffer = Buffer.from(await file.arrayBuffer())
                        const upload = await uploadToDrive(tenantId, `${contractorRef || 'NoRef'} - ${file.name}`, buffer, file.type || 'application/pdf', pendingId)
                        contractorReportUrl = upload.webViewLink || ""
                    }
                }
            }
        }

        // 2. Generate Codes
        const serial = await getNextSerial(projectId, "IR")
        const officeRef = await generateOfficeRef(projectId, "IR", serial, 0) // Rev 0

        // 3. Create DB Record
        await (db as any).inspectionRequest.create({
            data: {
                projectId,
                taskId: taskId || null,
                type,
                date,
                description,
                contractorRef,
                officeRef,
                serial,
                revision: 0,
                status: "PENDING",
                contractorReport: contractorReportUrl
            }
        })

        revalidatePath(`/admin/projects/${projectId}/supervision/ir`)
        return { success: true }
    } catch (error) {
        console.error(error)
        return { error: "Failed to create IR" }
    }
}

export async function updateIRStatus(irId: string, projectId: string, formData: FormData) {
    const user = await checkPermission(projectId, 'APPROVE') // Only Approvers (PM/Admin)

    const status = formData.get("status") as string
    const comments = formData.get("comments") as string

    // For Approval
    const finalFile = formData.get("finalFile") as File

    try {
        const ir = await (db as any).inspectionRequest.findUnique({ where: { id: irId } })
        if (!ir) throw new Error("IR not found")

        let updateData: any = {
            status,
            comments,
            approvedById: (user as any).id
        }

        if (status === "APPROVED" || status === "APPROVED_WITH_COMMENTS") {
            if (!finalFile) return { error: "Final Signed Document is required for approval" }

            // Archive Logic
            const buffer = Buffer.from(await finalFile.arrayBuffer())
            const tenantId = (user as any).tenantId
            // Filename: [OfficeRef] - [Type].pdf
            // We use officeRef from DB
            const archiveRes = await archiveDocument(tenantId, projectId, "IR", ir.officeRef, buffer)

            if (archiveRes.success) {
                updateData.finalDocument = archiveRes.webViewLink
            }
        }

        await (db as any).inspectionRequest.update({
            where: { id: irId },
            data: updateData
        })

        revalidatePath(`/admin/projects/${projectId}/supervision/ir/${irId}`)
        return { success: true }

    } catch (error) {
        console.error(error)
        return { error: "Failed to update status" }
    }
}

export async function resubmitIR(irId: string, projectId: string, formData: FormData) {
    const user = await checkPermission(projectId, 'EDIT')

    const description = formData.get("description") as string
    // Potentially new file?
    const file = formData.get("file") as File

    try {
        const ir = await (db as any).inspectionRequest.findUnique({ where: { id: irId } })

        // 1. Save History
        await (db as any).iRRevision.create({
            data: {
                irId: ir.id,
                revisionNo: ir.revision,
                status: ir.status,
                comments: ir.comments,
                contractorReport: ir.contractorReport,
                reviewerId: ir.approvedById
            }
        })

        // 2. Prepare Updates
        const newRevision = ir.revision + 1
        const newOfficeRef = await generateOfficeRef(projectId, "IR", ir.serial, newRevision)

        let contractorReportUrl = ir.contractorReport
        if (file) {
            // Upload new file logic (similar to create)
            const project = await (db as any).project.findUnique({ where: { id: projectId } })
            if (project?.driveFolderId && !project.driveFolderId.startsWith('mock_')) {
                const tenantId = (user as any).tenantId
                const supervisionId = await ensureProjectSubfolder(tenantId, project.driveFolderId, "03-Supervision")
                if (supervisionId) {
                    const irFolderId = await ensureProjectSubfolder(tenantId, supervisionId, "IR")
                    if (irFolderId) {
                        const pendingId = await ensureProjectSubfolder(tenantId, irFolderId, "Pending")
                        if (pendingId) {
                            const buffer = Buffer.from(await file.arrayBuffer())
                            const upload = await uploadToDrive(tenantId, `${ir.contractorRef || 'NoRef'} - ${file.name}`, buffer, file.type || 'application/pdf', pendingId)
                            contractorReportUrl = upload.webViewLink || contractorReportUrl
                        }
                    }
                }
            }
        }

        // 3. Update IR
        await (db as any).inspectionRequest.update({
            where: { id: irId },
            data: {
                revision: newRevision,
                officeRef: newOfficeRef,
                status: "PENDING",
                comments: null, // Clear comments
                approvedById: null,
                description: description || ir.description,
                contractorReport: contractorReportUrl
            }
        })

        revalidatePath(`/admin/projects/${projectId}/supervision/ir/${irId}`)
        return { success: true }
    } catch (error) {
        console.error(error)
        return { error: "Failed to resubmit IR" }
    }
}
