/**
 * Drive Upload Router
 * ------------------------------------------------------------------
 * Provides direct folder ID routing for file uploads based on the
 * entity type and file category.
 *
 * SECURITY: All fallbacks now resolve the tenant's own Drive root —
 * never another tenant's. tenantId is always fetched from the DB
 * record and passed to getDriveSettings().
 */

import { db } from "@/lib/db"
import { getDriveSettings } from "@/lib/google-drive"
import type { ProjectFolderMap } from "@/lib/google-drive"

export type ProjectUploadCategory =
    | 'info'            // 01 - معلومات المشروع
    | 'survey'          // 02 - الرفع المساحي
    | 'financials'      // 03 - حسابات المشروع
    | 'correspondence'  // 04 - المراسلات
    | 'drawings'        // 05 - مخططات
    | 'incoming'        // 06 - الواردات من المالك
    | 'outgoing'        // 07 - الصادرات
    | 'supervision'     // 08 - الإشراف
    | 'design'          // 09 - ملفات العمل (التصميم)
    | 'root'            // Project root folder

export type ClientUploadCategory = 'officialDocs' | 'contracts' | 'invoices' | 'root'
export type VendorUploadCategory = 'vendorDocs' | 'subContracts' | 'payments' | 'root'

// ──────────────────────────────────────────────────────────────────
// PROJECT UPLOAD ROUTER
// ──────────────────────────────────────────────────────────────────

/**
 * Returns the specific Google Drive folder ID for uploading a file
 * to a given project category. Falls back through:
 * 1. driveSubFolderIds JSON map (new smart system)
 * 2. driveFolderId (project root / legacy)
 * 3. Tenant's Drive root (last resort — tenant-isolated)
 */
export async function getProjectUploadFolderId(
    projectId: string,
    category: ProjectUploadCategory = 'root'
): Promise<string> {
    const project = await (db as any).project.findUnique({
        where: { id: projectId },
        select: { tenantId: true, driveFolderId: true, driveSubFolderIds: true }
    })

    if (!project) throw new Error(`Project not found: ${projectId}`)

    // Use JSON sub-folder map if available
    if (project.driveSubFolderIds) {
        try {
            const folderMap: ProjectFolderMap = JSON.parse(project.driveSubFolderIds)
            const folderId = folderMap[category]
            if (folderId) return folderId
        } catch {
            console.warn(`[DriveRouter] Failed to parse driveSubFolderIds for project ${projectId}`)
        }
    }

    // Fall back to root project folder
    if (project.driveFolderId && !project.driveFolderId.startsWith('mock_')) {
        return project.driveFolderId
    }

    // Last resort: use the tenant's own Drive root (never cross-tenant)
    const { driveFolderId } = await getDriveSettings(project.tenantId)
    return driveFolderId
}

// ──────────────────────────────────────────────────────────────────
// CLIENT UPLOAD ROUTER
// ──────────────────────────────────────────────────────────────────

/**
 * Returns the Drive folder ID for uploading to a client's specific category.
 * Falls back to the tenant's own Drive root — never cross-tenant.
 */
export async function getClientUploadFolderId(
    clientId: string,
    _category: ClientUploadCategory = 'root'
): Promise<string> {
    const client = await (db as any).client.findUnique({
        where: { id: clientId },
        select: { tenantId: true, driveFolderId: true }
    })

    if (!client) throw new Error(`Client not found: ${clientId}`)

    if (client.driveFolderId) return client.driveFolderId

    // Fallback to this tenant's Drive root
    const { driveFolderId } = await getDriveSettings(client.tenantId)
    return driveFolderId
}

// ──────────────────────────────────────────────────────────────────
// VENDOR UPLOAD ROUTER
// ──────────────────────────────────────────────────────────────────

/**
 * Returns the Drive folder ID for uploading to a vendor's specific category.
 * Falls back to the tenant's own Drive root — never cross-tenant.
 */
export async function getVendorUploadFolderId(
    vendorId: string,
    _category: VendorUploadCategory = 'root'
): Promise<string> {
    const vendor = await (db as any).vendor.findUnique({
        where: { id: vendorId },
        select: { tenantId: true, driveFolderId: true }
    })

    if (!vendor) throw new Error(`Vendor not found: ${vendorId}`)

    if (vendor.driveFolderId) return vendor.driveFolderId

    // Fallback to this tenant's Drive root
    const { driveFolderId } = await getDriveSettings(vendor.tenantId)
    return driveFolderId
}
