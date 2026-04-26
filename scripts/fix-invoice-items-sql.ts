import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Starting InvoiceItem correction script via raw SQL...");
    
    const result = await prisma.$executeRawUnsafe(`
        UPDATE "InvoiceItem" ii
        SET "tenantId" = i."tenantId"
        FROM "Invoice" i
        WHERE ii."invoiceId" = i.id
        AND (ii."tenantId" IS NULL OR ii."tenantId" != i."tenantId");
    `);

    console.log(`Finished correcting InvoiceItems. Rows affected: ${result}`);
}

main()
    .catch(e => {
        console.error("Error during InvoiceItem correction:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
