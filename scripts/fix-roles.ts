import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

const FULL_MATRIX = {
    projects: { view: 'ALL', createEdit: true, approve: true, delete: true, canAccessDrive: true },
    supervision: { view: 'ALL', manageDSR: true, manageIR: true, manageNCR: true, deleteReports: true },
    hr: { view: 'ALL_BRANCHES', createEdit: true, approveLeaves: true, delete: true, viewOfficialDocs: true, viewMedicalLeaves: true },
    finance: { masterVisible: true, viewContracts: true, viewVATReports: true, viewSalarySheets: true, manageLoans: true },
    system: { manageSettings: true, manageRoles: true, viewLogs: true, viewAnalytics: true }
}

async function main() {
    console.log('🔄 Synchronizing core roles...')

    const rolesToUpdate = ['ADMIN', 'SUPER_ADMIN']

    for (const roleName of rolesToUpdate) {
        await (prisma as any).role.upsert({
            where: { name: roleName },
            update: {
                permissionMatrix: JSON.stringify(FULL_MATRIX)
            },
            create: {
                name: roleName,
                description: `Full access ${roleName} role`,
                permissionMatrix: JSON.stringify(FULL_MATRIX)
            }
        })
        console.log(`✅ Role ${roleName} updated with full matrix.`)
    }

    // Link admin user to ADMIN role if not linked
    const adminUser = await (prisma as any).user.findUnique({
        where: { email: 'admin@fts.com' }
    })

    if (adminUser) {
        const adminRole = await (prisma as any).role.findUnique({ where: { name: 'ADMIN' } })
        if (adminRole) {
            await (prisma as any).user.update({
                where: { email: 'admin@fts.com' },
                data: { roleId: adminRole.id }
            })
            console.log('✅ Admin user linked to ADMIN role ID.')
        }
    }

    console.log('🏁 Done.')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
