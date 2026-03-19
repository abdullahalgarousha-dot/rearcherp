import { PrismaClient } from '@prisma/client'
import { generateOfficeRef } from '../lib/archiver'

const db = new PrismaClient()

async function main() {
    console.log("Starting Demo Data Generation...")

    // 1. Get or Create Demo Admin
    const admin = await db.user.findFirst({ where: { role: 'ADMIN' } })
    if (!admin) throw new Error("No ADMIN user found to author the reports.")

    // 1.5 Get or Create Demo Brand
    let brand = await db.brand.findFirst()
    if (!brand) {
        brand = await db.brand.create({
            data: {
                nameEn: 'Demo Brand',
                nameAr: 'علامة تجريبية',
                shortName: 'DEMO'
            }
        })
    }

    // 2. Get or Create Demo Project
    let project = await db.project.findFirst({ where: { name: 'DEMO SUPERVISION PROJECT' } })
    if (!project) {
        project = await db.project.create({
            data: {
                brandId: brand.id,
                year: new Date().getFullYear(),
                sequence: 999,
                name: 'DEMO SUPERVISION PROJECT',
                code: 'DEMO-001',
                legacyClientName: 'Demo Client',
                legacyClientAddr: 'Riyadh, KSA',
                legacyClientVat: '1234567890',
                contractValue: 1000000,
                serviceType: 'Supervision',
                status: 'ACTIVE',
                contractDuration: 365,
                startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
                completionPercent: 0
            }
        })
        console.log("Created Demo Project:", project.id)
    } else {
        console.log("Found Demo Project:", project.id)
    }

    // 3. Get or Create Demo Contractor
    let contractor = await db.contractor.findFirst({ where: { companyName: 'DEMO CONTRACTOR LLC' } })
    if (!contractor) {
        contractor = await db.contractor.create({
            data: {
                companyName: 'DEMO CONTRACTOR LLC',
                contactPerson: 'John Doe',
                email: 'demo@contractor.com',
                phone: '0555555555',
                specialty: 'Civil Works'
            }
        })
        console.log("Created Demo Contractor:", contractor.id)
    } else {
        console.log("Found Demo Contractor:", contractor.id)
    }

    // 4. Link Project and Contractor
    let pc = await db.projectContractor.findUnique({
        where: {
            projectId_contractorId: {
                projectId: project.id,
                contractorId: contractor.id
            }
        }
    })
    if (!pc) {
        pc = await db.projectContractor.create({
            data: {
                projectId: project.id,
                contractorId: contractor.id,
                startDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
                durationDays: 100,
                contractValue: 500000
            }
        })
        console.log("Linked Contractor to Project")
    }

    // 5. Generate 3 Daily Reports
    for (let i = 1; i <= 3; i++) {
        // Report for 3, 2, and 1 days ago
        const reportDate = new Date(Date.now() - (4 - i) * 24 * 60 * 60 * 1000)
        const serial = i
        const officeRef = `DEMO-DSR-00${i}`

        const contractorData = [
            {
                contractorId: contractor.id,
                contractorName: contractor.companyName,
                engineers: [{ name: "Ahmed", role: "Site Engineer" }],
                labor: [
                    { type: "Mason", count: 10 + i },
                    { type: "Carpenter", count: 5 + i },
                    { type: "Helper", count: 20 }
                ],
                notes: `Demo Note ${i}: Progress is steady. No major issues observed.`,
                // Inject fake timeline data for the report snapshot
                startDate: pc.startDate,
                durationDays: pc.durationDays,
                contractValue: pc.contractValue,
                elapsedDays: 15 + i,
                delayDays: 0,
                remainingDays: 100 - (15 + i)
            }
        ]

        const equipment = [
            { name: "Excavator", count: 2 },
            { name: "Crane", count: 1 }
        ]

        const existingReport = await db.dailyReport.findFirst({ where: { officeRef, projectId: project.id } })

        if (!existingReport) {
            await db.dailyReport.create({
                data: {
                    projectId: project.id,
                    contractorId: contractor.id,
                    date: reportDate,
                    weather: 'Sunny',
                    workPerformedToday: `Excavation works at Zone A.\nPouring concrete for footing F${i}.`,
                    plannedWorkTomorrow: 'Curing concrete and preparing steel reinforcement for columns.',
                    materialsDelivered: 'Steel Rebars (10 tons)',
                    safetyStatus: 'Good, No incidents.',
                    completionPercentage: i * 2, // 2%, 4%, 6%
                    delayDays: 0,
                    elapsedDays: 30 + i, // Project elapsed
                    officeRef,
                    serial,
                    createdById: admin.id,
                    status: i === 3 ? 'PENDING' : 'APPROVED',
                    approvedById: i === 3 ? null : admin.id,
                    contractorData: JSON.stringify(contractorData),
                    equipment: JSON.stringify(equipment),
                    consultantStaff: JSON.stringify([{ role: "Engineer", name: "Demo Admin", present: true }]),
                    totalManpower: 35 + (i * 2),
                    sitePhotos: "[]"
                }
            })
            console.log(`Created Report ${i} for ${reportDate.toISOString().split('T')[0]}`)
        }
    }

    console.log("Demo Data Generation Completed Successfully!")
}

main()
    .catch(e => {
        console.error("Error generating demo data:", e)
        process.exit(1)
    })
    .finally(async () => {
        await db.$disconnect()
    })
