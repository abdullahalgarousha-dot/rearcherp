import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    const email = 'super@topo-eng.sa'
    const password = 'SecurePassword123!'
    const hashedPassword = await bcrypt.hash(password, 10)

    console.log(`Checking for Super Admin: ${email}`)

    // 0. Ensure foundation tenant exists
    await (prisma as any).tenant.upsert({
        where: { id: "t_undefined" },
        update: {},
        create: {
            id: "t_undefined",
            slug: "system",
            name: "System Foundation"
        }
    })

    // 1. Ensure Role exists (optional but good practice)
    await (prisma as any).role.upsert({
        where: { name: "GLOBAL_SUPER_ADMIN" },
        update: {},
        create: {
            name: "GLOBAL_SUPER_ADMIN",
            tenantId: "t_undefined",
            permissionMatrix: "{}" // Empty object as fallback
        }
    })

    const user = await prisma.user.upsert({
        where: { email },
        update: {
            role: 'GLOBAL_SUPER_ADMIN',
            name: 'System Super Admin',
            password: hashedPassword // Force update password
        },
        create: {
            email,
            name: 'System Super Admin',
            password: hashedPassword,
            role: 'GLOBAL_SUPER_ADMIN'
        }
    })

    console.log(`✅ Super Admin account ready: ${user.email}`)
    console.log(`🔑 Credentials: email: ${email}, password: ${password}`)
    console.log(`🔓 MFA Code (Fixed for Demo): 123456`)
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
