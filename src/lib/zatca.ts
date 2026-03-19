/**
 * ZATCA Phase 1 QR Code Utility (TLV Encoding)
 * Requirements:
 * 1. Seller Name
 * 2. VAT Number
 * 3. Timestamp
 * 4. Invoice Total (with VAT)
 * 5. VAT Total
 */

function toTLV(tag: number, value: string): Buffer {
    const valueBuffer = Buffer.from(value, 'utf8');
    const tagBuffer = Buffer.from([tag]);
    const lengthBuffer = Buffer.from([valueBuffer.length]);
    return Buffer.concat([tagBuffer, lengthBuffer, valueBuffer]);
}

export function generateZatcaQR(
    sellerName: string,
    vatNumber: string,
    timestamp: string,
    totalAmount: string,
    vatAmount: string
): string {
    const tlvParts = [
        toTLV(1, sellerName),
        toTLV(2, vatNumber),
        toTLV(3, timestamp),
        toTLV(4, totalAmount),
        toTLV(5, vatAmount),
    ];

    const combined = Buffer.concat(tlvParts);
    return combined.toString('base64');
}
