import { google, drive_v3 } from 'googleapis';
import { Readable } from 'stream';
import { createHash } from 'crypto';
import { db } from "@/lib/db";

// ==========================================
// MULTI-TENANT AUTH & SETTINGS
// ==========================================

export async function getDriveSettings(tenantId: string) {
    if (!tenantId) throw new Error("tenantId is required to fetch Drive settings.");

    // We fetch the drive credentials directly from the isolated Tenant record
    const tenant = await (db as any).tenant.findUnique({ where: { id: tenantId } });

    if (!tenant?.driveClientId || !tenant?.driveClientSecret || !tenant?.driveRefreshToken || !tenant?.driveRootFolderId) {
        throw new Error(`Google Drive OAuth2 credentials are not configured for tenant ${tenant?.name || tenantId}.`);
    }
    return {
        driveClientId: tenant.driveClientId,
        driveClientSecret: tenant.driveClientSecret,
        driveRefreshToken: tenant.driveRefreshToken,
        driveFolderId: tenant.driveRootFolderId,
        companyName: tenant.name || "ERP System"
    };
}

// Map to cache drive instances per tenant ID
const driveCacheMap: Map<string, drive_v3.Drive> = new Map();

export function clearDriveCache(tenantId: string) {
    driveCacheMap.delete(tenantId);
}

export const getDrive = async (tenantId: string): Promise<drive_v3.Drive> => {
    if (!driveCacheMap.has(tenantId)) {
        const { driveClientId, driveClientSecret, driveRefreshToken } = await getDriveSettings(tenantId);
        const oauth2Client = new google.auth.OAuth2(driveClientId, driveClientSecret);
        oauth2Client.setCredentials({ refresh_token: driveRefreshToken });
        // Auto-clear cache if token becomes invalid so next call gets a fresh client
        oauth2Client.on('tokens', (tokens) => {
            if (!tokens.access_token) {
                console.warn(`[Drive] Token refresh yielded no access_token for tenant ${tenantId} — evicting cache`);
                driveCacheMap.delete(tenantId);
            }
        });
        const driveInstance = google.drive({ version: 'v3', auth: oauth2Client });
        driveCacheMap.set(tenantId, driveInstance);
    }
    return driveCacheMap.get(tenantId)!;
};

// ==========================================
// RESILIENCE: EXPONENTIAL BACKOFF
// ==========================================

/**
 * Wraps a Drive API call with exponential backoff.
 * Retries up to `maxRetries` times on 429 (rate limit) or transient 5xx errors.
 */
async function withBackoff<T>(fn: () => Promise<T>, maxRetries = 3, tenantId?: string): Promise<T> {
    let lastError: any;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (err: any) {
            lastError = err;
            const status = err?.response?.status || err?.code;
            // On 401, evict the cached Drive instance so the next attempt gets a fresh OAuth2 client
            if (status === 401 && tenantId) {
                console.warn(`[Drive] 401 Unauthorized for tenant ${tenantId} — evicting drive cache`);
                clearDriveCache(tenantId);
            }
            const isRetryable = status === 429 || status === 500 || status === 503 || status === 401;
            if (!isRetryable || attempt === maxRetries) break;
            const delayMs = Math.pow(2, attempt) * 500 + Math.random() * 100;
            console.warn(`[Drive] Transient error ${status} (attempt ${attempt + 1}). Retrying in ${Math.round(delayMs)}ms...`);
            await new Promise(r => setTimeout(r, delayMs));
        }
    }
    throw lastError;
}

// ==========================================
// CORE: IDEMPOTENT FOLDER ENGINE
// ==========================================

/**
 * Finds a folder by exact name inside a parent. Returns its ID or null.
 */
export async function findFolder(tenantId: string, name: string, parentId: string): Promise<string | null> {
    const drive = await getDrive(tenantId);
    const safeNameForQuery = name.replace(/'/g, "\\'");
    const query = `mimeType='application/vnd.google-apps.folder' and name='${safeNameForQuery}' and '${parentId}' in parents and trashed=false`;

    return withBackoff(async () => {
        const res = await drive.files.list({
            q: query,
            fields: 'files(id, name)',
            spaces: 'drive',
            corpora: 'allDrives',
            supportsAllDrives: true,
            includeItemsFromAllDrives: true
        });
        return res.data.files?.[0]?.id ?? null;
    }, 3, tenantId);
}

/**
 * Idempotent folder creation. Finds first, only creates if not found.
 * This is the SINGLE source of truth for all folder creation.
 */
export async function findOrCreateFolder(tenantId: string, name: string, parentId: string): Promise<string> {
    if (!parentId) throw new Error(`[Drive] Cannot create folder "${name}": parentId is missing.`);

    const existing = await findFolder(tenantId, name, parentId);
    if (existing) return existing;

    const drive = await getDrive(tenantId);
    return withBackoff(async () => {
        const res = await drive.files.create({
            requestBody: {
                name,
                mimeType: 'application/vnd.google-apps.folder',
                parents: [parentId],
            },
            fields: 'id',
            supportsAllDrives: true
        });
        console.log(`[Drive] Created folder: "${name}" in parent: ${parentId}`);
        return res.data.id!;
    }, 3, tenantId);
}

// Alias for backward compatibility
export const createFolder = findOrCreateFolder;

/**
 * Resolves a deep path by walking/creating each segment idempotently.
 */
export async function resolveDrivePath(tenantId: string, pathArray: string[], rootId: string): Promise<string> {
    let currentParentId = rootId;
    for (const folderName of pathArray) {
        const safeName = folderName.trim().replace(/\//g, '-');
        currentParentId = await findOrCreateFolder(tenantId, safeName, currentParentId);
    }
    return currentParentId;
}

// ==========================================
// TASK 1: MASTER ROOT HIERARCHY
// ==========================================

export interface MasterFolderIds {
    projects: string;       // 01 - المشاريع
    clients: string;        // 02 - العملاء
    vendors: string;        // 03 - الموردين
    finance: string;        // 04 - الحسابات العامة
    hr: string;             // 05 - الموارد البشرية
    taxReports: string;     // 06 - التقارير الضريبية
}

/**
 * Ensures the 6 numbered master root folders exist under the ERP root.
 * Idempotent — safe to call on every startup or project creation.
 */
export async function initializeMasterHierarchy(tenantId: string, rootId: string): Promise<MasterFolderIds> {
    const [projects, clients, vendors, finance, hr, taxReports] = await Promise.all([
        findOrCreateFolder(tenantId, '01 - المشاريع (Projects)', rootId),
        findOrCreateFolder(tenantId, '02 - العملاء (Clients Portfolio)', rootId),
        findOrCreateFolder(tenantId, '03 - الموردين ومقاولي الباطن (Vendors & Sub-contractors)', rootId),
        findOrCreateFolder(tenantId, '04 - الحسابات العامة (General Finance)', rootId),
        findOrCreateFolder(tenantId, '05 - الموارد البشرية (HR / Employees)', rootId),
        findOrCreateFolder(tenantId, '06 - التقارير الضريبية (Tax Reports)', rootId),
    ]);

    // Create current-year tax sub-folders: Year → Q1, Q2, Q3, Q4
    const year = new Date().getFullYear().toString();
    const yearFolder = await findOrCreateFolder(tenantId, year, taxReports);
    await Promise.all(['Q1', 'Q2', 'Q3', 'Q4'].map(q => findOrCreateFolder(tenantId, q, yearFolder)));

    return { projects, clients, vendors, finance, hr, taxReports };
}

// ==========================================
// TASK 2: CLIENT FOLDER ENGINE
// ==========================================

export interface ClientFolderMap {
    root: string;
    officialDocs: string;   // 01 - الأوراق الرسمية
    contracts: string;      // 02 - العقود
    invoices: string;       // 03 - الفواتير وكشوفات الحساب
}

/**
 * Creates the numbered 3-folder structure for a client under
 * 02 - العملاء/[Client_Name].
 * Idempotent — safe to call multiple times.
 */
export async function createClientFolders(tenantId: string, clientName: string, rootId: string): Promise<ClientFolderMap> {
    try {
        const { clients } = await initializeMasterHierarchy(tenantId, rootId);
        const safeName = clientName.trim().replace(/[\/\\#%&{}@<>*?$!'":`|=]/g, '-');
        const clientRoot = await findOrCreateFolder(tenantId, safeName, clients);

        const [officialDocs, contracts, invoices] = await Promise.all([
            findOrCreateFolder(tenantId, '01 - الأوراق الرسمية (CR, IDs)', clientRoot),
            findOrCreateFolder(tenantId, '02 - العقود (Contracts)', clientRoot),
            findOrCreateFolder(tenantId, '03 - الفواتير وكشوفات الحساب (Invoices & Statements)', clientRoot),
        ]);

        return { root: clientRoot, officialDocs, contracts, invoices };
    } catch (err) {
        console.error(`[Drive] createClientFolders error for "${clientName}":`, err);
        throw err;
    }
}

// ==========================================
// TASK 2: VENDOR FOLDER ENGINE
// ==========================================

export interface VendorFolderMap {
    root: string;
    vendorDocs: string;     // 01 - أوراق المورد
    subContracts: string;   // 02 - عقود الباطن
    payments: string;       // 03 - الدفعات والفواتير
}

/**
 * Creates the numbered 3-folder structure for a vendor under
 * 03 - الموردين/[Vendor_Name].
 */
export async function createVendorFolders(tenantId: string, vendorName: string, rootId: string): Promise<VendorFolderMap> {
    try {
        const { vendors } = await initializeMasterHierarchy(tenantId, rootId);
        const safeName = vendorName.trim().replace(/[\/\\#%&{}@<>*?$!'":`|=]/g, '-');
        const vendorRoot = await findOrCreateFolder(tenantId, safeName, vendors);

        const [vendorDocs, subContracts, payments] = await Promise.all([
            findOrCreateFolder(tenantId, '01 - أوراق المورد (Tax ID, IBAN)', vendorRoot),
            findOrCreateFolder(tenantId, '02 - عقود الباطن (Sub-contracts)', vendorRoot),
            findOrCreateFolder(tenantId, '03 - الدفعات والفواتير (Payments & Invoices)', vendorRoot),
        ]);

        return { root: vendorRoot, vendorDocs, subContracts, payments };
    } catch (err) {
        console.error(`[Drive] createVendorFolders error for "${vendorName}":`, err);
        throw err;
    }
}

// ==========================================
// TASK 3: SMART PROJECT FOLDER ENGINE
// ==========================================

export interface ProjectFolderMap {
    root: string;
    // ── Blueprint v2 (canonical) ───────────────────────────────
    contractual: string;        // 01 - Contractual Documents (always)
    survey: string;             // 02 - Surveying & Site Data (always)
    projectAccounts: string;    // 03 - Project Accounts — RESTRICTED to Finance (always)
    correspondence: string;     // 04 - Correspondence (always)
    handover: string;           // 08 - Handover & As-Builts (always)
    technical?: string;         // 05 - Technical Drawings (DESIGN or BOTH)
    design?: string;            // 06 - Design Work Files (DESIGN or BOTH)
    supervision?: string;       // 07 - Supervision Hub (SUPERVISION or BOTH)
    // ── Legacy aliases (deprecated — kept for backward compatibility) ──
    info?: string;              // @deprecated → contractual
    financials?: string;        // @deprecated → projectAccounts
    drawings?: string;          // @deprecated → technical
    incoming?: string;          // @deprecated
    outgoing?: string;          // @deprecated
}

interface ProjectFolderOptions {
    serviceType: 'DESIGN' | 'SUPERVISION' | 'BOTH';
    disciplines?: string[];
}

/**
 * THE CORE PROJECT ENGINE — Blueprint v2 (8-folder standard).
 *
 * Always-present folders:
 *   01 - Contractual Documents
 *   02 - Surveying & Site Data
 *   03 - Project Accounts  ← RESTRICTED: Finance roles only
 *   04 - Correspondence
 *   08 - Handover & As-Builts
 *
 * Conditional folders:
 *   05 - Technical Drawings   (DESIGN or BOTH)
 *   06 - Design Work Files    (DESIGN or BOTH)
 *   07 - Supervision Hub      (SUPERVISION or BOTH)
 *
 * Path: 01 - المشاريع / [Brand_Name] / [projectCode] - [projectName]
 *
 * Returns a ProjectFolderMap that should be stored as JSON in Project.driveSubFolderIds.
 */
export async function createProjectFolders(
    tenantId: string,
    brandName: string,
    projectCode: string,
    projectName: string,
    options: ProjectFolderOptions
): Promise<ProjectFolderMap> {
    const { serviceType, disciplines = [] } = options;
    const { driveFolderId: rootId } = await getDriveSettings(tenantId);

    const { projects } = await initializeMasterHierarchy(tenantId, rootId);

    const safeBrand = brandName.trim().replace(/[\/\\#%&{}@<>*?$!'":`|=]/g, '-');
    const brandFolder = await findOrCreateFolder(tenantId, safeBrand, projects);

    const safeProjectName = projectName.trim().replace(/[\/\\#%&{}@<>*?$!'":`|=]/g, '-');
    const projectRoot = await findOrCreateFolder(tenantId, `${projectCode} - ${safeProjectName}`, brandFolder);

    // Always-present folders (created in parallel)
    const [contractual, survey, projectAccounts, correspondence, handover] = await Promise.all([
        findOrCreateFolder(tenantId, '01 - العقود والوثائق التعاقدية (Contractual Documents)', projectRoot),
        findOrCreateFolder(tenantId, '02 - الرفع المساحي والبيانات الميدانية (Surveying & Site Data)', projectRoot),
        findOrCreateFolder(tenantId, '03 - حسابات المشروع (Project Accounts)', projectRoot),
        findOrCreateFolder(tenantId, '04 - المراسلات والخطابات (Correspondence)', projectRoot),
        findOrCreateFolder(tenantId, '08 - التسليم والمخططات النهائية (Handover & As-Builts)', projectRoot),
    ]);

    // Log finance-restricted folder
    console.log(`[Drive] Project Accounts folder (RESTRICTED) created: ${projectAccounts}`);

    const folderMap: ProjectFolderMap = {
        root: projectRoot,
        contractual, survey, projectAccounts, correspondence, handover,
        // Backward-compat aliases
        info: contractual,
        financials: projectAccounts,
    };

    // 05 + 06 — CONDITIONAL: Design
    const hasDesign = serviceType === 'DESIGN' || serviceType === 'BOTH';
    if (hasDesign) {
        const [technical, designRoot] = await Promise.all([
            findOrCreateFolder(tenantId, '05 - المخططات الهندسية (Technical Drawings)', projectRoot),
            findOrCreateFolder(tenantId, '06 - ملفات العمل التصميمية (Design Work Files)', projectRoot),
        ]);

        // Static design sub-folders
        await Promise.all(['Revit', 'AutoCAD', 'Presentation', 'Render'].map(
            sf => findOrCreateFolder(tenantId, sf, designRoot)
        ));

        // Discipline folders under Technical Drawings
        const disciplineMap: Record<string, string> = {
            'ARCH': 'ARCH', 'STR': 'STR', 'ELE': 'Electrical',
            'HVAC': 'HVAC', 'INTERIOR': 'Interior Design', 'LANDSCAPE': 'Landscape'
        };
        if (disciplines.length > 0) {
            await Promise.all(
                disciplines.map(d => findOrCreateFolder(tenantId, disciplineMap[d.toUpperCase()] || d, technical))
            );
        }

        folderMap.technical = technical;
        folderMap.drawings = technical; // compat alias
        folderMap.design = designRoot;
    }

    // 07 — CONDITIONAL: Supervision
    const hasSupervision = serviceType === 'SUPERVISION' || serviceType === 'BOTH';
    if (hasSupervision) {
        const supervisionRoot = await findOrCreateFolder(tenantId, '07 - مركز الإشراف (Supervision Hub)', projectRoot);
        await Promise.all([
            'DSR', 'IR', 'NCR', 'Site Photos', 'Weekly Reports', 'Monthly Reports'
        ].map(sf => findOrCreateFolder(tenantId, sf, supervisionRoot)));
        folderMap.supervision = supervisionRoot;
    }

    return folderMap;
}

// ==========================================
// UPLOAD ENGINE
// ==========================================

export interface UploadResult {
    fileId: string;
    webViewLink: string | null;
    webContentLink: string | null;
}

/**
 * Uploads a file to a specific target folder ID (direct routing).
 * The caller is responsible for resolving the target folder ID from the DB.
 */
export async function uploadToDrive(
    tenantId: string,
    fileName: string,
    fileBuffer: Buffer,
    mimeType: string,
    targetFolderId: string
): Promise<UploadResult> {
    if (!targetFolderId?.trim()) {
        throw new Error(`[Drive] CRITICAL: targetFolderId is missing or invalid. Received: "${targetFolderId}"`);
    }

    const drive = await getDrive(tenantId);
    const stream = Readable.from(fileBuffer);

    return withBackoff(async () => {
        const res = await drive.files.create({
            requestBody: { name: fileName, parents: [targetFolderId] },
            media: { mimeType, body: stream },
            fields: 'id, webViewLink, webContentLink',
            supportsAllDrives: true,
        });

        const fileId = res.data.id!;

        // Make file readable by anyone with the link (for ERP display)
        await drive.permissions.create({
            fileId,
            requestBody: { role: 'reader', type: 'anyone' },
            supportsAllDrives: true,
        });

        return {
            fileId,
            webViewLink: res.data.webViewLink ?? null,
            webContentLink: res.data.webContentLink ?? null,
        };
    });
}

/**
 * Smart path-based upload. Resolves/creates the path then uploads.
 */
export async function uploadSmartFileToDrive(
    tenantId: string,
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    pathArray: string[]
): Promise<UploadResult> {
    const { driveFolderId } = await getDriveSettings(tenantId);
    const targetFolderId = await resolveDrivePath(tenantId, pathArray, driveFolderId);
    return uploadToDrive(tenantId, fileName, fileBuffer, mimeType, targetFolderId);
}

// Alias
export const uploadFileToDrive = (tenantId: string, fileBuffer: Buffer, fileName: string, mimeType: string, targetFolderId: string) =>
    uploadToDrive(tenantId, fileName, fileBuffer, mimeType, targetFolderId);

// ==========================================
// FILE LISTING
// ==========================================

export async function listDriveFiles(tenantId: string, folderId: string) {
    const drive = await getDrive(tenantId);
    try {
        const res = await drive.files.list({
            q: `'${folderId}' in parents and trashed=false`,
            fields: 'files(id, name, webViewLink, iconLink, mimeType, createdTime, size)',
            spaces: 'drive',
            corpora: 'allDrives',
            orderBy: 'createdTime desc',
            supportsAllDrives: true,
            includeItemsFromAllDrives: true
        });
        return res.data.files || [];
    } catch (error) {
        console.error(`[Drive] Error listing files for folder ${folderId}:`, error);
        return [];
    }
}

// ==========================================
// ENGINEERING DOCUMENT CONTROL (EDC)
// ==========================================

export async function moveFileToArchive(tenantId: string, fileId: string, originalName: string, oldVersion: number, newParentFolderId: string) {
    const drive = await getDrive(tenantId);
    const dateStr = new Date().toISOString().split('T')[0];
    const newName = `${originalName}_V${oldVersion}_Archived_${dateStr}`;
    const file = await drive.files.get({ fileId, fields: 'parents' });
    const previousParents = file.data.parents ? file.data.parents.join(',') : '';
    await drive.files.update({
        fileId,
        addParents: newParentFolderId,
        removeParents: previousParents,
        requestBody: { name: newName },
        fields: 'id, parents'
    });
    return true;
}

export async function getEdcDisciplineFolder(tenantId: string, projectId: string, discipline: string): Promise<{ activeId: string, archiveId: string }> {
    const project = await (db as any).project.findUnique({ where: { id: projectId }, include: { brand: true } });
    if (!project) throw new Error('Project not found');

    // Use stored sub-folder IDs if available (new system)
    if (project.driveSubFolderIds) {
        try {
            const folderMap: ProjectFolderMap = JSON.parse(project.driveSubFolderIds);
            const drawingsParent = folderMap.technical || folderMap.drawings || folderMap.design || folderMap.root;
            const activeId = await findOrCreateFolder(tenantId, discipline, drawingsParent);
            const archiveId = await findOrCreateFolder(tenantId, 'Archive_History', activeId);
            return { activeId, archiveId };
        } catch { /* fall through to legacy path */ }
    }

    // Legacy fallback path
    const { driveFolderId: rootId } = await getDriveSettings(tenantId);
    const projectFolderName = `[${project.code}] - ${project.name}`;
    const baseDrawingsPath = ['Projects - المشاريع', project.brand.nameEn, projectFolderName, '5- مخططات'];
    const disciplinePath = [...baseDrawingsPath, discipline];
    const archivePath = [...disciplinePath, 'Archive_History'];
    const activeId = await resolveDrivePath(tenantId, disciplinePath, rootId);
    const archiveId = await resolveDrivePath(tenantId, archivePath, rootId);
    return { activeId, archiveId };
}

export async function getEdcPendingFolder(tenantId: string, projectId: string): Promise<string> {
    const project = await (db as any).project.findUnique({ where: { id: projectId }, include: { brand: true } });
    if (!project) throw new Error('Project not found');

    // Use stored sub-folder IDs first
    if (project.driveSubFolderIds) {
        try {
            const folderMap: ProjectFolderMap = JSON.parse(project.driveSubFolderIds);
            const drawingsParent = folderMap.technical || folderMap.drawings || folderMap.root;
            return findOrCreateFolder(tenantId, 'Pending_Review', drawingsParent);
        } catch { /* fall through */ }
    }

    const { driveFolderId: rootId } = await getDriveSettings(tenantId);
    const projectFolderName = `[${project.code}] - ${project.name}`;
    return resolveDrivePath(tenantId, ['Projects - المشاريع', project.brand.nameEn, projectFolderName, '5- مخططات', 'Pending_Review'], rootId);
}

// ==========================================
// VENDOR SUB-FOLDER (PROJECT ACCOUNTING)
// ==========================================

export async function createVendorSubfolder(tenantId: string, projectDriveFolderId: string, vendorName: string): Promise<string | null> {
    try {
        if (!projectDriveFolderId) return null;
        const safeName = vendorName.trim().replace(/[\/\\#%&{}@<>*?$!'":`|=]/g, '-');
        return await resolveDrivePath(tenantId, ['03 - حسابات المشروع (Project Accounts)', safeName], projectDriveFolderId);
    } catch (error) {
        console.error(`[Drive] createVendorSubfolder error for "${vendorName}":`, error);
        return null;
    }
}

// ==========================================
// BACKWARD COMPATIBILITY EXPORTS
// (Preserved so old actions don't break during migration)
// ==========================================

const getRootFolderId = async (tenantId: string): Promise<string> => {
    const { driveFolderId } = await getDriveSettings(tenantId);
    return driveFolderId;
};

export async function getOrCreatePath(tenantId: string, pathArray: string[], rootFolderId: string): Promise<string> {
    return resolveDrivePath(tenantId, pathArray, rootFolderId);
}

export async function ensureProjectSubfolder(tenantId: string, parentId: string, folderName: string): Promise<string> {
    return findOrCreateFolder(tenantId, folderName, parentId);
}

export async function getEmployeeFolder(tenantId: string, employeeName: string, employeeCode: string): Promise<string> {
    const rootId = await getRootFolderId(tenantId);
    const { hr } = await initializeMasterHierarchy(tenantId, rootId);
    const folderName = `[${employeeCode}] ${employeeName}`;
    return findOrCreateFolder(tenantId, folderName, hr);
}

export async function getFinanceFolder(tenantId: string, year: string, month: string): Promise<string> {
    const rootId = await getRootFolderId(tenantId);
    const { finance } = await initializeMasterHierarchy(tenantId, rootId);
    return resolveDrivePath(tenantId, [year, month], finance);
}

export async function getProjectFolder(tenantId: string, brandName: string, projectCode: string, projectName: string, category: string): Promise<string> {
    const rootId = await getRootFolderId(tenantId);
    const { projects } = await initializeMasterHierarchy(tenantId, rootId);
    const safeBrand = brandName.trim().replace(/[\/\\#%&{}@<>*?$!'":`|=]/g, '-');
    const projectFolderName = `${projectCode} - ${projectName.trim().replace(/[\/\\#%&{}@<>*?$!'":`|=]/g, '-')}`;
    return resolveDrivePath(tenantId, [safeBrand, projectFolderName, category], projects);
}

export async function getSupervisionFolder(tenantId: string, brandName: string, projectCode: string, projectName: string, reportType: string): Promise<string> {
    const rootId = await getRootFolderId(tenantId);
    const { projects } = await initializeMasterHierarchy(tenantId, rootId);
    const safeBrand = brandName.trim().replace(/[\/\\#%&{}@<>*?$!'":`|=]/g, '-');
    const projectFolderName = `${projectCode} - ${projectName.trim().replace(/[\/\\#%&{}@<>*?$!'":`|=]/g, '-')}`;
    return resolveDrivePath(tenantId, [safeBrand, projectFolderName, '08 - الإشراف', reportType], projects);
}

/** @deprecated Use createProjectFolders() instead */
export async function initializeBrandStructure(tenantId: string, brandName: string): Promise<string> {
    const rootId = await getRootFolderId(tenantId);
    const { projects } = await initializeMasterHierarchy(tenantId, rootId);
    const safeBrand = brandName.trim().replace(/[\/\\#%&{}@<>*?$!'":`|=]/g, '-');
    return findOrCreateFolder(tenantId, safeBrand, projects);
}

/** @deprecated Use createProjectFolders() instead */
export async function initializeProjectStructure(tenantId: string, brandName: string, projectCode: string, projectName: string, serviceType: string = 'DESIGN'): Promise<string> {
    const type = (serviceType === 'SUPERVISION' || serviceType === 'BOTH' || serviceType === 'DESIGN')
        ? serviceType as 'DESIGN' | 'SUPERVISION' | 'BOTH'
        : 'DESIGN';
    const map = await createProjectFolders(tenantId, brandName, projectCode, projectName, { serviceType: type });
    return map.root;
}

/** @deprecated Use initializeMasterHierarchy() for employee folder under hr master */
export async function initializeEmployeeDriveStructure(tenantId: string, branchName: string, employeeName: string): Promise<string> {
    const rootId = await getRootFolderId(tenantId);
    const { hr } = await initializeMasterHierarchy(tenantId, rootId);
    const employeeFolderId = await resolveDrivePath(tenantId, [branchName, employeeName], hr);
    await Promise.all([
        findOrCreateFolder(tenantId, 'الأوراق الرسمية', employeeFolderId),
        findOrCreateFolder(tenantId, 'الإجازات والتقارير الطبية', employeeFolderId),
        findOrCreateFolder(tenantId, 'القروض والعمليات المالية', employeeFolderId),
    ]);
    return employeeFolderId;
}

export async function getResumableSessionURI(tenantId: string, parentFolderId: string, fileName: string, mimeType: string): Promise<string> {
    const drive = await getDrive(tenantId);
    const res = await drive.files.create({
        requestBody: { name: fileName, parents: [parentFolderId] },
        media: { mimeType },
        fields: 'id',
    }, {
        options: { url: 'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable' },
    } as any);

    const location = res.headers?.location;
    if (!location) throw new Error('Failed to generate Google Drive Resumable Upload Session URI.');
    return location;
}

// Path generator helpers (backward compat)
export async function getProjectDrivePath(brandName: string, projectCode: string, projectName: string, subFolders: string[] = []): Promise<string[]> {
    return ['01 - المشاريع (Projects)', brandName, `${projectCode} - ${projectName}`, ...subFolders];
}

export async function getEmployeeDrivePath(branchName: string, employeeName: string): Promise<string[]> {
    return ['05 - الموارد البشرية (HR / Employees)', branchName, employeeName];
}

export async function getFinanceDrivePath(brandName: string, expenseCategory: string, year: string, month: string): Promise<string[]> {
    const cleanCategory = expenseCategory.includes('Project') ? 'Project Expenses - مصاريف مشاريع' : 'General Expenses - مصاريف عامة';
    return ['04 - الحسابات العامة (General Finance)', brandName, cleanCategory, `${year}-${month}`];
}

// ==========================================
// PILLAR 2: INTELLIGENT DOCUMENT MANAGEMENT
// ==========================================

/**
 * Generates a standardized file name following the ERP naming convention:
 * [ProjectCode]-[CATEGORY]-[DocType]-[YYYY-MM-DD]-V[N]
 */
export function generateSmartFileName(
    projectCode: string,
    category: string,
    docType: string,
    version = 1
): string {
    const date = new Date().toISOString().split('T')[0];
    const safeCategory = category.replace(/[^A-Za-z0-9_-]/g, '_').toUpperCase();
    const safeDocType = docType.replace(/[^A-Za-z0-9_-]/g, '_');
    return `${projectCode}-${safeCategory}-${safeDocType}-${date}-V${version}`;
}

/**
 * Computes an MD5 hash of a file buffer for duplicate detection.
 */
export function computeFileHash(buffer: Buffer): string {
    return createHash('md5').update(buffer).digest('hex');
}

/**
 * Checks whether a file with the same MD5 hash already exists in the target folder.
 * Uses Drive's `appProperties` metadata field to store/query the hash.
 * Returns non-blocking: on any Drive error, returns { isDuplicate: false }.
 */
export async function checkFileDuplicate(
    tenantId: string,
    folderId: string,
    hash: string
): Promise<{ isDuplicate: boolean; fileId?: string; fileName?: string; version?: number }> {
    try {
        const drive = await getDrive(tenantId);
        const res = await drive.files.list({
            q: `'${folderId}' in parents and trashed=false and appProperties has { key='fileHash' and value='${hash}' }`,
            fields: 'files(id, name, appProperties)',
            spaces: 'drive',
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
        });
        const files = res.data.files || [];
        if (files.length > 0) {
            const f = files[0];
            return {
                isDuplicate: true,
                fileId: f.id!,
                fileName: f.name!,
                version: parseInt((f.appProperties as any)?.version || '1', 10),
            };
        }
        return { isDuplicate: false };
    } catch {
        return { isDuplicate: false };
    }
}

export interface UploadWithMetaResult extends UploadResult {
    isDuplicate: boolean;
    suggestedVersion: number;
    existingFileId?: string;
}

/**
 * Uploads a file to Drive with MD5 duplicate detection and metadata tagging.
 * If the exact file (by hash) already exists in the folder, returns isDuplicate=true
 * and suggestedVersion = existing version + 1 — without uploading again.
 */
export async function uploadToDriveWithMeta(
    tenantId: string,
    fileName: string,
    fileBuffer: Buffer,
    mimeType: string,
    targetFolderId: string,
    options?: { projectCode?: string; category?: string; skipDuplicateCheck?: boolean }
): Promise<UploadWithMetaResult> {
    if (!targetFolderId?.trim()) {
        throw new Error(`[Drive] uploadToDriveWithMeta: targetFolderId is missing. Received: "${targetFolderId}"`);
    }

    const hash = computeFileHash(fileBuffer);

    if (!options?.skipDuplicateCheck) {
        const dup = await checkFileDuplicate(tenantId, targetFolderId, hash);
        if (dup.isDuplicate) {
            console.log(`[Drive] Duplicate file detected: "${dup.fileName}" — skipping upload.`);
            return {
                fileId: dup.fileId!,
                webViewLink: null,
                webContentLink: null,
                isDuplicate: true,
                suggestedVersion: (dup.version || 1) + 1,
                existingFileId: dup.fileId,
            };
        }
    }

    const drive = await getDrive(tenantId);
    const stream = Readable.from(fileBuffer);

    return withBackoff(async () => {
        const res = await drive.files.create({
            requestBody: {
                name: fileName,
                parents: [targetFolderId],
                appProperties: {
                    fileHash: hash,
                    version: '1',
                    uploadedAt: new Date().toISOString(),
                    ...(options?.projectCode ? { projectCode: options.projectCode } : {}),
                    ...(options?.category ? { category: options.category } : {}),
                },
            },
            media: { mimeType, body: stream },
            fields: 'id, webViewLink, webContentLink',
            supportsAllDrives: true,
        });

        const fileId = res.data.id!;
        await drive.permissions.create({
            fileId,
            requestBody: { role: 'reader', type: 'anyone' },
            supportsAllDrives: true,
        });

        return {
            fileId,
            webViewLink: res.data.webViewLink ?? null,
            webContentLink: res.data.webContentLink ?? null,
            isDuplicate: false,
            suggestedVersion: 1,
        };
    }, 3, tenantId);
}

// ==========================================
// PILLAR 3: RBAC DRIVE PERMISSIONS
// ==========================================

const FINANCE_ROLES_DRIVE = ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'GLOBAL_SUPER_ADMIN'] as const;
const FINANCE_ONLY_FOLDER_TYPES: Array<keyof ProjectFolderMap> = ['projectAccounts', 'financials'];

/**
 * Returns true if the given user role is permitted to access a given folder type.
 * GLOBAL_SUPER_ADMIN always has access.
 * Finance-restricted folders (projectAccounts) require a Finance role.
 */
export function canAccessDriveFolder(userRole: string, folderType: keyof ProjectFolderMap): boolean {
    if (userRole === 'GLOBAL_SUPER_ADMIN') return true;
    if (FINANCE_ONLY_FOLDER_TYPES.includes(folderType)) {
        return (FINANCE_ROLES_DRIVE as readonly string[]).includes(userRole);
    }
    return true;
}

/**
 * Resolves a folder ID from a stored ProjectFolderMap JSON string given a folder type key.
 * Falls back to root if the key is not present.
 */
export function getProjectSubfolder(folderMapJson: string, key: keyof ProjectFolderMap): string | null {
    try {
        const map: ProjectFolderMap = JSON.parse(folderMapJson);
        return (map[key] as string | undefined) ?? map.root ?? null;
    } catch {
        return null;
    }
}

// ==========================================
// PILLAR 4: CROSS-MODULE AUTO-ARCHIVING
// ==========================================

/**
 * Archives all uploaded invoice proof images for a closed custody into
 * the project's 03 - Project Accounts folder on Google Drive.
 * Non-blocking: errors are logged but never thrown.
 */
export async function archiveCustodySettlementToDrive(
    tenantId: string,
    requestId: string,
    projectId: string | null,
    items: Array<{
        id: string;
        invoicePhotoUrl: string | null;
        description: string | null;
        amount: number;
    }>
): Promise<void> {
    if (!projectId) return;

    try {
        const project = await (db as any).project.findUnique({
            where: { id: projectId },
            select: { driveSubFolderIds: true, code: true, name: true },
        });
        if (!project?.driveSubFolderIds) return;

        const folderMap: ProjectFolderMap = JSON.parse(project.driveSubFolderIds);
        const accountsFolderId = folderMap.projectAccounts || folderMap.financials;
        if (!accountsFolderId) return;

        // Dedicated sub-folder per custody
        const custodyFolderName = `Custody-${requestId.slice(-6).toUpperCase()}-${new Date().toISOString().split('T')[0]}`;
        const custodyFolder = await findOrCreateFolder(tenantId, custodyFolderName, accountsFolderId);

        const archiveTasks = items
            .filter(item => item.invoicePhotoUrl)
            .map(async (item, idx) => {
                try {
                    const response = await fetch(item.invoicePhotoUrl!);
                    if (!response.ok) return;
                    const buffer = Buffer.from(await response.arrayBuffer());
                    const mimeType = response.headers.get('content-type') || 'image/jpeg';
                    const ext = mimeType.split('/')[1]?.split(';')[0] || 'jpg';
                    const smartName = generateSmartFileName(project.code, 'PETTY_CASH', `Invoice-${idx + 1}`) + `.${ext}`;
                    await uploadToDriveWithMeta(tenantId, smartName, buffer, mimeType, custodyFolder, {
                        projectCode: project.code,
                        category: 'PETTY_CASH',
                    });
                } catch (itemErr) {
                    console.warn(`[Drive] Failed to archive custody item ${item.id}:`, itemErr);
                }
            });

        await Promise.allSettled(archiveTasks);
        console.log(`[Drive] Custody ${requestId} archived ${items.filter(i => i.invoicePhotoUrl).length} invoice(s) to folder ${custodyFolder}`);
    } catch (err) {
        // Non-blocking: custody closure must not fail if Drive is unavailable
        console.error(`[Drive] archiveCustodySettlementToDrive non-blocking error for ${requestId}:`, err);
    }
}

/**
 * Returns the DSR (Daily Site Report) archive folder ID for a project.
 * Uses the stored supervision hub folder from ProjectFolderMap if available,
 * otherwise falls back to the legacy path.
 * Returns null if Drive is not configured or the project is not found.
 */
export async function getDsrArchiveFolder(tenantId: string, projectId: string): Promise<string | null> {
    try {
        const project = await (db as any).project.findUnique({
            where: { id: projectId },
            include: { brand: true },
        });
        if (!project) return null;

        if (project.driveSubFolderIds) {
            try {
                const folderMap: ProjectFolderMap = JSON.parse(project.driveSubFolderIds);
                if (folderMap.supervision) {
                    return findOrCreateFolder(tenantId, 'DSR', folderMap.supervision);
                }
            } catch { /* fall through to legacy */ }
        }

        // Legacy fallback
        return getSupervisionFolder(
            tenantId,
            project.brand?.nameEn || 'General',
            project.code,
            project.name,
            'Daily site Report'
        );
    } catch (err) {
        console.error(`[Drive] getDsrArchiveFolder error for project ${projectId}:`, err);
        return null;
    }
}
