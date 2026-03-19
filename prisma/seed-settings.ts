import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Seeding System Settings...')

    await prisma.systemSetting.upsert({
        where: { key: 'EGP_TO_SAR_RATE' },
        update: {},
        create: {
            key: 'EGP_TO_SAR_RATE',
            value: '0.076',
            description: 'Exchange rate from EGP to SAR'
        }
    })

    console.log('Seeding completed.')
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
