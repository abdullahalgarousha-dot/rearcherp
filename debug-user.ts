import { db as prisma } from './src/lib/db'

async function checkUser() {
    const email = 'super@rearch.sa'
    const user = await (prisma as any).user.findUnique({
        where: { email },
        include: { userRole: true }
    })

    console.log("USER RECORD:", JSON.stringify(user, null, 2))
}

checkUser().catch(console.error).finally(() => prisma.$disconnect())
