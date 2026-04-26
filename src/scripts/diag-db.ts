import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    console.log("--- DB DIAGNOSTIC START ---")
    try {
        const user = await prisma.user.findUnique({
            where: { email: 'super@topo-eng.sa' },
            include: { userRole: true }
        })

        if (!user) {
            console.log("ERROR: User 'super@topo-eng.sa' not found in database.")
        } else {
            console.log("User Found:")
            console.log("- ID:", user.id)
            console.log("- Role (Field):", user.role)
            console.log("- userRole (Relation):", user.userRole?.name || "NULL")
            console.log("- Has Password:", !!user.password)
            console.log("- MFA Secret:", user.twoFactorSecret || "NULL")
            console.log("- Tenant ID:", user.tenantId)
        }

        const roles = await prisma.role.findMany({
            select: { name: true, tenantId: true }
        })
        console.log("Available Roles in DB:", roles.map(r => r.name).join(", "))

    } catch (e: any) {
        console.error("DIAGNOSTIC FAILED:", e.message)
    } finally {
        await prisma.$disconnect()
        console.log("--- DB DIAGNOSTIC END ---")
    }
}

main()
