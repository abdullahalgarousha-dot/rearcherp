const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const disciplines = [
        { category: 'ENGINEERING_DISCIPLINE', value: 'ARCHITECTURAL', labelEn: 'Architectural', labelAr: 'معماري' },
        { category: 'ENGINEERING_DISCIPLINE', value: 'STRUCTURAL', labelEn: 'Structural', labelAr: 'إنشائي' },
        { category: 'ENGINEERING_DISCIPLINE', value: 'ELECTRICAL', labelEn: 'Electrical', labelAr: 'كهرباء' },
        { category: 'ENGINEERING_DISCIPLINE', value: 'MECHANICAL', labelEn: 'Mechanical', labelAr: 'ميكانيكا' },
        { category: 'ENGINEERING_DISCIPLINE', value: 'PLUMBING', labelEn: 'Plumbing', labelAr: 'سباكة' },
        { category: 'ENGINEERING_DISCIPLINE', value: 'INTERIOR_DESIGN', labelEn: 'Interior Design', labelAr: 'تصميم داخلي' },
    ]

    for (const d of disciplines) {
        await prisma.systemLookup.upsert({
            where: {
                category_value: {
                    category: d.category,
                    value: d.value
                }
            },
            update: {},
            create: d
        })
    }
    console.log('Successfully seeded default engineering disciplines.')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
