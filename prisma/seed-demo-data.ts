import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function seedDemoData() {
    console.log("🌱 Seeding Demo Data...")

    // Get admin user and brands
    const adminUser = await (prisma as any).user.findFirst({ where: { role: "ADMIN" } })
    const ftsBrand = await (prisma as any).brand.findFirst({ where: { nameEn: "FTS" } })

    if (!adminUser || !ftsBrand) {
        console.error("❌ Admin user or FTS brand not found. Run main seed first.")
        return
    }

    // 1. Seed Employees (HR Data)
    console.log("👥 Creating Employees...")
    const employees = [
        {
            name: "أحمد محمد",
            nameEn: "Ahmed Mohammed",
            position: "مهندس موقع",
            department: "الإشراف الهندسي",
            email: "ahmed.m@fts.com",
            phone: "+966501234567",
            nationality: "Saudi",
            idNumber: "1234567890",
            joiningDate: new Date("2023-01-15"),
            basicSalary: 8000,
            status: "ACTIVE"
        },
        {
            name: "سارة عبدالله",
            nameEn: "Sara Abdullah",
            position: "مهندسة تصميم",
            department: "التصميم المعماري",
            email: "sara.a@fts.com",
            phone: "+966502345678",
            nationality: "Saudi",
            idNumber: "2345678901",
            joiningDate: new Date("2023-03-01"),
            basicSalary: 9000,
            status: "ACTIVE"
        },
        {
            name: "محمد خالد",
            nameEn: "Mohammed Khaled",
            position: "مدير مشروع",
            department: "إدارة المشاريع",
            email: "mohammed.k@fts.com",
            phone: "+966503456789",
            nationality: "Saudi",
            idNumber: "3456789012",
            joiningDate: new Date("2022-06-01"),
            basicSalary: 12000,
            status: "ACTIVE"
        },
        {
            name: "فاطمة أحمد",
            nameEn: "Fatima Ahmed",
            position: "محاسبة",
            department: "المالية",
            email: "fatima.a@fts.com",
            phone: "+966504567890",
            nationality: "Saudi",
            idNumber: "4567890123",
            joiningDate: new Date("2023-02-15"),
            basicSalary: 7000,
            status: "ACTIVE"
        }
    ]

    const createdEmployees = []
    for (const emp of employees) {
        const existing = await (prisma as any).employee.findFirst({ where: { email: emp.email } })
        if (!existing) {
            const created = await (prisma as any).employee.create({ data: emp })
            createdEmployees.push(created)
            console.log(`  ✓ Created: ${emp.nameEn}`)
        } else {
            createdEmployees.push(existing)
        }
    }

    // 2. Seed Projects
    console.log("📁 Creating Projects...")
    const projects = [
        {
            code: "FTS-2024-001",
            name: "مشروع فيلا سكنية - الرياض",
            client: "عبدالله بن سعد",
            clientAddress: "الرياض - حي النرجس",
            brandId: ftsBrand.id,
            contractValue: 850000,
            year: 2024,
            sequence: 1,
            startDate: new Date("2024-01-15"),
            endDate: new Date("2024-12-31"),
            type: "DESIGN",
            createdById: adminUser.id
        },
        {
            code: "FTS-2024-002",
            name: "مجمع تجاري - جدة",
            client: "شركة الأفق التجارية",
            clientAddress: "جدة - طريق الملك",
            brandId: ftsBrand.id,
            contractValue: 2500000,
            year: 2024,
            sequence: 2,
            startDate: new Date("2024-02-01"),
            endDate: new Date("2025-06-30"),
            type: "SUPERVISION"
        },
        {
            code: "FTS-2023-015",
            name: "مسجد حي الورود",
            client: "وزارة الشؤون الإسلامية",
            clientAddress: "الرياض - حي الورود",
            brandId: ftsBrand.id,
            contractValue: 1200000,
            year: 2023,
            sequence: 15,
            startDate: new Date("2023-09-01"),
            endDate: new Date("2024-08-31"),
            type: "DESIGN",
            createdById: adminUser.id
        }
    ]

    const createdProjects = []
    for (const proj of projects) {
        const existing = await (prisma as any).project.findFirst({ where: { code: proj.code } })
        if (!existing) {
            const created = await (prisma as any).project.create({ data: proj })
            createdProjects.push(created)
            console.log(`  ✓ Created: ${proj.name}`)
        } else {
            createdProjects.push(existing)
        }
    }

    // 3. Seed Financial Data
    if (createdProjects.length > 0) {
        console.log("💰 Creating Financial Records...")

        // Create Invoices
        const invoices = [
            {
                projectId: createdProjects[0].id,
                invoiceNumber: "INV-2024-001",
                description: "دفعة مقدمة - 30%",
                subtotal: 255000,
                taxRate: 0.15,
                taxAmount: 38250,
                total: 293250,
                status: "PAID",
                date: new Date("2024-01-20")
            },
            {
                projectId: createdProjects[1].id,
                invoiceNumber: "INV-2024-002",
                description: "مستخلص رقم 1",
                subtotal: 500000,
                taxRate: 0.15,
                taxAmount: 75000,
                total: 575000,
                status: "PAID",
                date: new Date("2024-03-15")
            }
        ]

        for (const inv of invoices) {
            const existing = await (prisma as any).invoice.findFirst({ where: { invoiceNumber: inv.invoiceNumber } })
            if (!existing) {
                await (prisma as any).invoice.create({ data: inv })
                console.log(`  ✓ Invoice: ${inv.invoiceNumber}`)
            }
        }

        // Create Expenses
        const expenses = [
            {
                projectId: createdProjects[0].id,
                category: "Material",
                description: "مواد بناء - أسمنت وحديد",
                amountBeforeTax: 50000,
                taxRate: 0.15,
                taxAmount: 7500,
                totalAmount: 57500,
                isTaxRecoverable: true,
                date: new Date("2024-02-10")
            },
            {
                category: "Rent",
                description: "إيجار مكتب - فبراير 2024",
                amountBeforeTax: 15000,
                taxRate: 0.15,
                taxAmount: 2250,
                totalAmount: 17250,
                isTaxRecoverable: true,
                date: new Date("2024-02-01")
            },
            {
                category: "Salaries",
                description: "رواتب الموظفين - فبراير 2024",
                amountBeforeTax: 36000,
                taxRate: 0.15,
                taxAmount: 0,
                totalAmount: 36000,
                isTaxRecoverable: false,
                date: new Date("2024-02-28")
            }
        ]

        for (const exp of expenses) {
            await (prisma as any).expense.create({ data: exp })
        }
        console.log(`  ✓ Created ${expenses.length} expenses`)
    }

    // 4. Seed Leave Requests
    if (createdEmployees.length > 0) {
        console.log("🏖️ Creating Leave Requests...")
        const leaveRequests = [
            {
                employeeId: createdEmployees[0].id,
                type: "ANNUAL",
                startDate: new Date("2024-03-01"),
                endDate: new Date("2024-03-05"),
                days: 5,
                reason: "إجازة سنوية",
                status: "APPROVED"
            },
            {
                employeeId: createdEmployees[1].id,
                type: "SICK",
                startDate: new Date("2024-02-15"),
                endDate: new Date("2024-02-16"),
                days: 2,
                reason: "إجازة مرضية",
                status: "APPROVED"
            }
        ]

        for (const leave of leaveRequests) {
            await (prisma as any).leaveRequest.create({ data: leave })
        }
        console.log(`  ✓ Created ${leaveRequests.length} leave requests`)
    }

    console.log("✅ Demo Data Seeding Complete!")
}

// Execute if run directly
if (require.main === module) {
    seedDemoData()
        .then(async () => {
            await prisma.$disconnect()
        })
        .catch(async (e) => {
            console.error(e)
            await prisma.$disconnect()
            process.exit(1)
        })
}
