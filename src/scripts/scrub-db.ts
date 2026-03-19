import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function scrubModel(modelName: string, relationToInferred?: { model: string, field: string, relationField: string }) {
    console.log(`\n🔍 Scrubbing ${modelName}...`)

    try {
        // 1. Find orphans (tenantId is 't_undefined')
        // We only check for 't_undefined' because most fields in our schema are non-nullable with this default.
        const orphans = await (prisma as any)[modelName].findMany({
            where: {
                tenantId: 't_undefined'
            },
            include: relationToInferred ? { [relationToInferred.relationField]: true } : undefined
        })

        if (orphans.length === 0) {
            console.log(`✅ No orphans found in ${modelName}.`)
            return
        }

        console.log(`⚠️ Found ${orphans.length} orphans in ${modelName}. Attempting recovery...`)

        let fixedCount = 0

        for (const orphan of orphans) {
            let inferredTenantId = null

            // Try to infer from relations if possible
            if (relationToInferred) {
                const relationRecord = orphan[relationToInferred.relationField]
                if (relationRecord && relationRecord.tenantId && relationRecord.tenantId !== 't_undefined') {
                    inferredTenantId = relationRecord.tenantId
                }
            }

            if (inferredTenantId) {
                await (prisma as any)[modelName].update({
                    where: { id: orphan.id },
                    data: { tenantId: inferredTenantId }
                })
                fixedCount++
            } else {
                console.log(`❌ Could not infer tenantId for ${modelName} ID: ${orphan.id}`)
            }
        }

        console.log(`📊 ${modelName} Result: ${fixedCount} fixed, ${orphans.length - fixedCount} remaining.`)
    } catch (error: any) {
        console.error(`❌ Error scrubbing ${modelName}:`, error.message)
    }
}

async function main() {
    console.log("🚀 Starting Database Scrubbing Process...")

    try {
        // Ensure 'system' tenant exists
        await (prisma as any).tenant.upsert({
            where: { slug: 'system' },
            update: {},
            create: {
                id: 'system',
                slug: 'system',
                name: 'System Foundation',
                status: 'ACTIVE',
                subscriptionTier: 'ENTERPRISE'
            }
        })

        // Scrub core models
        await scrubModel('user')
        await scrubModel('project')
        await scrubModel('task', { model: 'project', field: 'id', relationField: 'project' })
        await scrubModel('dailyReport', { model: 'project', field: 'id', relationField: 'project' })
        await scrubModel('invoice', { model: 'project', field: 'id', relationField: 'project' })
        await scrubModel('expense', { model: 'project', field: 'id', relationField: 'project' })
        await scrubModel('timeLog', { model: 'user', field: 'id', relationField: 'user' })
        await scrubModel('attendance', { model: 'user', field: 'id', relationField: 'user' })
        await scrubModel('role')
        await scrubModel('vendor')
        await scrubModel('client')
        await scrubModel('drawing', { model: 'project', field: 'id', relationField: 'project' })

        // Handle remaining 't_undefined' in AuditLog by moving to 'system'
        const auditCount = await (prisma as any).auditLog.updateMany({
            where: { tenantId: 't_undefined' },
            data: { tenantId: 'system' }
        })
        console.log(`\n🛡️ AuditLog: Moved ${auditCount.count} orphaned logs to 'system' tenant.`)

        console.log("\n🏁 Scrubbing session finished.")
    } catch (e: any) {
        console.error("Fatal Error in main:", e.message)
    }
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
