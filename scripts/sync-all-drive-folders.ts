/**
 * One-off admin script: backfill Google Drive folder structure for all projects and employees.
 * Run with: npx tsx scripts/sync-all-drive-folders.ts
 *
 * Requires: GOOGLE_DRIVE_* env vars or tenant-level Drive credentials in DB.
 */
import { PrismaClient } from "@prisma/client";
import {
    resolveDrivePath,
    initializeEmployeeDriveStructure,
    createProjectFolders,
    getDriveSettings,
} from "../src/lib/google-drive";

const prisma = new PrismaClient();

async function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function syncProjects() {
    console.log("\n--- SYNCING PROJECTS ---");
    const projects = await (prisma as any).project.findMany({ include: { brand: true } });
    console.log(`Found ${projects.length} projects to sync.`);

    for (const project of projects) {
        try {
            const tenantId = project.tenantId;
            if (!tenantId) { console.warn(`  ! Skipping ${project.name}: no tenantId`); continue; }

            console.log(`Syncing project: ${project.name} (${project.code})`);
            const brandName = project.brand?.nameEn || 'General';
            const serviceType = (project.serviceType as 'DESIGN' | 'SUPERVISION' | 'BOTH') || 'DESIGN';

            const folderMap = await createProjectFolders(tenantId, brandName, project.code, project.name, { serviceType });

            const driveLink = `https://drive.google.com/drive/folders/${folderMap.root}`;
            await (prisma as any).project.update({
                where: { id: project.id },
                data: {
                    driveFolderId: folderMap.root,
                    driveLink,
                    driveSubFolderIds: JSON.stringify(folderMap),
                }
            });

            console.log(`  ✓ Synced ${project.name} → ${folderMap.root}`);
            await delay(1000);
        } catch (error: any) {
            console.error(`  X Error syncing project ${project.name}:`, error.message);
        }
    }
}

async function syncEmployees() {
    console.log("\n--- SYNCING EMPLOYEES ---");
    const employees = await (prisma as any).employeeProfile.findMany({ include: { user: true } });
    console.log(`Found ${employees.length} employees to sync.`);

    for (const emp of employees) {
        try {
            if (!emp.user) continue;
            const tenantId = emp.user.tenantId;
            if (!tenantId) { console.warn(`  ! Skipping ${emp.user.name}: no tenantId`); continue; }

            console.log(`Syncing employee: ${emp.user.name}`);
            const branchName = "Head Office";
            const employeeName = emp.user.name || 'Unknown Employee';
            await initializeEmployeeDriveStructure(tenantId, branchName, employeeName);
            console.log(`  ✓ Synced HR folders for ${emp.user.name}`);
            await delay(1000);
        } catch (error: any) {
            console.error(`  X Error syncing employee ${emp.user?.name}:`, error.message);
        }
    }
}

async function main() {
    try {
        console.log("Starting System-Wide Google Drive Sync...");
        await syncProjects();
        await syncEmployees();
        console.log("\n=== SYNC COMPLETE ===");
    } catch (e: any) {
        console.error("Critical Sync Error:", e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
