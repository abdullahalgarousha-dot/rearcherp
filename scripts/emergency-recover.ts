/**
 * EMERGENCY RECOVERY SCRIPT
 * Restores: Tenant, CompanyProfile, and fawzi.sulaimani@the3concept.com as ADMIN
 *
 * Run: npx tsx scripts/emergency-recover.ts
 */

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const TENANT_ID = "t_undefined"
const USER_EMAIL = "fawzi.sulaimani@the3concept.com"
const USER_NAME = "Fawzi Talal Al-Sulaimani"
// bcrypt hash of "password123" — change after recovery
const PASSWORD_HASH = "$2b$10$UGwwNIIDuFFRnDj/njmKJeOy9/FtDIAO8Cob2rtKtvu6hZz4zNmpi"

const ADMIN_PERMISSIONS = {
    PROJECTS: { VIEW: true, EDIT: true, DELETE: true, APPROVE: true },
    FINANCE: { VIEW: true, EDIT: true, DELETE: true, APPROVE: true },
    HR: { VIEW: true, EDIT: true, DELETE: true, APPROVE: true },
    SUPERVISION: { VIEW: true, EDIT: true, DELETE: true, APPROVE: true },
    SETTINGS: { VIEW: true, EDIT: true, DELETE: true, APPROVE: true },
    USERS: { VIEW: true, EDIT: true, DELETE: true, APPROVE: true },
    CRM: { VIEW: true, EDIT: true, DELETE: true, APPROVE: true },
    REPORTS: { VIEW: true, EDIT: true, DELETE: true, APPROVE: true },
}

async function main() {
    console.log("=== EMERGENCY RECOVERY ===\n")

    // ── 1. Ensure foundation tenant ──────────────────────────────────────────
    console.log("1. Ensuring foundation tenant...")
    await prisma.tenant.upsert({
        where: { id: TENANT_ID },
        update: { name: "FTS Foundation", status: "ACTIVE" },
        create: {
            id: TENANT_ID,
            slug: "system",
            name: "FTS Foundation",
            status: "ACTIVE",
            setupCompleted: true,
        },
    })
    console.log(`   ✓ Tenant ready (id: ${TENANT_ID})`)

    // ── 2. Ensure ADMIN role exists and has full permissions ─────────────────
    console.log("2. Ensuring ADMIN role...")
    const adminRole = await (prisma as any).role.upsert({
        where: { name: "ADMIN" },
        update: {
            permissionMatrix: JSON.stringify(ADMIN_PERMISSIONS),
            description: "System Administrator with full access",
        },
        create: {
            name: "ADMIN",
            tenantId: TENANT_ID,
            permissionMatrix: JSON.stringify(ADMIN_PERMISSIONS),
            description: "System Administrator with full access",
        },
    })
    console.log(`   ✓ ADMIN role ready (id: ${adminRole.id})`)

    // Also ensure SUPER_ADMIN exists (used by some sidebar guards)
    await (prisma as any).role.upsert({
        where: { name: "SUPER_ADMIN" },
        update: {
            permissionMatrix: JSON.stringify(ADMIN_PERMISSIONS),
        },
        create: {
            name: "SUPER_ADMIN",
            tenantId: TENANT_ID,
            permissionMatrix: JSON.stringify(ADMIN_PERMISSIONS),
            description: "Super Administrator",
        },
    })
    console.log(`   ✓ SUPER_ADMIN role ready`)

    // ── 3. Upsert the user with ADMIN role ───────────────────────────────────
    console.log(`3. Upserting user: ${USER_EMAIL}...`)
    const user = await prisma.user.upsert({
        where: { email: USER_EMAIL },
        update: {
            name: USER_NAME,
            role: "ADMIN",
            roleId: adminRole.id,
            tenantId: TENANT_ID,
        },
        create: {
            email: USER_EMAIL,
            name: USER_NAME,
            password: PASSWORD_HASH,
            role: "ADMIN",
            roleId: adminRole.id,
            tenantId: TENANT_ID,
        },
    })
    console.log(`   ✓ User ready (id: ${user.id})`)
    console.log(`   ✓ Role assigned: ADMIN (roleId: ${adminRole.id})`)

    // ── 4. Create / update CompanyProfile ────────────────────────────────────
    console.log("4. Creating CompanyProfile...")
    const existing = await prisma.companyProfile.findFirst({
        where: { tenantId: TENANT_ID },
    })

    if (existing) {
        await prisma.companyProfile.update({
            where: { id: existing.id },
            data: {
                companyNameAr: "مكتب فوزي طلال السليماني",
                companyNameEn: "FTS Architectural & Engineering Consultancy",
                defaultCurrency: "SAR",
                vatPercentage: 15,
            },
        })
        console.log(`   ✓ CompanyProfile updated (id: ${existing.id})`)
    } else {
        const profile = await prisma.companyProfile.create({
            data: {
                tenantId: TENANT_ID,
                companyNameAr: "مكتب فوزي طلال السليماني",
                companyNameEn: "FTS Architectural & Engineering Consultancy",
                defaultCurrency: "SAR",
                vatPercentage: 15,
            },
        })
        console.log(`   ✓ CompanyProfile created (id: ${profile.id})`)
    }

    // ── 5. Summary ───────────────────────────────────────────────────────────
    console.log("\n=== RECOVERY COMPLETE ===")
    console.log(`  Email    : ${USER_EMAIL}`)
    console.log(`  Password : password  (the default seed password — change this!)`)
    console.log(`  Role     : ADMIN (full permissions)`)
    console.log(`  Tenant   : ${TENANT_ID}`)
    console.log("\nLog in at /login and verify the sidebar is fully restored.")
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error("\n[ERROR]", e)
        await prisma.$disconnect()
        process.exit(1)
    })
