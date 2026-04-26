import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('--- DATABASE CHECK ---')
    try {
        const user = await prisma.user.findUnique({
            where: { email: 'super@topo-eng.sa' },
            include: { userRole: true, tenant: true }
        })

        if (user) {
            console.log('Super Admin User Found:')
            console.log(JSON.stringify({
                id: user.id,
                email: user.email,
                role: user.role, // String role
                roleId: user.roleId,
                roleName: user.userRole?.name,
                tenantId: user.tenantId,
                tenantSlug: user.tenant?.slug,
                hasPassword: !!user.password
            }, null, 2))
        } else {
            console.log('Super Admin User NOT FOUND in database.')
        }

        const roles = await prisma.role.findMany()
        console.log('Available Roles:', roles.map(r => r.name))

        const tenants = await prisma.tenant.findMany()
        console.log('Available Tenants:', tenants.map(t => ({ id: t.id, slug: t.slug })))

    } catch (e) {
        console.error('Database query error:', e)
    } finally {
        await prisma.$disconnect()
    }
}

main()
