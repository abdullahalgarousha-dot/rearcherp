import { PrismaClient } from '@prisma/client'
import { seedRoles } from "./seed-roles"
import { seedLookups } from "./seed-lookups"
import { seedProjectTypes } from "./seed-project-types"

const prisma = new PrismaClient()

async function main() {
    // 0. Seed Roles (RBAC)
    await seedRoles()

    // 0.1 Seed System Lookups
    await seedLookups()

    // 0.2 Seed Project Types
    await seedProjectTypes()

    // 1. Seed Menu Links
    // Clear existing links to prevent duplicates (since ID strategy changed)
    await (prisma as any).menuLink.deleteMany({})
    // Note: Do NOT delete users here - they have foreign key constraints

    const links = [
        { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard", order: 1 },
        { label: "Projects", href: "/admin/projects", icon: "Briefcase", order: 2 },
        { label: "Supervision", href: "/admin/supervision", icon: "Eye", order: 3 },
        { label: "Brands", href: "/admin/brands", icon: "Building2", order: 4 },
        { label: "HR", href: "/admin/hr", icon: "Users", order: 5 },
        { label: "Users", href: "/admin/users", icon: "UserCog", order: 6 },
        { label: "Menu", href: "/admin/menu", icon: "Menu", order: 7 },
        { label: "Settings", href: "/settings", icon: "Settings", order: 7 },
        { label: "CEO Dashboard", href: "/admin/dashboard/ceo", icon: "TrendingUp", order: 8 },
        { label: "Reports", href: "/admin/reports/employees", icon: "FileBarChart", order: 10 },
    ]

    for (const link of links) {
        await (prisma as any).menuLink.create({
            data: { ...link, id: link.label } // Force ID to be label for stability
        })
    }

    // 2. Seed Brands
    const brands = [
        {
            nameEn: "FTS",
            nameAr: "اف تي اس",
            shortName: "FTS",
            fullName: "FTS Architectural & Engineering Consultancy",
            logoUrl: "/logos/fts.png"
        },
        {
            nameEn: "SUD",
            nameAr: "سود",
            shortName: "SUD",
            fullName: "Saudi Urban Design",
            logoUrl: "/logos/sud.png"
        },
        {
            nameEn: "3co",
            nameAr: "ثريكو",
            shortName: "3CO",
            fullName: "The Third Company",
            logoUrl: "/logos/3co.png"
        },
    ]

    for (const brand of brands) {
        const b = await prisma.brand.findFirst({ where: { nameEn: brand.nameEn } })
        if (!b) {
            await prisma.brand.create({ data: brand })
        }
    }

    // 3. Seed Users
    // Hash for "password"
    const password = "$2b$10$UGwwNIIDuFFRnDj/njmKJeOy9/FtDIAO8Cob2rtKtvu6hZz4zNmpi"

    const users = [
        { id: "cm76c5b960000uxm96s5wun9o", email: "admin@fts.com", name: "FAWZI TALAL SULIMANI", role: "ADMIN" },
        { id: "cm76c5b960000uxm96s5wun9a", email: "eng1@fts.com", name: "Ahmed Engineer", role: "DESIGN_ENGINEER" },
        { id: "cm76c5b960000uxm96s5wun9b", email: "eng2@fts.com", name: "Sara Site", role: "SITE_ENGINEER" },
    ]

    for (const user of users) {
        const role = await (prisma as any).role.findUnique({ where: { name: user.role } })
        console.log(`User: ${user.email}, Role: ${user.role} -> Found Role ID: ${role?.id}`)

        await (prisma as any).user.upsert({
            where: { email: user.email },
            create: { ...user, password, roleId: role?.id },
            update: { role: user.role, name: user.name, roleId: role?.id }
        })
    }

    // 4. Seed Demo Data (Inline)
    console.log("🌱 Seeding Demo Data...")

    const ftsBrand = await prisma.brand.findFirst({ where: { nameEn: "FTS" } })
    if (ftsBrand) {
        // Create 3 sample projects
        const projects = [
            { code: "FTS-2024-001", name: "فيلا سكنية - الرياض", legacyClientName: "عبدالله بن سعد", legacyClientAddr: "الرياض - حي النرجس", brandId: ftsBrand.id, contractValue: 850000, year: 2024, sequence: 1, serviceType: "DESIGN" },
            { code: "FTS-2024-002", name: "مجمع تجاري - جدة", legacyClientName: "شركة الأفق التجارية", legacyClientAddr: "جدة - طريق الملك", brandId: ftsBrand.id, contractValue: 2500000, year: 2024, sequence: 2, serviceType: "SUPERVISION" },
            { code: "FTS-2023-015", name: "مسجد حي الورود", legacyClientName: "وزارة الشؤون الإسلامية", legacyClientAddr: "الرياض - حي الورود", brandId: ftsBrand.id, contractValue: 1200000, year: 2023, sequence: 15, serviceType: "DESIGN" }
        ]

        for (const proj of projects) {
            const existing = await (prisma as any).project.findFirst({ where: { code: proj.code } })
            if (!existing) {
                await (prisma as any).project.create({ data: proj })
                console.log(`  ✓ Project: ${proj.name}`)
            }
        }

        // Create sample employees
        const employees = [
            { name: "أحمد محمد", nameEn: "Ahmed Mohammed", position: "مهندس موقع", department: "الإشراف الهندسي", email: "ahmed.m@fts.com", nationality: "Saudi", idNumber: "1234567890", joiningDate: new Date("2023-01-15"), basicSalary: 8000, status: "ACTIVE" },
            { name: "سارة عبدالله", nameEn: "Sara Abdullah", position: "مهندسة تصميم", department: "التصميم المعماري", email: "sara.a@fts.com", nationality: "Saudi", idNumber: "2345678901", joiningDate: new Date("2023-03-01"), basicSalary: 9000, status: "ACTIVE" }
        ]

        for (const emp of employees) {
            const existing = await (prisma as any).employeeProfile.findFirst({
                where: { user: { email: emp.email } }
            })
            if (!existing) {
                const user = await prisma.user.findUnique({ where: { email: emp.email } })
                if (user) {
                    const { email, ...empData } = emp
                    await (prisma as any).employeeProfile.create({
                        data: {
                            ...empData,
                            userId: user.id
                        }
                    })
                    console.log(`  ✓ Employee Profile created for: ${emp.nameEn}`)
                } else {
                    console.log(`  ⚠ Skipping Employee Profile: User not found for ${emp.email}`)
                }
            }
        }

        console.log("✅ Demo Data Complete!")
    }

    console.log("Seeding completed.")
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
export { }
