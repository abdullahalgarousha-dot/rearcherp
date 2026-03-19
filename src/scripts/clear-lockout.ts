import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

async function clearLockout() {
    console.log("🚀 Clearing Security Logs & Blocked IPs...")
    try {
        const auditResult = await prisma.auditLog.deleteMany({})
        const loginResult = await prisma.loginAttempt.deleteMany({})

        console.log(`✅ Cleared ${auditResult.count} Audit Logs`)
        console.log(`✅ Cleared ${loginResult.count} Login Attempts`)
        console.log("✨ Done. Your IP should be unblocked.")
    } catch (e) {
        console.error("❌ Error clearing lockout:", e)
    } finally {
        await prisma.$disconnect()
    }
}

clearLockout()
