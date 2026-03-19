import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

async function main() {
    const user = await prisma.user.findUnique({
        where: { email: "super@rearch.sa" },
        select: { id: true, email: true, role: true, roleId: true, tenantId: true, twoFactorEnabled: true }
    })

    if (!user) {
        console.log("[NOT FOUND] No user with email super@rearch.sa")
    } else {
        console.log("[FOUND]", JSON.stringify(user, null, 2))
    }

    await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
