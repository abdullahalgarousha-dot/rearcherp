import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function seedLookups() {
    console.log("🌱 Seeding System Lookups...")

    const lookups = [
        // SERVICE_TYPE
        { category: "SERVICE_TYPE", value: "DESIGN", labelEn: "Design", labelAr: "تصميم" },
        { category: "SERVICE_TYPE", value: "SUPERVISION", labelEn: "Supervision", labelAr: "إشراف" },
        { category: "SERVICE_TYPE", value: "CONSULTATION", labelEn: "Consultation", labelAr: "استشارة" },
        { category: "SERVICE_TYPE", value: "PMO", labelEn: "Project Management", labelAr: "إدارة مشاريع" },

        // PROJECT_TYPE
        { category: "PROJECT_TYPE", value: "RESIDENTIAL", labelEn: "Residential Villa", labelAr: "فيلا سكنية" },
        { category: "PROJECT_TYPE", value: "COMMERCIAL", labelEn: "Commercial Building", labelAr: "مبنى تجاري" },
        { category: "PROJECT_TYPE", value: "INDUSTRIAL", labelEn: "Industrial / Warehouse", labelAr: "مستودع / صناعي" },
        { category: "PROJECT_TYPE", value: "MOSQUE", labelEn: "Mosque", labelAr: "مسجد" },
        { category: "PROJECT_TYPE", value: "INTERIOR", labelEn: "Interior Design", labelAr: "تصميم داخلي" },

        // DISCIPLINE
        { category: "DISCIPLINE", value: "ARCHITECTURAL", labelEn: "Architectural", labelAr: "معماري" },
        { category: "DISCIPLINE", value: "STRUCTURAL", labelEn: "Structural", labelAr: "إنشائي" },
        { category: "DISCIPLINE", value: "ELECTRICAL", labelEn: "Electrical", labelAr: "كهرباء" },
        { category: "DISCIPLINE", value: "PLUMBING", labelEn: "Plumbing", labelAr: "سباكة" },
        { category: "DISCIPLINE", value: "MECHANICAL", labelEn: "Mechanical", labelAr: "ميكانيكا" },
        { category: "DISCIPLINE", value: "MEP", labelEn: "MEP", labelAr: "إلكتروميكانيك" },

        // INVOICE_STATUS
        { category: "INVOICE_STATUS", value: "ISSUED", labelEn: "Issued", labelAr: "صادرة" },
        { category: "INVOICE_STATUS", value: "PAID", labelEn: "Paid", labelAr: "مدفوعة" },
        { category: "INVOICE_STATUS", value: "CANCELLED", labelEn: "Cancelled", labelAr: "ملغاة" },
        { category: "INVOICE_STATUS", value: "OVERDUE", labelEn: "Overdue", labelAr: "متأخرة" },

        // UNIT
        { category: "UNIT", value: "ITEM", labelEn: "Item", labelAr: "بند" },
        { category: "UNIT", value: "MONTH", labelEn: "Month", labelAr: "شهر" },
        { category: "UNIT", value: "LS", labelEn: "Lump Sum", labelAr: "مقطوعية" },
        { category: "UNIT", value: "SQM", labelEn: "SQM", labelAr: "متر مربع" },
    ]

    for (const lookup of lookups) {
        await (prisma as any).systemLookup.upsert({
            where: {
                category_value: {
                    category: lookup.category,
                    value: lookup.value
                }
            },
            create: {
                ...lookup,
                tenantId: "t_undefined" // Default for seeding
            },
            update: {
                labelEn: lookup.labelEn,
                labelAr: lookup.labelAr,
                isActive: true
            }
        })
    }

    console.log(`✅ Seeded ${lookups.length} lookups.`)
}

if (require.main === module) {
    seedLookups()
        .then(async () => {
            await prisma.$disconnect()
        })
        .catch(async (e) => {
            console.error(e)
            await prisma.$disconnect()
            process.exit(1)
        })
}
