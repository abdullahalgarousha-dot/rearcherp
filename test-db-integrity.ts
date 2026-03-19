import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
    try {
        console.log("Attempting to connect to database...");
        const count = await prisma.user.count();
        console.log(`Database is readable. Found ${count} users.`);

        const projects = await prisma.project.findMany({ take: 1 });
        console.log(`Successfully queried projects: ${projects.length}`);

    } catch (e) {
        console.error("Database connection failed:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
