'use server'

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { checkPermission, hasPermission } from "@/lib/rbac"
import { revalidatePath } from "next/cache"

export async function createAndAssignContractor(projectId: string, data: any) {
    const session = await auth()
    const canWrite = await checkPermission('PROJECTS', 'write')
    if (!canWrite) return { error: "Unauthorized" }

    try {
        // 1. Create Contractor
        const contractor = await (db as any).contractor.create({
            data: {
                companyName: data.companyName,
                contactPerson: data.contactPerson,
                phone: data.phone,
                email: data.email,
                specialty: data.specialty,
                crNumber: data.crNumber,
                // contactInfo: `${data.contactPerson} - ${data.phone}`, // Legacy sync
            }
        })

        // 2. Assign to Project
        await (db as any).projectContractor.create({
            data: {
                projectId,
                contractorId: contractor.id,
                startDate: data.startDate ? new Date(data.startDate) : new Date(),
                durationDays: parseInt(data.durationDays) || 0,
                contractValue: parseFloat(data.contractValue) || 0
            }
        })

        revalidatePath(`/admin/projects/${projectId}`)
        return { success: true, contractor }
    } catch (e: any) {
        console.error("Create Contractor Error:", e)
        return { error: e.message || "Failed to create contractor" }
    }
}

export async function getProjectContractors(projectId: string) {
    // Public read or restricted? Assuming internal view
    const session = await auth()
    if (!session) return []

    try {
        const links = await (db as any).projectContractor.findMany({
            where: { projectId },
            include: {
                contractor: true
            }
        })

        return links.map((l: any) => ({
            ...l.contractor,
            joinedAt: l.startDate,
            contractValue: l.contractValue
        }))
    } catch (e) {
        console.error("Fetch Contractors Error:", e)
        return []
    }
}

// ----------------------------------------------------------------------
// Project Contractor Management
// ----------------------------------------------------------------------

export async function addContractorToProject(projectId: string, formData: FormData) {
    const session = await auth()
    const canWrite = await checkPermission('PROJECTS', 'write')
    if (!canWrite) return { error: "Unauthorized" }

    const contractorId = formData.get("contractorId") as string
    const contractValue = parseFloat(formData.get("contractValue") as string) || 0
    const durationDays = parseInt(formData.get("durationDays") as string) || 0
    const startDate = formData.get("startDate") ? new Date(formData.get("startDate") as string) : new Date()

    if (!contractorId) return { error: "Contractor is required" }

    try {
        // Check if already assigned
        const exists = await (db as any).projectContractor.findUnique({
            where: {
                projectId_contractorId: {
                    projectId,
                    contractorId
                }
            }
        })

        if (exists) return { error: "Contractor already assigned to this project" }

        await (db as any).projectContractor.create({
            data: {
                projectId,
                contractorId,
                contractValue,
                durationDays,
                startDate
            }
        })

        revalidatePath(`/admin/projects/${projectId}`)
        return { success: true }
    } catch (e: any) {
        console.error("Assign Contractor Error:", e)
        return { error: "Failed to assign contractor: " + e.message }
    }
}

export async function removeContractorFromProject(projectId: string, contractorId: string) {
    const session = await auth()
    const canWrite = await checkPermission('PROJECTS', 'write')
    if (!canWrite) return { error: "Unauthorized" }

    try {
        await (db as any).projectContractor.delete({
            where: {
                projectId_contractorId: {
                    projectId,
                    contractorId
                }
            }
        })

        revalidatePath(`/admin/projects/${projectId}`)
        return { success: true }
    } catch (e: any) {
        console.error("Remove Contractor Error:", e)
        return { error: "Failed to remove contractor" }
    }
}

export async function getProjectFinancialDocuments(projectId: string) {
    const canRead = await checkPermission('FINANCE', 'read')
    if (!canRead) return { error: "Unauthorized" }

    // Placeholder for Google Drive or related DB fetching
    return { files: [] }
}

// ----------------------------------------------------------------------
// Google Drive Utilities
// ----------------------------------------------------------------------
export async function generateDriveLinkForProject(projectId: string) {
    const session = await auth()
    const canWrite = await checkPermission('PROJECTS', 'write')
    if (!canWrite) return { error: "Unauthorized" }

    try {
        const project = await (db as any).project.findUnique({
            where: { id: projectId },
            include: { brand: true }
        })

        if (!project) return { error: "Project not found" }

        const { initializeProjectStructure, initializeBrandStructure, getDriveSettings } = await import('@/lib/google-drive')
        const tenantId = (session?.user as any).tenantId

        try {
            await getDriveSettings(tenantId)
        } catch (e) {
            return { error: "Google Drive is not configured properly" }
        }

        const brandName = project.brand?.nameEn || "DefaultBrand"
        await initializeBrandStructure(tenantId, brandName)
        const folderId = await initializeProjectStructure(tenantId, brandName, project.code, project.name, project.serviceType);
        const link = `https://drive.google.com/drive/folders/${folderId}`

        await (db as any).project.update({
            where: { id: projectId },
            data: {
                driveFolderId: folderId,
                driveLink: link
            }
        })

        revalidatePath(`/admin/projects/${projectId}`)
        return { success: true, link }

    } catch (e: any) {
        console.error("Generate Drive Link Error:", e)
        return { error: e.message || "Failed to generate Drive link" }
    }
}

// ----------------------------------------------------------------------
export async function generateAllMissingDriveFolders() {
    const canManageDrive = await hasPermission('projects', 'canAccessDrive')
    const session = await auth()
    const isSuperAdmin = session?.user && ((session.user as any).role === 'SUPER_ADMIN' || (session.user as any).role === 'ADMIN')

    if (!canManageDrive && !isSuperAdmin) return { error: "Unauthorized" }

    try {
        const projects = await (db as any).project.findMany({
            include: { brand: true }
        })

        if (!projects || projects.length === 0) return { success: true, count: 0 }

        const { initializeProjectStructure, initializeBrandStructure, getDriveSettings } = await import('@/lib/google-drive')
        const tenantId = (session?.user as any).tenantId

        try {
            await getDriveSettings(tenantId)
        } catch (e) {
            return { error: "Google Drive is not configured properly" }
        }

        let successCount = 0;
        let errors = [];

        for (const project of projects) {
            try {
                const brandName = project.brand?.nameEn || "DefaultBrand"
                await initializeBrandStructure(tenantId, brandName)
                const folderId = await initializeProjectStructure(tenantId, brandName, project.code, project.name, project.serviceType);
                const link = `https://drive.google.com/drive/folders/${folderId}`

                await (db as any).project.update({
                    where: { id: project.id },
                    data: {
                        driveFolderId: folderId,
                        driveLink: link
                    }
                })
                successCount++;
            } catch (err: any) {
                console.error(`Error generating folder for project ${project.id}:`, err)
                errors.push(`Failed for project ${project.code}: ${err.message}`)
            }
        }

        return { success: true, count: successCount, errors: errors.length > 0 ? errors : undefined }

    } catch (e: any) {
        console.error("Batch Generate Drive Link Error:", e)
        return { error: e.message || "Failed to batch generate Drive links" }
    }
}

// ----------------------------------------------------------------------
export async function getProjectLiveFiles(projectId: string) {
    const session = await auth()
    if (!session) return { error: "Unauthorized" }

    try {
        const project = await (db as any).project.findUnique({
            where: { id: projectId },
            include: { engineers: true }
        })

        if (!project || !project.driveFolderId || project.driveFolderId.startsWith('mock_')) {
            return { files: [] } // No real drive configured
        }

        const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes((session?.user as any)?.role)
        const isAssigned = project.engineers.some((e: any) => e.id === session?.user?.id) || project.leadEngineerId === session?.user?.id

        if (!isAdmin && !isAssigned) {
            return { files: [] } // Zero-Trust: Do not expose file metadata to unauthorized users
        }

        const { getDrive } = await import('@/lib/google-drive')
        const tenantId = (session?.user as any).tenantId
        const drive = await getDrive(tenantId)

        // Fetch files inside this project, maybe limiting to top level or recursive depending on needs
        // We will fetch up to 100 recent files modified/created inside this project's tree.
        // Google Drive API query syntax: `'folderId' in parents`
        // To search recursively, it's more complex, but usually clients want the recent activity anywhere in the project.
        // A simple query for recent files where the project folder is an ancestor requires a custom approach or searching by name.
        // For simplicity and speed, let's fetch files directly inside the root project folder, and perhaps 1 level deep.
        // Or we can just fetch the most recent files uploaded by our app (we could tag them or just list children).
        // Let's do a basic list of files within the Drive folder.

        const res = await drive.files.list({
            q: `'${project.driveFolderId}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed = false`,
            fields: 'files(id, name, mimeType, createdTime, size)',
            orderBy: 'createdTime desc',
            pageSize: 50
        })

        const files = (res.data.files || []).map(f => {
            let type = "File"
            if (f.mimeType?.includes('pdf')) type = "PDF"
            else if (f.mimeType?.includes('image')) type = "Image"
            else if (f.mimeType?.includes('spreadsheet') || f.name?.endsWith('.xlsx') || f.name?.endsWith('.csv')) type = "Excel"
            else if (f.mimeType?.includes('document') || f.name?.endsWith('.docx')) type = "Word"
            else if (f.name?.endsWith('.dwg') || f.name?.endsWith('.cad')) type = "CAD"

            // Format size
            let sizeStr = "Unknown"
            if (f.size) {
                const bytes = parseInt(f.size)
                if (bytes > 1024 * 1024) sizeStr = (bytes / (1024 * 1024)).toFixed(1) + " MB"
                else sizeStr = (bytes / 1024).toFixed(0) + " KB"
            }

            return {
                id: f.id,
                name: f.name,
                type,
                size: sizeStr,
                date: f.createdTime ? new Date(f.createdTime).toLocaleDateString() : "Unknown",
                link: `/api/files/download?fileId=${f.id}&type=PROJECT&entityId=${projectId}`
            }
        })

        return { success: true, files }
    } catch (e: any) {
        console.error("Fetch Live Files Error:", e)
        return { error: "Failed to fetch live files from Drive" }
    }
}
