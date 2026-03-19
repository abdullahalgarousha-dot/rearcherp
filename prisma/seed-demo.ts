import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    console.log('🚀 Starting Demo Seeding...')

    const password = await bcrypt.hash('demo123', 10)
    const demoSlug = 'demo'

    // 1. Create/Update Tenant
    const tenant = await (prisma as any).tenant.upsert({
        where: { slug: demoSlug },
        update: {
            setupCompleted: true,
            subscriptionTier: 'PROFESSIONAL'
        },
        create: {
            slug: demoSlug,
            name: 'Demo Engineering Solutions',
            status: 'ACTIVE',
            subscriptionTier: 'PROFESSIONAL',
            setupCompleted: true
        }
    })

    const tenantId = tenant.id

    // 2. Create Brand
    const brand = await (prisma as any).brand.upsert({
        where: { id: 'demo-brand-1' }, // Hardcoding ID for stability in seeding
        update: {},
        create: {
            id: 'demo-brand-1',
            tenantId,
            nameEn: 'REARCH DEMO',
            nameAr: 'ريآرك ديمو',
            shortName: 'DEMO',
            acronym: 'DMO'
        }
    })

    // 3. Create Demo Admin User
    const admin = await (prisma as any).user.upsert({
        where: { email: 'admin@demo.rearch.sa' },
        update: { tenantId, password },
        create: {
            email: 'admin@demo.rearch.sa',
            name: 'Demo Admin',
            password,
            role: 'ADMIN',
            tenantId
        }
    })

    // 4. Create Staff
    const staffData = [
        { name: 'Eng. Khalid Mansour', email: 'khalid@demo.rearch.sa', role: 'PM', position: 'Project Manager' },
        { name: 'Sarah Ahmed', email: 'sarah@demo.rearch.sa', role: 'SITE_ENGINEER', position: 'Site Engineer' },
        { name: 'Omar Zaid', email: 'omar@demo.rearch.sa', role: 'ACCOUNTANT', position: 'Financial Accountant' }
    ]

    const users = []
    for (const s of staffData) {
        const u = await (prisma as any).user.upsert({
            where: { email: s.email },
            update: { tenantId, password },
            create: {
                email: s.email,
                name: s.name,
                password,
                role: s.role,
                tenantId
            }
        })
        users.push(u)

        await (prisma as any).employeeProfile.upsert({
            where: { userId: u.id },
            update: { department: 'Engineering', position: s.position },
            create: {
                userId: u.id,
                department: 'Engineering',
                position: s.position,
                employeeCode: `DEMO-${Math.floor(Math.random() * 1000)}`,
                basicSalary: 12000
            }
        })
    }

    // 5. Create Projects
    const projects = [
        { name: 'Al-Narjis Tower', val: 12000000, code: 'DEMO-2024-001', type: 'SUPERVISION' },
        { name: 'Luxury Villa Cluster', val: 4500000, code: 'DEMO-2024-002', type: 'DESIGN' },
        { name: 'Community Mosque', val: 2800000, code: 'DEMO-2024-003', type: 'BOTH' }
    ]

    for (const p of projects) {
        const project = await (prisma as any).project.upsert({
            where: { code: p.code },
            update: { tenantId, completionPercent: Math.random() * 100 },
            create: {
                tenantId,
                code: p.code,
                name: p.name,
                contractValue: p.val,
                brandId: brand.id,
                year: 2024,
                sequence: parseInt(p.code.split('-')[2]),
                serviceType: p.type as any,
                completionPercent: Math.random() * 100,
                status: 'ACTIVE'
            }
        })

        // 6. Seed Supervision Logs for projects
        if (p.type === 'SUPERVISION' || p.type === 'BOTH') {
            await (prisma as any).dailyReport.create({
                data: {
                    tenantId,
                    projectId: project.id,
                    createdById: users[1].id, // Sarah (Site Engineer)
                    date: new Date(),
                    status: 'APPROVED',
                    workPerformedToday: 'Casting basement columns and slabs.',
                    plannedWorkTomorrow: 'Curing of concrete.',
                    currentCompletion: 25
                }
            })

            await (prisma as any).nCR.create({
                data: {
                    tenantId,
                    projectId: project.id,
                    createdById: users[1].id,
                    status: 'OPEN',
                    severity: 'HIGH',
                    description: 'Concrete compressive strength failed to meet specifications in zone B.'
                }
            })
        }

        // 7. Seed Finance Data
        await (prisma as any).invoice.create({
            data: {
                tenantId,
                projectId: project.id,
                invoiceNumber: `INV-${p.code}-001`,
                total: p.val * 0.1, // 10% Advance
                status: 'PAID',
                date: new Date()
            }
        })
    }

    console.log('✅ Demo Seeding Complete!')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
