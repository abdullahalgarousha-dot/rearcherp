import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"
import { seedRoles } from "../../prisma/seed-roles"
import { seedDemoTenant } from "../lib/demo-seeder"

const prisma = new PrismaClient()

async function main() {
    console.log("🚀 INFRASTRUCTURE PURGE: Starting System Deep Clean...")

    // 1. TERMINATE ORPHAN DATA (Surgical Wipe)
    console.log("🧹 Wiping orphan records (missing valid tenantId)...")

    const modelsToScrub = [
        'User', 'Project', 'Client', 'Vendor', 'Role', 'Branch', 'Brand',
        'AuditLog', 'InAppNotification', 'FileComment', 'DrawingRevision', 'Drawing',
        'SubContract', 'VariationOrder', 'PettyCashRequest', 'Invoice', 'Expense',
        'Notification', 'Contractor', 'TimeLog', 'DailyReport', 'NCR', 'InspectionRequest',
        'MaterialSubmittal', 'Attendance', 'SystemLog', 'Task', 'LeaveRequest',
        'DesignStage', 'DesignStageFile', 'LoanRequest', 'DocumentRequest', 'Complaint',
        'EmployeeHRStats', 'Penalty', 'Loan', 'SalarySlip', 'CompanyEvent', 'MenuLink',
        'IRRevision', 'NCRRevision', 'CompanyProfile', 'SystemSetting', 'SystemLookup'
    ]

    for (const modelName of modelsToScrub) {
        try {
            const result = await (prisma as any)[modelName.charAt(0).toLowerCase() + modelName.slice(1)].deleteMany({
                where: { tenantId: "t_undefined" }
            })
            if (result.count > 0) {
                console.log(`  - ${modelName}: Removed ${result.count} orphan(s)`)
            }
        } catch (e) {
            // Some models might not have been migrated yet or have different field names
            // console.error(`  ! Skip ${modelName}: ${e.message}`)
        }
    }

    // 2. Ensure Roles exist
    await seedRoles()

    // 3. Provision GLOBAL_SUPER_ADMIN (Absolute Override)
    const email = "super@topo-eng.sa"
    const password = await bcrypt.hash("SecurePassword123!", 10)

    const role = await (prisma as any).role.findFirst({
        where: {
            name: "GLOBAL_SUPER_ADMIN",
            tenantId: "t_undefined"
        }
    })
    if (!role) {
        console.log("⚠️ GLOBAL_SUPER_ADMIN role missing. Creating now...")
        await (prisma as any).role.create({
            data: {
                name: "GLOBAL_SUPER_ADMIN",
                description: "Full Infrastructure Access",
                permissionMatrix: JSON.stringify({ ALL: { read: true, write: true, delete: true } }),
                tenantId: "t_undefined"
            }
        })
    }

    const superAdmin = await (prisma as any).user.upsert({
        where: { email },
        update: {
            password,
            role: "GLOBAL_SUPER_ADMIN",
            tenantId: "t_undefined"
        },
        create: {
            email,
            password,
            name: "Global Super Admin",
            role: "GLOBAL_SUPER_ADMIN",
            tenantId: "t_undefined"
        }
    })
    console.log(`✅ Admin Reset: ${superAdmin.email} is Provisioned.`)

    // 4. Provision Demo Tenant
    console.log("🌱 Provisioning Demo Tenant...")
    await seedDemoTenant()
    console.log("✅ Demo Environment: READY")

    console.log("✨ SYSTEM PURIFICATION COMPLETE")
}

main()
    .catch((e) => {
        console.error("❌ PURGE FAILED:", e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
