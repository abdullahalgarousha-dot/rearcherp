import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🚀 Starting Data Sync...')

    const users = await prisma.user.findMany()
    console.log(`Found ${users.length} users.`)

    for (const user of users) {
        const profile = await prisma.employeeProfile.findUnique({
            where: { userId: user.id }
        })

        if (!profile) {
            console.log(`Creating profile for: ${user.name} (${user.email})...`)

            const employeeCode = `FTS-${Math.floor(100 + Math.random() * 900)}`

            const newProfile = await prisma.employeeProfile.create({
                data: {
                    userId: user.id,
                    employeeCode,
                    position: 'Staff',
                    department: 'General',
                    leaveBalance: 30,
                }
            })

            await prisma.employeeHRStats.create({
                data: {
                    profileId: newProfile.id,
                    workHoursMonth: 0,
                    targetHours: 180,
                    annualLeaveTotal: 30,
                    annualLeaveUsed: 0,
                    emergencyLeaveTotal: 5,
                    emergencyLeaveUsed: 0,
                    sickLeaveTotal: 12,
                    sickLeaveUsed: 0,
                    remoteDaysTotal: 12,
                    remoteDaysUsed: 0,
                    exitPermitsTotal: 10,
                    exitPermitsUsed: 0,
                    overtimeHours: 0,
                }
            })

            console.log(`✅ Profile and Stats created for ${user.name}`)
        } else {
            // Ensure stats exist even if profile exists
            const stats = await prisma.employeeHRStats.findUnique({
                where: { profileId: profile.id }
            })
            if (!stats) {
                console.log(`Creating missing stats for: ${user.name}...`)
                await prisma.employeeHRStats.create({
                    data: {
                        profileId: profile.id,
                        workHoursMonth: 0,
                        targetHours: 180,
                        annualLeaveTotal: 30,
                        annualLeaveUsed: 0,
                    }
                })
                console.log(`✅ Stats created for ${user.name}`)
            }
        }
    }

    console.log('✨ Data Sync Complete!')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
