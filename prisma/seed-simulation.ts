import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    console.log('🧹 Cleaning existing data...')

    // Comprehensive cleanup for foreign keys
    const tables = [
        'timeLog', 'workLog', 'attendance', 'systemLog',
        'nCRRevision', 'iRRevision', 'nCR', 'inspectionRequest', 'dailyReport',
        'task', 'milestone', 'designStageFile', 'designStage',
        'invoice', 'expense', 'projectContractor', 'project', 'contractor',
        'leaveRequest', 'loan', 'penalty', 'salarySlip', 'documentRequest', 'complaint', 'loanRequest', 'employeeHRStats',
        'employeeProfile', 'role'
    ]

    for (const table of tables) {
        try {
            await (prisma as any)[table].deleteMany({})
        } catch (e) {
            console.log(`Skipped cleaning ${table}: ${e}`)
        }
    }

    await (prisma as any).user.updateMany({
        where: { role: 'ADMIN' },
        data: { name: 'FAWZI TALAL SULIMANI' }
    })
    await (prisma as any).user.deleteMany({ where: { role: { not: 'ADMIN' } } })
    await (prisma as any).branch.deleteMany({})
    await (prisma as any).brand.deleteMany({})

    console.log('🛡️ Seeding Roles & Permissions...')
    const FULL_MATRIX = {
        projects: { view: 'ALL', createEdit: true, approve: true, delete: true, canAccessDrive: true },
        supervision: { view: 'ALL', manageDSR: true, manageIR: true, manageNCR: true, deleteReports: true },
        hr: { view: 'ALL_BRANCHES', createEdit: true, approveLeaves: true, delete: true, viewOfficialDocs: true, viewMedicalLeaves: true },
        finance: { masterVisible: true, viewContracts: true, viewVATReports: true, viewSalarySheets: true, manageLoans: true },
        system: { manageSettings: true, manageRoles: true, viewLogs: true, viewAnalytics: true }
    }

    const adminRole = await (prisma as any).role.create({
        data: { name: 'ADMIN', description: 'System Administrator', permissionMatrix: JSON.stringify(FULL_MATRIX) }
    })

    const pmRole = await (prisma as any).role.create({
        data: {
            name: 'PM',
            description: 'Project Manager',
            permissionMatrix: JSON.stringify({
                ...FULL_MATRIX,
                finance: { ...FULL_MATRIX.finance, masterVisible: false },
                system: { ...FULL_MATRIX.system, manageSettings: false, manageRoles: false }
            })
        }
    })

    const engineerRole = await (prisma as any).role.create({
        data: {
            name: 'SITE_ENGINEER',
            description: 'Field Engineer',
            permissionMatrix: JSON.stringify({
                projects: { view: 'ASSIGNED', createEdit: false, approve: false, delete: false, canAccessDrive: true },
                supervision: { view: 'ASSIGNED', manageDSR: true, manageIR: true, manageNCR: true, deleteReports: false },
                hr: { view: 'NONE', createEdit: false, approveLeaves: false, delete: false, viewOfficialDocs: false, viewMedicalLeaves: false },
                finance: { masterVisible: false, viewContracts: false, viewVATReports: false, viewSalarySheets: false, manageLoans: false },
                system: { manageSettings: false, manageRoles: false, viewLogs: false, viewAnalytics: false }
            })
        }
    })

    const hrRole = await (prisma as any).role.create({
        data: {
            name: 'HR',
            description: 'HR Specialist',
            permissionMatrix: JSON.stringify({
                ...FULL_MATRIX,
                projects: { ...FULL_MATRIX.projects, view: 'NONE' },
                supervision: { ...FULL_MATRIX.supervision, view: 'NONE' },
                finance: { ...FULL_MATRIX.finance, masterVisible: false }
            })
        }
    })

    const roleMap = { 'ADMIN': adminRole.id, 'PM': pmRole.id, 'SITE_ENGINEER': engineerRole.id, 'HR': hrRole.id, 'ACCOUNTANT': adminRole.id }

    console.log('🌱 Seeding Brands & Branches...')
    const brandFTS = await (prisma as any).brand.create({
        data: {
            nameEn: 'FTS Engineering',
            nameAr: 'إف تي إس للهندسة',
            shortName: 'FTS',
            acronym: 'FTS',
            vatNumber: '310000000000003'
        }
    })

    const branchRiyadh = await (prisma as any).branch.create({
        data: { nameEn: 'Riyadh Office', nameAr: 'فرع الرياض' }
    })

    const branchJeddah = await (prisma as any).branch.create({
        data: { nameEn: 'Jeddah Office', nameAr: 'فرع جدة' }
    })

    console.log('👥 Seeding Users & Employee Profiles...')
    const roles = ['PM', 'SITE_ENGINEER', 'ACCOUNTANT', 'HR']
    const usersData = [
        { name: 'Khaled Mansour', email: 'khaled@fts.com', role: 'PM' },
        { name: 'Ahmed Ali', email: 'ahmed@fts.com', role: 'SITE_ENGINEER' },
        { name: 'Sami Hassan', email: 'sami@fts.com', role: 'SITE_ENGINEER' },
        { name: 'Mona Ibrahim', email: 'mona@fts.com', role: 'ACCOUNTANT' },
        { name: 'Laila Fahd', email: 'laila@fts.com', role: 'HR' },
    ]

    const password = "$2b$10$UGwwNIIDuFFRnDj/njmKJeOy9/FtDIAO8Cob2rtKtvu6hZz4zNmpi" // "password"
    const ADMIN_ID = "cm76c5b960000uxm96s5wun9o"

    // Force delete existing admin with wrong ID to ensure ID change
    const existingAdmin = await (prisma as any).user.findUnique({ where: { email: 'admin@fts.com' } })
    if (existingAdmin && existingAdmin.id !== ADMIN_ID) {
        await (prisma as any).timeLog.deleteMany({ where: { userId: existingAdmin.id } })
        await (prisma as any).workLog.deleteMany({ where: { userId: existingAdmin.id } })
        await (prisma as any).employeeProfile.deleteMany({ where: { userId: existingAdmin.id } })
        await (prisma as any).user.delete({ where: { id: existingAdmin.id } })
    }

    // Ensure main admin exists with user name
    await (prisma as any).user.upsert({
        where: { email: 'admin@fts.com' },
        update: { name: 'FAWZI TALAL SULIMANI', role: 'ADMIN', password },
        create: {
            id: ADMIN_ID,
            email: 'admin@fts.com',
            name: 'FAWZI TALAL SULIMANI',
            password,
            role: 'ADMIN',
            profile: {
                create: {
                    department: 'Management',
                    position: 'General Manager',
                    hireDate: new Date('2023-01-01'),
                    branchId: branchRiyadh.id
                }
            }
        }
    })

    const users: any[] = []
    for (const u of usersData) {
        const user = await (prisma as any).user.create({
            data: {
                ...u,
                password,
                roleId: (roleMap as any)[u.role],
                profile: {
                    create: {
                        department: u.role === 'SITE_ENGINEER' ? 'Supervision' : 'Management',
                        position: u.role,
                        basicSalary: 8000 + Math.random() * 5000,
                        hourlyRate: 50 + Math.random() * 50,
                        hireDate: new Date('2023-01-01'),
                        branchId: u.name.includes('Jeddah') ? branchJeddah.id : branchRiyadh.id
                    }
                }
            }
        })
        users.push(user)
    }

    console.log('🏗️ Seeding Contractors...')
    const contractorsData = [
        { companyName: 'Al-Bayan Construction', specialty: 'Main Contractor' },
        { companyName: 'Saudi Electro-Mech', specialty: 'MEP' },
        { companyName: 'Riyadh Finishing Co.', specialty: 'Finishing' },
    ]
    const contractors = []
    for (const c of contractorsData) {
        const contractor = await (prisma as any).contractor.create({ data: c })
        contractors.push(contractor)
    }

    console.log('📁 Seeding Projects...')
    const projectsData = [
        { name: 'Sky Tower Plaza', code: 'FTS-2024-001', client: 'Al-Rajhi Group', contractValue: 2500000, status: 'ACTIVE', serviceType: 'BOTH' },
        { name: 'Lotus Residential Villa', code: 'FTS-2024-002', client: 'Private Client', contractValue: 450000, status: 'COMPLETED', serviceType: 'DESIGN' },
        { name: 'Jeddah Coastal Resort', code: 'FTS-2024-003', client: 'Gov of Jeddah', contractValue: 12000000, status: 'ACTIVE', serviceType: 'SUPERVISION' },
        { name: 'North Mall Ext', code: 'FTS-2024-004', client: 'Azizia Panda', contractValue: 3200000, status: 'ACTIVE', serviceType: 'BOTH' },
    ]

    const projects: any[] = []
    for (const p of projectsData) {
        const newProject = await (prisma as any).project.create({
            data: {
                ...p,
                brandId: brandFTS.id,
                branchId: branchRiyadh.id,
                year: 2024,
                sequence: projects.length + 1,
                startDate: new Date('2024-01-10'),
                totalDuration: 52, // weeks
            }
        })
        projects.push(newProject)
    }

    console.log('💰 Seeding Financials (Invoices & Expenses)...')
    for (const p of projects) {
        // Invoices
        const baseAmount = p.contractValue * 0.2
        const vatAmount = baseAmount * 0.15
        await (prisma as any).invoice.create({
            data: {
                projectId: p.id,
                invoiceNumber: `INV-${p.code}-01`,
                description: 'Advance Payment',
                baseAmount,
                vatAmount,
                totalAmount: baseAmount + vatAmount,
                status: 'PAID',
                date: new Date('2024-01-15')
            }
        })

        if (p.status === 'ACTIVE') {
            const base02 = p.contractValue * 0.1
            const vat02 = base02 * 0.15
            await (prisma as any).invoice.create({
                data: {
                    projectId: p.id,
                    invoiceNumber: `INV-${p.code}-02`,
                    description: 'Monthly Progress Claim',
                    baseAmount: base02,
                    vatAmount: vat02,
                    totalAmount: base02 + vat02,
                    status: 'PENDING',
                    date: new Date()
                }
            })
        }

        // Expenses
        await (prisma as any).expense.create({
            data: {
                projectId: p.id,
                description: 'Site Transportation',
                amountBeforeTax: 1200,
                taxAmount: 180,
                totalAmount: 1380,
                category: 'Transport',
                date: new Date(),
            }
        })
    }

    console.log('⏱️ Seeding Time Logs...')
    const siteEngs = users.filter(u => u.role === 'SITE_ENGINEER')
    for (const eng of siteEngs) {
        for (let i = 0; i < 5; i++) {
            const date = new Date()
            date.setDate(date.getDate() - i)
            await (prisma as any).timeLog.create({
                data: {
                    userId: eng.id,
                    projectId: projects[0].id,
                    date,
                    hoursLogged: 8,
                    type: i % 2 === 0 ? 'SITE' : 'OFFICE',
                    cost: 400,
                    description: 'General supervision works'
                }
            })
        }
    }

    console.log('👷 Seeding Work Logs (Site Visits)...')
    for (const eng of siteEngs) {
        for (let i = 0; i < 3; i++) {
            const date = new Date()
            date.setDate(date.getDate() - i)
            await (prisma as any).workLog.create({
                data: {
                    userId: eng.id,
                    projectId: projects[0].id,
                    date,
                    hoursLogged: 4,
                    type: 'SITE',
                    description: 'Regular site inspection and progress monitoring'
                }
            })
        }
    }

    console.log('📋 Seeding Supervision Records...')
    // Daily Report
    await (prisma as any).dailyReport.create({
        data: {
            projectId: projects[0].id,
            createdById: siteEngs[0].id,
            date: new Date(),
            status: 'PENDING',
            officeRef: 'DSR-SKY-001',
            weather: 'Sunny',
            totalManpower: 45,
            workPerformedToday: 'Concrete pouring for Level 4 columns completed.',
        }
    })

    // NCR
    await (prisma as any).nCR.create({
        data: {
            projectId: projects[0].id,
            createdById: siteEngs[0].id,
            officeRef: 'NCR-SKY-02',
            status: 'OPEN',
            severity: 'HIGH',
            description: 'Honeycomb detected in basement retaining wall segment B-12.',
            contractorId: contractors[0].id
        }
    })

    // IR
    await (prisma as any).inspectionRequest.create({
        data: {
            projectId: projects[2].id,
            createdById: siteEngs[1].id,
            officeRef: 'IR-JED-105',
            status: 'PENDING',
            type: 'Structural',
            date: new Date(),
            description: 'Reinforcement inspection for slab S-1',
            contractorId: contractors[1].id
        }
    })

    console.log('📅 Seeding Tasks (Gantt Data)...')
    for (const p of projects) {
        if (p.serviceType === 'DESIGN' || p.serviceType === 'BOTH') {
            await (prisma as any).task.create({
                data: {
                    projectId: p.id,
                    title: 'Initial Concept Design',
                    start: new Date('2024-01-15'),
                    end: new Date('2024-02-15'),
                    status: 'DONE',
                    progress: 100,
                    type: 'DESIGN'
                }
            })
            await (prisma as any).task.create({
                data: {
                    projectId: p.id,
                    title: 'Structural Analysis',
                    start: new Date('2024-02-16'),
                    end: new Date('2024-03-30'),
                    status: 'IN_PROGRESS',
                    progress: 45,
                    type: 'DESIGN'
                }
            })
        }
    }

    console.log('🎨 Seeding Design Stages...')
    for (const p of projects) {
        if (p.serviceType === 'DESIGN' || p.serviceType === 'BOTH') {
            const stages = [
                { name: "Concept", order: 1, progress: 100, status: "DONE" },
                { name: "3D Rendering", order: 2, progress: 60, status: "IN_PROGRESS" },
                { name: "Blueprints", order: 3, progress: 0, status: "PENDING" },
            ]
            for (const s of stages) {
                await (prisma as any).designStage.create({
                    data: {
                        ...s,
                        projectId: p.id
                    }
                })
            }
        }
    }

    console.log('✅ Simulation Data Seeded Successfully!')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
