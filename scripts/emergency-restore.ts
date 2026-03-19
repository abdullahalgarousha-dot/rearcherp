
import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    console.log('Starting emergency restore...')

    // 1. Restore Admin User
    const email = 'admin@fts.com'
    const password = await hash('admin123', 12)

    const user = await prisma.user.upsert({
        where: { email },
        update: {
            role: 'ADMIN',
        },
        create: {
            email,
            name: 'فوزي Fawzi',
            password,
            role: 'ADMIN',
        },
    })

    console.log(`Admin user restored: ${user.email}`)

    // 2. Restore Employee Profile (Required for "Profile not found" error)
    const profile = await prisma.employeeProfile.upsert({
        where: { userId: user.id },
        update: {},
        create: {
            userId: user.id,
            // firstName: 'Fawzi', // user.name is used
            // lastName: 'Admin',
            position: 'System Administrator',
            department: 'IT',
            hireDate: new Date(),
        },
    })

    console.log(`Admin profile restored.`)

    // 3. Restore God Mode Permissions
    const modules = ['HR', 'FINANCE', 'PROJECTS', 'SUPERVISION', 'SETTINGS', 'DASHBOARD']

    for (const module of modules) {
        await prisma.rolePermission.upsert({
            where: {
                roleName_module: {
                    roleName: 'ADMIN',
                    module,
                },
            },
            update: {
                canRead: true,
                canWrite: true,
                canApprove: true,
            },
            create: {
                roleName: 'ADMIN',
                module,
                canRead: true,
                canWrite: true,
                canApprove: true,
            },
        })
    }

    console.log('God mode permissions restored for ADMIN.')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
