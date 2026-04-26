import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Starting InvoiceItem correction script...");
    
    // Find all InvoiceItems and include their parent Invoice to get the correct tenantId
    const items = await prisma.invoiceItem.findMany({
        include: {
            invoice: {
                select: { tenantId: true }
            }
        }
    });

    let updatedCount = 0;
    for (const item of items) {
        if (item.invoice && item.tenantId !== item.invoice.tenantId) {
            await prisma.invoiceItem.update({
                where: { id: item.id },
                data: { tenantId: item.invoice.tenantId }
            });
            updatedCount++;
            console.log(`Updated InvoiceItem ${item.id} to use tenantId ${item.invoice.tenantId}`);
        }
    }

    console.log(`Finished correcting InvoiceItems. Updated ${updatedCount} out of ${items.length} records.`);
}

main()
    .catch(e => {
        console.error("Error during InvoiceItem correction:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
