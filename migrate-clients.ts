import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Starting client migration...')

    // 1. Fetch all projects
    const projects = await prisma.project.findMany()
    console.log(`Found ${projects.length} projects to process.`)

    let clientsCreated = 0
    let projectsUpdated = 0

    // 2. Process each project
    for (const project of projects) {
        // Skip if already linked or no legacy client name
        if (project.clientId || !project.legacyClientName) {
            continue
        }

        const clientName = project.legacyClientName.trim()

        // 3. Find or Create Client by Name
        let client = await prisma.client.findFirst({
            where: { name: { equals: clientName } }
        })

        if (!client) {
            // Generate next client code
            const count = await prisma.client.count()
            const code = `CLI-${1000 + count + 1}`

            client = await prisma.client.create({
                data: {
                    clientCode: code,
                    name: clientName,
                    address: project.legacyClientAddr,
                    taxNumber: project.legacyClientVat,
                    tenantId: project.tenantId
                }
            })
            clientsCreated++
            console.log(`Created new client: ${clientName} (${code})`)
        }

        // 4. Link Project to Client
        await prisma.project.update({
            where: { id: project.id },
            data: { clientId: client.id }
        })
        projectsUpdated++
        console.log(`Linked project ${project.code} to client ${clientName}`)
    }

    console.log('\nMigration complete!')
    console.log(`- New Clients created: ${clientsCreated}`)
    console.log(`- Projects linked: ${projectsUpdated}`)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
