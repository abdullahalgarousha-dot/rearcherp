import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function seedRoles() {
    console.log("Seeding Roles...")

    // Ensure foundation tenant for global roles/users exists
    await (prisma as any).tenant.upsert({
        where: { id: "t_undefined" },
        update: {},
        create: {
            id: "t_undefined",
            slug: "system",
            name: "System Foundation"
        }
    })

    const defaultPermissions = {
        PROJECTS: { VIEW: true, EDIT: true, DELETE: false, APPROVE: false },
        FINANCE: { VIEW: true, EDIT: true, DELETE: false, APPROVE: false },
        HR: { VIEW: true, EDIT: true, DELETE: false, APPROVE: false },
        SUPERVISION: { VIEW: true, EDIT: true, DELETE: false, APPROVE: false },
        SETTINGS: { VIEW: true, EDIT: true, DELETE: false, APPROVE: false },
        USERS: { VIEW: false, EDIT: false, DELETE: false, APPROVE: false },
    }

    const adminPermissions = {
        PROJECTS: { VIEW: true, EDIT: true, DELETE: true, APPROVE: true },
        FINANCE: { VIEW: true, EDIT: true, DELETE: true, APPROVE: true },
        HR: { VIEW: true, EDIT: true, DELETE: true, APPROVE: true },
        SUPERVISION: { VIEW: true, EDIT: true, DELETE: true, APPROVE: true },
        SETTINGS: { VIEW: true, EDIT: true, DELETE: true, APPROVE: true },
        USERS: { VIEW: true, EDIT: true, DELETE: true, APPROVE: true },
    }

    const roles = [
        { name: "ADMIN", permissionMatrix: adminPermissions, description: "System Administrator with full access" },
        { name: "SUPER_ADMIN", permissionMatrix: adminPermissions, description: "Super User with all permissions" },
        { name: "GLOBAL_SUPER_ADMIN", permissionMatrix: adminPermissions, description: "Global Platform Owner (High Security)" },
        { name: "HR", permissionMatrix: defaultPermissions, description: "Human Resources Specialist" },
        { name: "PM", permissionMatrix: defaultPermissions, description: "Project Manager" },
        { name: "SITE_ENGINEER", permissionMatrix: defaultPermissions, description: "Site Supervision Engineer" },
        { name: "DESIGN_ENGINEER", permissionMatrix: defaultPermissions, description: "Design Engineer" },
        { name: "ACCOUNTANT", permissionMatrix: defaultPermissions, description: "Financial Accountant" },
    ]

    for (const role of roles) {
        const existing = await (prisma as any).role.findUnique({ where: { name: role.name } })
        if (!existing) {
            await (prisma as any).role.create({
                data: {
                    name: role.name,
                    tenantId: "t_undefined",
                    permissionMatrix: JSON.stringify(role.permissionMatrix),
                    description: role.description
                }
            })
            console.log(`Created role: ${role.name}`)
        } else {
            // Update permissions for ADMIN/SUPER_ADMIN to ensure they are always full
            if (role.name === 'ADMIN' || role.name === 'SUPER_ADMIN') {
                await (prisma as any).role.update({
                    where: { name: role.name },
                    data: {
                        tenantId: "t_undefined",
                        permissionMatrix: JSON.stringify(role.permissionMatrix),
                        description: role.description
                    }
                })
                console.log(`Updated permissions for: ${role.name}`)
            }
        }
    }

    // Migrate existing users
    console.log("Migrating Users...")
    const users = await prisma.user.findMany()
    for (const user of users) {
        if (user.role && !user.roleId) {
            // Find matching role
            let roleName = user.role // e.g. "SITE_ENGINEER"

            // Map legacy strings if needed
            if (roleName === "ADMIN") roleName = "SUPER_ADMIN"

            const role = await (prisma as any).role.findUnique({ where: { name: roleName } })

            if (role) {
                await (prisma as any).user.update({
                    where: { id: user.id },
                    data: { roleId: role.id, tenantId: "t_undefined" }
                })
                console.log(`Assigned ${user.name} to ${role.name}`)
            } else {
                // Fallback to SITE_ENGINEER if role not found
                const defaultRole = await (prisma as any).role.findUnique({ where: { name: "SITE_ENGINEER" } })
                if (defaultRole) {
                    await (prisma as any).user.update({
                        where: { id: user.id },
                        data: { roleId: defaultRole.id, tenantId: "t_undefined" }
                    })
                    console.log(`Assigned ${user.name} to SITE_ENGINEER (Fallback)`)
                }
            }
        }
    }

    console.log("Seeding Roles Complete.")
}

// Execute if run directly
if (require.main === module) {
    seedRoles()
        .then(async () => {
            await prisma.$disconnect()
        })
        .catch(async (e) => {
            console.error(e)
            await prisma.$disconnect()
            process.exit(1)
        })
}
