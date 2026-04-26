import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function seedPlans() {
    console.log('🚀 Seeding Subscription Plans...')

    const plans = [
        {
            name: 'Basic',
            description: 'Essential tools for small teams.',
            price: 500,
            currency: 'SAR',
            allowedModules: ["ALL"],
            maxUsers: 5,
            maxBranches: 1,
            allowCustomDomain: false
        },
        {
            name: 'Growth',
            description: 'Expanding capabilities for growing firms.',
            price: 1500,
            currency: 'SAR',
            allowedModules: ["ALL"],
            maxUsers: 25,
            maxBranches: 10,
            allowCustomDomain: true
        },
        {
            name: 'Elite',
            description: 'Full-scale enterprise management.',
            price: 5000,
            currency: 'SAR',
            allowedModules: ["ALL"],
            maxUsers: 100,
            maxBranches: 0, // Unlimited
            allowCustomDomain: true
        }
    ]

    for (const plan of plans) {
        await (prisma as any).subscriptionPlan.upsert({
            where: { name: plan.name },
            update: plan,
            create: plan
        })
        console.log(`  ✓ Plan: ${plan.name}`)
    }

    console.log('✅ Subscription Plans Seeded!')
}

