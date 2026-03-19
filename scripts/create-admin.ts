import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
    console.log("Creating Admin User...")

    // 1. Ensure an Admin Role exists
    let adminRole = await prisma.role.findUnique({
        where: { name: 'ADMIN' }
    })

    if (!adminRole) {
        adminRole = await prisma.role.create({
            data: {
                name: 'ADMIN',
                description: 'Full System Administrator',
                permissionMatrix: JSON.stringify({
                    "HR": { "read": true, "write": true, "approve": true },
                    "FINANCE": { "read": true, "write": true, "approve": true },
                    "PROJECTS": { "read": true, "write": true, "approve": true },
                    "IT": { "read": true, "write": true, "approve": true },
                    "REPORTS": { "read": true, "write": true, "approve": true },
                    "SETTINGS": { "read": true, "write": true, "approve": true }
                })
            }
        })
        console.log("Created ADMIN role.")
    }

    // Ensure RolePermissions are properly linked just in case using new RBAC model logic
    const modules = ["HR", "FINANCE", "PROJECTS", "IT", "REPORTS", "SETTINGS"]
    for (const mod of modules) {
        await prisma.rolePermission.upsert({
            where: {
                roleName_module: {
                    roleName: 'ADMIN',
                    module: mod
                }
            },
            update: {
                canRead: true,
                canWrite: true,
                canApprove: true,
            },
            create: {
                roleName: 'ADMIN',
                module: mod,
                canRead: true,
                canWrite: true,
                canApprove: true,
            }
        })
    }

    // 2. Hash password
    const hashedPassword = await bcrypt.hash("Admin@123", 10)

    // 3. Create User & Profile transaction
    const email = "admin@fts.com"
    const existingUser = await prisma.user.findUnique({ where: { email } })

    if (existingUser) {
        // Update existing user to be full admin
        await prisma.user.update({
            where: { email },
            data: {
                role: 'ADMIN',
                roleId: adminRole.id,
                password: hashedPassword,
            }
        })
        console.log("Updated existing admin user with full permissions.")
    } else {
        // Create new user
        const newUser = await prisma.user.create({
            data: {
                name: "System Admin",
                email: email,
                password: hashedPassword,
                role: "ADMIN",
                roleId: adminRole.id,
                profile: {
                    create: {
                        employeeCode: "FTS-ADMIN",
                        department: "Management",
                        position: "Administrator",
                        basicSalary: 0,
                    }
                }
            }
        })
        console.log(`Created new Admin user: ${newUser.email} / Password: Admin@123`)
    }

    console.log("Admin setup complete.")
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
