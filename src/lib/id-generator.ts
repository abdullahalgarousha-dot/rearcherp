import { db } from "@/lib/db"

/**
 * Fetches the abbreviation of the default brand for the given tenant.
 * Used as a prefix for ID generation (e.g., Projects, Invoices, NCRs).
 */
export async function getDefaultBrandPrefix(tenantId: string): Promise<string> {
    try {
        const defaultBrand = await (db.brand as any).findFirst({
            where: {
                tenantId,
                isDefault: true
            },
            select: { abbreviation: true }
        })

        if (defaultBrand?.abbreviation) {
            return defaultBrand.abbreviation.toUpperCase()
        }

        // Fallback to the first available brand if no default is set
        const anyBrand = await (db.brand as any).findFirst({
            where: { tenantId },
            select: { abbreviation: true }
        })

        if (anyBrand?.abbreviation) {
            return anyBrand.abbreviation.toUpperCase()
        }

        // Default system fallback
        return "ERP"
    } catch (error) {
        console.error("Error fetching brand prefix:", error)
        return "ERP"
    }
}

/**
 * Generates a structured ID with a brand prefix.
 * Example: FTS-PROJ-2024-001
 */
export async function generateBrandAwareId(
    tenantId: string,
    entityType: 'PROJ' | 'INV' | 'NCR' | 'IR' | 'DSR',
    sequence: number,
    year?: number
): Promise<string> {
    const prefix = await getDefaultBrandPrefix(tenantId)
    const currentYear = year || new Date().getFullYear()
    const paddedSequence = String(sequence).padStart(3, '0')

    return `${prefix}-${entityType}-${currentYear}-${paddedSequence}`
}
