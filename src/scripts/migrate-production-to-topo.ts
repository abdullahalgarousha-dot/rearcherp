import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const databaseUrl = process.env.DATABASE_URL || ''
    
    // Safety check: Only run on Neon (Production)
    if (!databaseUrl.includes('neon.tech')) {
        console.error("❌ ABORTED: This script is restricted to the Production (Neon) database only.")
        console.error("Current DATABASE_URL does not match production patterns. Protecting local data.")
        process.exit(1)
    }

    console.log("🚀 STARTING PRODUCTION MIGRATION: REARCH -> TO-PO")

    try {
        // 1. Update Users emails: @rearch.sa -> @topo-eng.sa
        const users = await prisma.user.findMany({
            where: {
                email: { contains: '@rearch.sa' }
            }
        })

        console.log(`Found ${users.length} users with @rearch.sa emails.`)

        for (const user of users) {
            const newEmail = user.email.replace('@rearch.sa', '@topo-eng.sa')
            await prisma.user.update({
                where: { id: user.id },
                data: { email: newEmail }
            })
            console.log(`  ✅ Updated User ID ${user.id}: ${user.email} -> ${newEmail}`)
        }

        // 2. Update Tenant slugs & customDomains
        const tenants = await prisma.tenant.findMany({
            where: {
                OR: [
                    { slug: { contains: '.rearch.sa' } },
                    { customDomain: { contains: '.rearch.sa' } }
                ]
            }
        })

        console.log(`Found ${tenants.length} tenants with legacy domain references.`)

        for (const tenant of tenants) {
            const newSlug = tenant.slug.replace('.rearch.sa', '.topo-eng.sa')
            const newDomain = tenant.customDomain?.replace('.rearch.sa', '.topo-eng.sa') || null
            
            await prisma.tenant.update({
                where: { id: tenant.id },
                data: { 
                    slug: newSlug,
                    customDomain: newDomain
                }
            })
            console.log(`  ✅ Updated Tenant ${tenant.id}: Slug(${tenant.slug} -> ${newSlug}), Domain(${tenant.customDomain} -> ${newDomain})`)
        }

        console.log("🎉 PRODUCTION MIGRATION COMPLETE.")

    } catch (error) {
        console.error("❌ MIGRATION FAILED:", error)
    } finally {
        await prisma.$disconnect()
    }
}

main()
