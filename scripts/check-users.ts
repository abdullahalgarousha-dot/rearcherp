import { db } from '@/lib/db'

async function main() {
    const users = await db.user.findMany({
        select: { id: true, name: true, email: true, role: true }
    })
    console.log('--- USERS ---')
    console.table(users)
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await db.$disconnect()
    })
