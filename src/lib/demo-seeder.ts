import { db } from "./db"
import bcrypt from "bcryptjs"

export async function seedDemoTenant() {
    try {
        console.log("🚀 Starting Comprehensive Demo Seeding...")

        // 0. Ensure Enterprise Plan exists for Demo
        const enterprisePlan = await (db as any).subscriptionPlan.upsert({
            where: { name: "Enterprise" },
            update: {
                allowedModules: ["HR", "FINANCE", "GANTT", "ZATCA", "PROJECTS", "CRM", "FILE_UPLOAD"],
                price: 15000,
                currency: "SAR"
            },
            create: {
                name: "Enterprise",
                description: "Full suite for large engineering firms.",
                allowedModules: ["HR", "FINANCE", "GANTT", "ZATCA", "PROJECTS", "CRM", "FILE_UPLOAD"],
                price: 15000,
                currency: "SAR"
            }
        })

        // 1. Ensure Demo Tenant exists
        const tenant = await (db as any).tenant.upsert({
            where: { slug: "demo" },
            update: {
                name: "REARCH Engineering & Construction",
                status: "ACTIVE",
                plan: { connect: { id: enterprisePlan.id } },
                subscriptionTier: "ENTERPRISE",
                subscriptionStart: new Date("2024-01-01"),
                subscriptionEnd: new Date("2026-12-31"),
            },
            create: {
                name: "REARCH Engineering & Construction",
                slug: "demo",
                status: "ACTIVE",
                plan: { connect: { id: enterprisePlan.id } },
                subscriptionTier: "ENTERPRISE",
                subscriptionStart: new Date("2024-01-01"),
                subscriptionEnd: new Date("2026-12-31"),
            }
        })

        const tenantId = tenant.id

        // 2. Wipe existing Demo Data (Careful: only for this tenant)
        // This ensures the demo is "fresh" and logical every time
        const deleteData = async () => {
            const where = { tenantId };
            await (db as any).dailyReport.deleteMany({ where });
            await (db as any).nCR.deleteMany({ where });
            await (db as any).inspectionRequest.deleteMany({ where });
            await (db as any).invoice.deleteMany({ where });
            await (db as any).pettyCashRequest.deleteMany({ where });
            await (db as any).project.deleteMany({ where });
            try {
                await (db as any).employeeProfile.deleteMany({ where });
            } catch (e) {
                console.warn("  ! Note: Could not wipe EmployeeProfile (schema mismatch), skipping...");
            }
            await (db as any).user.deleteMany({ where: { tenantId, role: { not: 'ADMIN' } } });
        }
        await deleteData();

        // 3. Organizational Structure
        const branch = await (db as any).branch.create({
            data: { name: "Riyadh HQ", location: "Olaya District", tenantId }
        })

        // 4. Create Key Users & Profiles
        const hashedPassword = await bcrypt.hash("demo1234", 10)

        const adminUser = await (db as any).user.upsert({
            where: { email: "demo@rearch.sa" },
            update: { tenantId, role: "ADMIN", name: "Demo Super Admin" },
            create: {
                email: "demo@rearch.sa",
                name: "Demo Super Admin",
                role: "ADMIN",
                tenantId,
                password: hashedPassword
            }
        })

        const hrUser = await (db as any).user.create({
            data: {
                email: "hr@rearch-demo.sa", name: "Sarah Al-Fahad", role: "HR", tenantId, password: hashedPassword,
                employeeProfile: {
                    create: {
                        employeeId: "EMP-001",
                        position: "HR Director",
                        department: "Human Resources",
                        salary: 22000,
                        joiningDate: new Date("2023-05-15"),
                        tenantId
                    }
                }
            }
        })

        const financeUser = await (db as any).user.create({
            data: {
                email: "finance@rearch-demo.sa", name: "Ahmed Mansour", role: "FINANCE", tenantId, password: hashedPassword,
                employeeProfile: {
                    create: {
                        employeeId: "EMP-002",
                        position: "Chief Accountant",
                        department: "Finance",
                        salary: 18500,
                        joiningDate: new Date("2023-08-01"),
                        tenantId
                    }
                }
            }
        })

        const pmUser = await (db as any).user.create({
            data: {
                email: "pm@rearch-demo.sa", name: "Eng. Khalid", role: "MANAGER", tenantId, password: hashedPassword,
                employeeProfile: {
                    create: {
                        employeeId: "EMP-003",
                        position: "Senior Project Manager",
                        department: "Project Management",
                        salary: 25000,
                        joiningDate: new Date("2023-01-10"),
                        tenantId
                    }
                }
            }
        })

        // 5. Projects & Connected Records
        const projects = await Promise.all([
            (db as any).project.create({
                data: {
                    name: "NEOM Logistics Hub - Phase 1",
                    description: "Fast-track construction of automated warehousing and distribution center.",
                    status: "ACTIVE",
                    tenantId,
                    type: "Civil",
                    estimatedBudget: 85000000,
                    startDate: new Date("2024-03-01"),
                    endDate: new Date("2025-11-30"),
                    tasks: {
                        create: [
                            { title: "Permit Acquisition", status: "DONE", start: new Date("2024-03-01"), end: new Date("2024-03-15"), progress: 100, tenantId },
                            { title: "Site Mobilization", status: "DONE", start: new Date("2024-03-16"), end: new Date("2024-04-01"), progress: 100, tenantId },
                            { title: "Excavation & Piling", status: "IN_PROGRESS", start: new Date("2024-04-02"), end: new Date("2024-06-30"), progress: 45, tenantId },
                            { title: "Foundation Concrete", status: "TODO", start: new Date("2024-07-01"), end: new Date("2024-09-15"), progress: 0, tenantId }
                        ]
                    }
                }
            }),
            (db as any).project.create({
                data: {
                    name: "Red Sea Resort MEP Upgrade",
                    description: "Complete overhaul of HVAC and fire suppression systems.",
                    status: "PLANNING",
                    tenantId,
                    type: "Mechanical",
                    estimatedBudget: 4200000,
                    startDate: new Date("2025-01-01")
                }
            })
        ])

        // 6. Procurement & CRM
        const client = await (db as any).client.create({
            data: { name: "Red Sea Global", email: "procurement@redseaglobal.com", tenantId, address: "Tabuk Region" }
        })

        const vendor = await (db as any).vendor.create({
            data: { name: "Saudi Readymix", email: "sales@sreadymix.com", tenantId, category: "Supplier" }
        })

        // 7. Site Operations Logs (A logical sequence)
        // Day 1
        await (db as any).dailyReport.create({
            data: {
                date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
                summary: "Site mobilization complete. Temporary fences installed. Excavation started in Area A.",
                tenantId,
                projectId: projects[0].id,
                createdById: pmUser.id,
                status: "APPROVED"
            }
        })

        // Day 2 (Incidents)
        await (db as any).nCR.create({
            data: {
                title: "Concrete Slump Deviation",
                description: "Batch #SR-882 arrived with slump 210mm. Tolerance is 180mm max.",
                tenantId, project: { connect: { id: projects[0].id } },
                status: "RESOLVED", severity: "MINOR", createdBy: { connect: { id: pmUser.id } }
            }
        })

        // Request for Inspection
        await (db as any).inspectionRequest.create({
            data: {
                title: "Footing Rebar Inspection - Grid 5-10",
                description: "Verification of rebar diameter and spacing as per IFC Drawing S-102.",
                status: "COMPLETED",
                tenantId,
                projectId: projects[0].id,
                createdById: pmUser.id
            }
        })

        // 8. Financial Flow
        await (db as any).invoice.create({
            data: {
                invoiceNumber: "INV-RS-001",
                amount: 1450000,
                status: "PENDING",
                tenantId,
                projectId: projects[0].id,
                clientId: client.id,
                dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
            }
        })

        await (db as any).pettyCashRequest.create({
            data: {
                amount: 3200,
                purpose: "Urgent purchase of site safety PPE (Vests, Helmets)",
                status: "APPROVED",
                tenantId,
                requestedById: hrUser.id,
                projectId: projects[0].id
            }
        })

        console.log("✅ Deep Demo Seeding Complete!")
        return { success: true }
    } catch (e: any) {
        console.error("❌ Seeding Error:", e)
        return { error: e.message }
    }
}
