import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function seedProjectTypes() {
    console.log("🌱 Seeding Project Types...")

    const types = [
        { nameEn: "Residential Villa", nameAr: "فيلا سكنية" },
        { nameEn: "Commercial Building", nameAr: "مبنى تجاري" },
        { nameEn: "Industrial / Warehouse", nameAr: "مستودع / صناعي" },
        { nameEn: "Mosque", nameAr: "مسجد" },
        { nameEn: "Interior Design", nameAr: "تصميم داخلي" },
    ]

    for (const type of types) {
        await (prisma as any).projectType.upsert({
            where: { id: `type_${type.nameEn.toLowerCase().replace(/\s+/g, '_')}` },
            create: {
                id: `type_${type.nameEn.toLowerCase().replace(/\s+/g, '_')}`,
                ...type,
                tenantId: "t_undefined"
            },
            update: {
                nameEn: type.nameEn,
                nameAr: type.nameAr,
                isActive: true
            }
        })
    }

    console.log(`✅ Seeded ${types.length} project types.`)
}

if (require.main === module) {
    seedProjectTypes()
        .then(async () => {
            await prisma.$disconnect()
        })
        .catch(async (e) => {
            console.error(e)
            await prisma.$disconnect()
            process.exit(1)
        })
}
