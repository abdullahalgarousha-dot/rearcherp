
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const columns = await prisma.$queryRawUnsafe(`PRAGMA table_info(DailyReport)`);
        console.log("Columns in DailyReport:");
        columns.forEach(col => console.log(`- ${col.name} (${col.type})`));
    } catch (e) {
        console.error("Error checking columns:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
