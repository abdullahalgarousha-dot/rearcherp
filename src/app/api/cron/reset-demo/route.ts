import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { exec } from 'child_process'
import { promisify } from 'util'

const execPromise = promisify(exec)
const prisma = new PrismaClient()

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const secret = searchParams.get('secret')

    if (secret !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        console.log('👷 Resetting Demo Tenant...')

        const demoTenant = await prisma.tenant.findUnique({
            where: { slug: 'demo' }
        })

        if (demoTenant) {
            const tenantId = demoTenant.id

            // Delete relational data first (Prisma Cascade handles some, but let's be safe)
            // Due to RLS, we might need to be careful if we are running this in a context
            // But since this is a system-level cron, we use the raw prisma client.

            await prisma.invoice.deleteMany({ where: { tenantId } })
            await prisma.nCR.deleteMany({ where: { tenantId } })
            await prisma.dailyReport.deleteMany({ where: { tenantId } })
            await prisma.project.deleteMany({ where: { tenantId } })
            await prisma.employeeProfile.deleteMany({
                where: { user: { tenantId } }
            })
            await prisma.user.deleteMany({
                where: {
                    tenantId,
                    email: { not: 'admin@demo.rearch.sa' } // Keep the main admin if you want, or delete all
                }
            })
        }

        // Run the seed script
        const { stdout, stderr } = await execPromise('npx ts-node prisma/seed-demo.ts')

        if (stderr) {
            console.error('Seed Error:', stderr)
        }

        return NextResponse.json({
            success: true,
            message: 'Demo environment reset successfully',
            output: stdout
        })

    } catch (e: any) {
        console.error('Reset Demo Error:', e)
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
