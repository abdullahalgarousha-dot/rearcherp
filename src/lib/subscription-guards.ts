import { db } from "@/lib/db"
import { auth } from "@/auth"

const ADMIN_ROLES = ['GLOBAL_SUPER_ADMIN', 'SUPER_ADMIN', 'ADMIN']

/**
 * Checks whether the tenant's plan allows adding another user.
 * Throws if the maxUsers limit is reached.
 */
export async function enforceUserLimit(tenantId: string): Promise<void> {
    const session = await auth()
    // Global super admins and Super Admins might bypass local limits? 
    // Usually only Global Super Admin bypasses, but User said "Admin roles bypass all limits" in feature-gate.ts
    // I'll stick to what was in feature-gate.ts for consistency.
    if ((session?.user as any)?.role === 'GLOBAL_SUPER_ADMIN') return

    const tenant = await (db as any).tenant.findUnique({
        where: { id: tenantId },
        include: { plan: true, _count: { select: { users: true } } }
    })

    if (!tenant) throw new Error("Organisation not found")
    if (!tenant.plan) return // No plan = no limits or legacy

    const maxUsers = tenant.plan.maxUsers || 0
    if (maxUsers === 0) return // Unlimited

    const currentCount = tenant._count.users || 0
    if (currentCount >= maxUsers) {
        throw new Error(`Limit reached: Please upgrade your plan to add more users. Current limit: ${maxUsers}`)
    }
}

/**
 * Checks whether the tenant's plan allows adding another branch.
 * Throws if the maxBranches limit is reached.
 */
export async function enforceBranchLimit(tenantId: string): Promise<void> {
    const session = await auth()
    if ((session?.user as any)?.role === 'GLOBAL_SUPER_ADMIN') return

    const tenant = await (db as any).tenant.findUnique({
        where: { id: tenantId },
        include: { plan: true, _count: { select: { branches: true } } }
    })

    if (!tenant) throw new Error("Organisation not found")
    if (!tenant.plan) return 

    const maxBranches = tenant.plan.maxBranches || 0
    if (maxBranches === 0) return // Unlimited

    const currentCount = tenant._count.branches || 0
    if (currentCount >= maxBranches) {
        throw new Error(`Limit reached: Please upgrade your plan to add more branches. Current limit: ${maxBranches}`)
    }
}

/**
 * Checks if the tenant is allowed to use a custom domain.
 */
export async function canUseCustomDomain(tenantId: string): Promise<boolean> {
    const tenant = await (db as any).tenant.findUnique({
        where: { id: tenantId },
        include: { plan: true }
    })
    
    if (!tenant || !tenant.plan) return false
    return tenant.plan.allowCustomDomain === true
}
