import { seedDemoTenant } from './src/lib/demo-seeder'

async function runSeeder() {
    console.log("🌱 Manually triggering demo seeder...")
    const result = await seedDemoTenant()
    console.log("Result:", JSON.stringify(result, null, 2))
}

runSeeder().catch(err => {
    console.error("Seeder failed:", err)
    process.exit(1)
})
