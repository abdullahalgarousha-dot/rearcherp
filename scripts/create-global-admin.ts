import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
    const email = "super@rearch.sa"
    const password = "SecurePassword123!"
    const hashedPassword = await bcrypt.hash(password, 10)

    // Ensure we have a system tenant or a placeholder if needed
    // However, GLOBAL_SUPER_ADMIN doesn't technically need a tenant if we bypass it in middleware,
    // but the schema requires one. We'll use the 'FTS' or create a 'SYSTEM' one.

    let ftsTenant = await prisma.tenant.findUnique({ where: { slug: 'fts' } })
    if (!ftsTenant) {
        ftsTenant = await prisma.tenant.create({
            data: {
                name: 'System Admin',
                slug: 'fts',
                status: 'ACTIVE'
            }
        })
    }

    const user = await prisma.user.upsert({
        where: { email },
        update: {
            role: "GLOBAL_SUPER_ADMIN",
            password: hashedPassword,
            tenantId: ftsTenant.id
        },
        create: {
            email,
            name: "Global Super Admin",
            password: hashedPassword,
            role: "GLOBAL_SUPER_ADMIN",
            tenantId: ftsTenant.id
        }
    })

    console.log(`[SUCCESS] Global Super Admin created: ${email}`)
    console.log(`[INFO] Role: ${user.role}`)
    console.log(`[ACTION] Use login URL: /super-login?access=secure`)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
