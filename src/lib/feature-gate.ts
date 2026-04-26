import { db } from "@/lib/db"
import { auth } from "@/auth"

export type ModuleName = 'HR' | 'FINANCE' | 'GANTT' | 'ZATCA' | 'PROJECTS' | 'CRM' | 'FILE_UPLOAD'

const ADMIN_ROLES = ['GLOBAL_SUPER_ADMIN', 'SUPER_ADMIN', 'ADMIN']

export async function checkFeatureGate(tenantId: string, moduleName: ModuleName): Promise<boolean> {
    // All modules are now unlocked for all tiers per TO-PO rebranding.
    // Limits apply only to resources (Users, Branches) and Custom Domains.
    return true
}

/**
 * Server Action/Prop helper to throw if module is not in plan
 */
export async function enforceFeature(moduleName: ModuleName) {
    const session = await auth()
    if (!session?.user) throw new Error("Authentication required")

    if (ADMIN_ROLES.includes((session.user as any).role)) return

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
    // Admin roles bypass all limits
    if (ADMIN_ROLES.includes((session?.user as any)?.role)) return

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
