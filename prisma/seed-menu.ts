import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const links = [
        { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard", order: 1 },
        { label: "Projects", href: "/admin/projects", icon: "Briefcase", order: 2 },
        { label: "Brands", href: "/admin/brands", icon: "Building2", order: 3 },
        { label: "Users", href: "/admin/users", icon: "Users", order: 4 },
        { label: "Menu", href: "/admin/menu", icon: "Menu", order: 5 },
        { label: "Reports", href: "/admin/reports/employees", icon: "FileBarChart", order: 6 },
        { label: "Settings", href: "/settings", icon: "Settings", order: 7 },
        { label: "CEO Dashboard", href: "/admin/dashboard/ceo", icon: "TrendingUp", order: 8 },
    ]

    for (const link of links) {
        await (prisma as any).menuLink.upsert({
            where: { id: link.label }, // Using label as temp ID or allow auto-gen if unique constraint existed. Ideally upsert by href or label.
            // Since no unique constraint on label, we'll just create if empty or delete all first.
            // For simplicity in this script, we'll create directly.
            create: link,
            update: link,
        }).catch(async () => {
            // Fallback if upsert fails on ID
            await (prisma as any).menuLink.create({ data: link })
        })
    }
    console.log("Seeded MenuLinks")
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
