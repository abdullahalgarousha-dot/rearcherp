import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Seeding initial data for Timesheet and Dashboard testing...')

    // 1. Create a Brand
    const brand = await prisma.brand.create({
        data: { nameEn: 'FTS', nameAr: 'اف تي اس', shortName: 'FTS' }
    })

    // 2. Create a User and Profile
    const user = await prisma.user.create({
        data: {
            email: 'engineer@fts.com',
            name: 'Test Engineer',
            role: 'SITE_ENGINEER',
            password: 'password123',
            profile: {
                create: {
                    department: 'Engineering',
                    position: 'Site Engineer',
                    basicSalary: 8000,
                    hourlyRate: 50
                }
            }
        }
    })

    // 3. Create a Project
    const project = await prisma.project.create({
        data: {
            code: 'FTS-2024-001',
            name: 'Residential Villa - Riyadh',
            legacyClientName: 'Abdullah Saad',
            contractValue: 1000000,
            brandId: brand.id,
            year: 2024,
            sequence: 1,
            totalDuration: 360,
            completionPercent: 45,
            status: 'ACTIVE'
        }
    })

    const delayedProj = await prisma.project.create({
        data: {
            code: 'FTS-2024-002',
            name: 'Commercial Mall - Jeddah',
            legacyClientName: 'Horizon Co',
            contractValue: 2500000,
            brandId: brand.id,
            year: 2024,
            sequence: 2,
            totalDuration: 180,
            completionPercent: 12,
            status: 'DELAYED'
        }
    })

    // 4. Create Financial Ledgers (Invoices vs Expenses)
    await prisma.invoice.create({
        data: {
            projectId: project.id,
            invoiceNumber: 'INV-001',
            baseAmount: 100000,
            vatAmount: 15000,
            totalAmount: 115000,
            date: new Date(),
            status: 'PAID'
        }
    })

    await prisma.expense.create({
        data: {
            projectId: project.id,
            description: 'Site Materials',
            amountBeforeTax: 20000,
            taxAmount: 3000,
            totalAmount: 23000,
            category: 'MATERIALS',
            date: new Date()
        }
    })

    // 5. Create Time Logs
    await prisma.timeLog.createMany({
        data: [
            { projectId: project.id, userId: user.id, date: new Date(), hoursLogged: 8, description: 'Site Supervision' },
            { projectId: project.id, userId: user.id, date: new Date(Date.now() - 86400000), hoursLogged: 6, description: 'Office Design' },
            { projectId: delayedProj.id, userId: user.id, date: new Date(Date.now() - 172800000), hoursLogged: 8, description: 'Emergency Fixes' },
        ]
    })

    console.log('Seeding complete!')
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
