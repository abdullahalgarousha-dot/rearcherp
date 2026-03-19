import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log("🛠️  Starting Subscription Fix...")

    // 1. Ensure Enterprise Plan exists
    const enterprisePlan = await (prisma as any).subscriptionPlan.upsert({
        where: { name: 'Enterprise' },
        update: {
            allowedModules: ["HR", "FINANCE", "PROJECTS", "GANTT", "ZATCA", "CRM", "FILE_UPLOAD", "SUPERVISION"],
            price: 0,
        },
        create: {
            name: 'Enterprise',
            allowedModules: ["HR", "FINANCE", "PROJECTS", "GANTT", "ZATCA", "CRM", "FILE_UPLOAD", "SUPERVISION"],
            price: 0,
            currency: "SAR",
            description: "Full access for Global Admin"
        }
    })

    console.log(`✅ Enterprise Plan [${enterprisePlan.id}] is ready.`)

    // 2. Link all tenants to Enterprise
    const tenants = await prisma.tenant.findMany()
    for (const tenant of tenants) {
        await (prisma as any).tenant.update({
            where: { id: tenant.id },
            data: { planId: enterprisePlan.id }
        })
        console.log(`✅ Tenant [${tenant.name}] linked to Enterprise plan.`)
    }

    console.log("🚀 Subscription Fix Complete!")
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
