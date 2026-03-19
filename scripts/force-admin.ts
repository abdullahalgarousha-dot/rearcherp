/**
 * force-admin.ts
 * Ensures super@rearch.sa has role=GLOBAL_SUPER_ADMIN and clears any
 * conflicting roleId relation that would override it in the JWT callback.
 */
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

async function main() {
    // 1. Check linked role (if any)
    const user = await prisma.user.findUnique({
        where: { email: "super@rearch.sa" },
        include: { userRole: true }
    })

    if (!user) {
        console.error("[ERROR] User super@rearch.sa not found in DB.")
        process.exit(1)
    }

    console.log("[INFO] Current state:")
    console.log(`  role field    : ${user.role}`)
    console.log(`  roleId field  : ${user.roleId ?? "null"}`)
    console.log(`  userRole.name : ${(user as any).userRole?.name ?? "null (no linked role)"}`)

    // 2. Promote and clear conflicting roleId
    const updated = await prisma.user.update({
        where: { email: "super@rearch.sa" },
        data: {
            role: "GLOBAL_SUPER_ADMIN",
            roleId: null   // <-- remove the relation so userRole?.name returns null
        }
    })

    console.log("\n[SUCCESS] User updated:")
    console.log(`  role   : ${updated.role}`)
    console.log(`  roleId : ${updated.roleId ?? "null"}`)
    console.log("\n[ACTION] Sign out of any active session, then log in at /super-login?access=secure")

    await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
