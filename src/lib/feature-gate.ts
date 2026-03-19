import { db } from "@/lib/db"
import { auth } from "@/auth"

export type ModuleName = 'HR' | 'FINANCE' | 'GANTT' | 'ZATCA' | 'PROJECTS' | 'CRM' | 'FILE_UPLOAD'

export async function checkFeatureGate(tenantId: string, moduleName: ModuleName): Promise<boolean> {
    const session = await auth()
    if ((session?.user as any)?.role === 'GLOBAL_SUPER_ADMIN') return true

    // 1. Fetch Tenant with Plan info
    const tenant = await (db as any).tenant.findUnique({
        where: { id: tenantId },
        include: { plan: true }
    })

    if (!tenant) return false

    // 2. Fallback for older data (mapped from subscriptionTier)
    if (!tenant.planId) {
        const tier = tenant.subscriptionTier // STANDARD, PROFESSIONAL, ENTERPRISE
        const tierMap: Record<string, ModuleName[]> = {
            'STANDARD': ['PROJECTS'],
            'PROFESSIONAL': ['PROJECTS', 'FINANCE', 'CRM'],
            'ENTERPRISE': ['PROJECTS', 'FINANCE', 'CRM', 'HR', 'GANTT', 'ZATCA', 'FILE_UPLOAD']
        }
        const allowed = tierMap[tier] || ['PROJECTS']
        return allowed.includes(moduleName)
    }

    // 3. Dynamic Plan Check
    const allowedModules = (tenant.plan?.allowedModules as string[]) || []
    return allowedModules.includes(moduleName)
}

/**
 * Server Action/Prop helper to throw if module is not in plan
 */
export async function enforceFeature(moduleName: ModuleName) {
    const session = await auth()
    if (!session?.user) throw new Error("Authentication required")

    if ((session.user as any).role === 'GLOBAL_SUPER_ADMIN') return

    const tenantId = (session.user as any).tenantId
    const isAllowed = await checkFeatureGate(tenantId, moduleName)

    if (!isAllowed) {
        throw new Error(`Module ${moduleName} is not available in your current plan. Please upgrade to access this feature.`)
    }
}

/**
 * Checks whether the tenant's plan allows adding another user.
 * Throws if the maxUsers limit would be exceeded.
 * Call this inside any user-creation server action.
 *
 * maxUsers = 0 means unlimited.
 */
export async function enforceUserLimit(tenantId: string): Promise<void> {
    const session = await auth()
    // Super admins bypass all limits
    if ((session?.user as any)?.role === 'GLOBAL_SUPER_ADMIN') return

    const tenant = await (db as any).tenant.findUnique({
        where: { id: tenantId },
        include: { plan: true, _count: { select: { users: true } } }
    })

    if (!tenant) throw new Error("Tenant not found")

    const maxUsers: number = tenant.plan?.maxUsers ?? 0
    if (maxUsers === 0) return // 0 = unlimited

    const currentCount: number = tenant._count?.users ?? 0
    if (currentCount >= maxUsers) {
        throw new Error(
            `User limit reached. Your plan allows a maximum of ${maxUsers} users. ` +
            `Please upgrade your subscription to add more users.`
        )
    }
}
