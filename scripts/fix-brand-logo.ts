/**
 * fix-brand-logo.ts
 * Updates all Brand records whose logoUrl is 404 to use the correct local path.
 */
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

async function main() {
    const brands = await prisma.brand.findMany({
        select: { id: true, nameEn: true, shortName: true, logoUrl: true }
    })

    console.log("[INFO] Current brand logos:")
    brands.forEach(b => console.log(`  ${b.shortName || b.nameEn}: ${b.logoUrl || "(none)"}`))

    // The canonical logo that actually exists on disk
    const CORRECT_LOGO = "/logos/fts-logo.png"

    let updated = 0
    for (const brand of brands) {
        // Fix any brand pointing to the broken path or missing a logo
        const isBroken = !brand.logoUrl || brand.logoUrl.includes("fts-logo") || brand.logoUrl.includes("fts.png")
        if (isBroken) {
            await prisma.brand.update({
                where: { id: brand.id },
                data: { logoUrl: CORRECT_LOGO }
            })
            console.log(`[FIXED] ${brand.nameEn} → logoUrl = ${CORRECT_LOGO}`)
            updated++
        }
    }

    if (updated === 0) {
        console.log("[INFO] No brand logos needed fixing.")
    } else {
        console.log(`[SUCCESS] Updated ${updated} brand record(s).`)
    }

    await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
