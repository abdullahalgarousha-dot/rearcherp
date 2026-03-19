import crypto from 'crypto';
import { db } from "@/lib/db";

/**
 * ZATCA Phase 2 Hash Chaining Utility
 * 
 * For ZATCA Phase 2, each invoice must contain the hash of the previous invoice
 * to ensure an immutable chain. 
 */
export async function generateInvoiceHash(invoiceData: any, previousInvoiceHash: string | null): Promise<string> {
    const dataToHash = JSON.stringify({
        invoiceNumber: invoiceData.invoiceNumber,
        uuid: invoiceData.uuid,
        date: invoiceData.date,
        totalAmount: invoiceData.totalAmount,
        vatAmount: invoiceData.vatAmount,
        previousHash: previousInvoiceHash || "0".repeat(64) // Seed for first invoice
    });

    return crypto.createHash('sha256').update(dataToHash).digest('hex');
}

/**
 * Assigns a secure sequence number and hash to an invoice.
 * Ensures data immutability.
 */
export async function finalizeInvoiceForZatca(invoiceId: string) {
    const invoice = await (db as any).invoice.findUnique({
        where: { id: invoiceId },
        include: { project: true }
    });

    if (!invoice) throw new Error("Invoice not found");
    if (invoice.isLocked) throw new Error("Invoice is already finalized and locked");

    // 1. Get the last locked invoice to find the previous hash and sequence
    const lastInvoice = await (db as any).invoice.findFirst({
        where: {
            isLocked: true,
            tenantId: invoice.tenantId
        },
        orderBy: { sequenceNumber: 'desc' }
    });

    const nextSequence = (lastInvoice?.sequenceNumber || 0) + 1;
    const currentHash = await generateInvoiceHash(invoice, lastInvoice?.hash || null);

    // 2. Lock the invoice and update security fields
    const updatedInvoice = await (db as any).invoice.update({
        where: { id: invoiceId },
        data: {
            sequenceNumber: nextSequence,
            hash: currentHash,
            isLocked: true
        }
    });

    return updatedInvoice;
}
