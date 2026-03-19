import { db } from "./db";
import { ensureProjectSubfolder, uploadToDrive } from "./google-drive";

export type DocType = "DSR" | "IR" | "NCR";

/**
 * Generates an Office Reference code for a document.
 * Format: [Brand]-[ProjectCode]-[DocType]-[Serial]-[Rev]
 */
export async function generateOfficeRef(projectId: string, type: DocType, serial: number, revision: number = 0) {
    const project = await (db as any).project.findUnique({
        where: { id: projectId },
        include: { brand: true }
    });

    if (!project) throw new Error("Project not found");

    const brandCode = project.brand.shortName || project.brand.nameEn.substring(0, 3).toUpperCase();
    const projectCode = project.code; // e.g., SUD-2026-001
    const serialStr = serial.toString().padStart(3, '0');
    const revStr = revision.toString().padStart(2, '0');

    // Logic for office code: [Brand]-[ProjectCode]-[DocType]-[Serial]-[Rev]
    // Example: SUD-SUD-2026-001-DSR-001-00
    return `${brandCode}-${projectCode}-${type}-${serialStr}-${revStr}`;
}

/**
 * Assigns a serial number to a document if it doesn't have one.
 */
export async function getNextSerial(projectId: string, type: DocType) {
    let lastDoc;
    if (type === "DSR") {
        lastDoc = await (db as any).dailyReport.findFirst({
            where: { projectId },
            orderBy: { serial: 'desc' }
        });
    } else if (type === "IR") {
        lastDoc = await (db as any).inspectionRequest.findFirst({
            where: { projectId },
            orderBy: { serial: 'desc' }
        });
    } else if (type === "NCR") {
        lastDoc = await (db as any).nCR.findFirst({
            where: { projectId },
            orderBy: { serial: 'desc' }
        });
    }

    return (lastDoc?.serial || 0) + 1;
}

/**
 * Handles the archiving of a finalized document to Google Drive.
 * Path: [Client]/[ProjectCode]/03-Supervision/[DocType]/
 */
export async function archiveDocument(tenantId: string, projectId: string, type: DocType, officeRef: string, pdfBuffer: Buffer) {
    const project = await (db as any).project.findUnique({
        where: { id: projectId }
    });

    if (!project) throw new Error("Project not found");

    // Root Project Folder (assumed created during project creation or ensured here)
    let parentId = project.driveFolderId;
    if (!parentId || parentId.startsWith('mock_')) {
        // In a real scenario, we'd ensure the root folder exists. 
        // For this implementation, we'll try to use ensureProjectSubfolder or similar if we had a ROOT_ID
        // For now, let's assume we use the mock or log a warning.
        console.warn(`Project ${project.code} has no real Drive Folder. Using mock logic.`);
        return { success: false, error: "No real Drive folder configured" };
    }

    // Path structure: 03-Supervision -> [DocType]
    const supervisionFolderId = await ensureProjectSubfolder(tenantId, parentId, "03-Supervision");
    if (!supervisionFolderId) return { success: false, error: "Failed to access Supervision folder on Drive" };

    const docTypeFolderId = await ensureProjectSubfolder(tenantId, supervisionFolderId, type);
    if (!docTypeFolderId) return { success: false, error: `Failed to access ${type} folder on Drive` };

    // Upload to Drive with Office Ref as filename
    const filename = `${officeRef}.pdf`;
    const result = await uploadToDrive(tenantId, filename, pdfBuffer, "application/pdf", docTypeFolderId);

    return { success: true, folderId: docTypeFolderId, fileId: result.fileId, webViewLink: result.webViewLink };
}
