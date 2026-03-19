
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log("Columns in NCR:");
        const ncrCols = await prisma.$queryRawUnsafe(`PRAGMA table_info(NCR)`);
        ncrCols.forEach(col => console.log(`- ${col.name} (${col.type})`));

        console.log("\nColumns in InspectionRequest:");
        const irCols = await prisma.$queryRawUnsafe(`PRAGMA table_info(InspectionRequest)`);
        irCols.forEach(col => console.log(`- ${col.name} (${col.type})`));
    } catch (e) {
        console.error("Error checking columns:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
