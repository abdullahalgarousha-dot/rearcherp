import { auth } from "@/auth"
import { db } from "@/lib/db"

// ─────────────────────────────────────────────────────────────────────────────
// PERMISSION MATRIX — the canonical shape for all permission data.
// This interface is the single schema for what gets stored in the DB
// (Role.permissionMatrix JSON) and carried in the JWT (user.permissions).
// ─────────────────────────────────────────────────────────────────────────────

export interface PermissionMatrix {
    projects: {
        view: 'ALL' | 'ASSIGNED' | 'NONE';
        createEdit: boolean;
        approve: boolean;
        delete: boolean;
        canAccessDrive: boolean;
    };
    supervision: {
        view: 'ALL' | 'ASSIGNED' | 'NONE';
        manageDSR: boolean;
        manageIR: boolean;
        manageNCR: boolean;
        approve: boolean;
        deleteReports: boolean;
    };
    hr: {
        view: 'ALL_BRANCHES' | 'ASSIGNED_BRANCH' | 'NONE';
        createEdit: boolean;
        approveLeaves: boolean;
        delete: boolean;
        viewOfficialDocs: boolean;
        viewMedicalLeaves: boolean;
    };
    finance: {
        masterVisible: boolean;
        viewContracts: boolean;
        viewVATReports: boolean;
        viewSalarySheets: boolean;
        manageLoans: boolean;
        canApproveFinance: boolean;
    };
    system: {
        manageSettings: boolean;
        manageRoles: boolean;
        viewLogs: boolean;
        viewAnalytics: boolean;
    };
    crm: {
        view: boolean;
        createEdit: boolean;
        delete: boolean;
    };
}

// Internal deny-all used only as a safe fallback when no permissions are found.
// Not exported — callers must not depend on this constant directly.
const DENY_ALL: PermissionMatrix = {
    projects:   { view: 'NONE',          createEdit: false, approve: false, delete: false, canAccessDrive: false },
    supervision:{ view: 'NONE',          manageDSR: false, manageIR: false, manageNCR: false, approve: false, deleteReports: false },
    hr:         { view: 'NONE',          createEdit: false, approveLeaves: false, delete: false, viewOfficialDocs: false, viewMedicalLeaves: false },
    finance:    { masterVisible: false,  viewContracts: false, viewVATReports: false, viewSalarySheets: false, manageLoans: false, canApproveFinance: false },
    system:     { manageSettings: false, manageRoles: false, viewLogs: false, viewAnalytics: false },
    crm:        { view: false,           createEdit: false, delete: false },
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Safely reads a nested field from an untrusted JSON object, returning the
 * DENY_ALL fallback value if the path doesn't exist or the type mismatches.
 */
function readPermission<K extends keyof PermissionMatrix>(
    perms: Partial<PermissionMatrix> | null | undefined,
    module: K,
    action: keyof PermissionMatrix[K]
): PermissionMatrix[K][typeof action] {
    const modulePerms = perms?.[module] as PermissionMatrix[K] | undefined
    if (modulePerms && action in modulePerms && modulePerms[action] !== undefined) {
        return modulePerms[action]
    }
    return DENY_ALL[module][action]
}

/**
 * Parses the permission matrix from the session JWT.
 * Returns null if no permissions blob is present.
 */
function sessionPermissions(user: any): Partial<PermissionMatrix> | null {
    const raw = user?.permissions
    if (!raw) return null
    if (typeof raw === 'object') return raw as Partial<PermissionMatrix>
    if (typeof raw === 'string') {
        try { return JSON.parse(raw) as Partial<PermissionMatrix> } catch { return null }
    }
    return null
}

// ─────────────────────────────────────────────────────────────────────────────
// hasPermission — granular field-level check
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the value of a specific permission field from the caller's session.
 *
 * - GLOBAL_SUPER_ADMIN: always returns the maximally-permissive value for that field.
 * - Everyone else: reads from user.permissions (JWT), falls back to DENY_ALL.
 *   No hardcoded role maps — the DB is the sole source of truth at login time.
 */
export async function hasPermission<K extends keyof PermissionMatrix>(
    module: K,
    action: keyof PermissionMatrix[K]
): Promise<PermissionMatrix[K][keyof PermissionMatrix[K]]> {
    const session = await auth()
    if (!session?.user) return DENY_ALL[module][action]

    const user = session.user as any

    // TARGET 1: ONLY the SaaS operator bypasses all permission checks.
    // Tenant ADMIN accounts are subject to their purchased PermissionMatrix.
    if (user.role === 'GLOBAL_SUPER_ADMIN') {
        // Return maximally-permissive value for this field type
        const denyValue = DENY_ALL[module][action]
        if (typeof denyValue === 'boolean') return true as any
        if (denyValue === 'NONE') {
            // Return the broadest view scope for this module
            if (module === 'hr') return 'ALL_BRANCHES' as any
            return 'ALL' as any
        }
        return denyValue // shouldn't reach here but safe fallback
    }

    // TARGET 2: Read purely from session-carried permissions — no hardcoded maps.
    const perms = sessionPermissions(user)
    return readPermission(perms, module, action)
}

// ─────────────────────────────────────────────────────────────────────────────
// checkPermission — coarse boolean gate used by Server Actions and pages
// ─────────────────────────────────────────────────────────────────────────────

export type ModuleName = 'HR' | 'FINANCE' | 'PROJECTS' | 'SUPERVISION' | 'USERS' | 'ROLES' | 'SETTINGS' | 'LOGS' | 'ANALYTICS'
export type ActionType = 'read' | 'write' | 'approve'

/**
 * Resolves a coarse module+action check to a boolean.
 *
 * Resolution order:
 *   1. GLOBAL_SUPER_ADMIN → always true.
 *   2. user.permissions (JWT) → maps granular fields to the requested action.
 *   3. DB fallback (RolePermission) — strictly scoped to tenantId to prevent
 *      cross-tenant IDOR via roleName collision.
 */
export async function checkPermission(module: ModuleName, action: ActionType): Promise<boolean> {
    const session = await auth()
    if (!session?.user) return false

    const user = session.user as any
    const role = user.role as string
    const tenantId = user.tenantId as string | undefined

    // TARGET 1: Only GLOBAL_SUPER_ADMIN is a master key.
    if (role === 'GLOBAL_SUPER_ADMIN') return true

    // TARGET 2: Read from session permissions — no ROLE_PERMISSIONS_MAP fallback.
    const perms = sessionPermissions(user)
    if (perms) {
        return resolveModuleAction(perms, module, action)
    }

    // TARGET 3: DB fallback — MUST be scoped to tenantId.
    // roleName alone is not unique across a multi-tenant SaaS.
    if (!tenantId) return false

    try {
        const dbPerm = await (db as any).rolePermission.findUnique({
            where: {
                tenantId_roleName_module: { tenantId, roleName: role, module }
            },
            select: { canRead: true, canWrite: true, canApprove: true }
        })
        if (!dbPerm) return false
        if (action === 'read')    return dbPerm.canRead
        if (action === 'write')   return dbPerm.canWrite
        if (action === 'approve') return dbPerm.canApprove
        return false
    } catch {
        return false
    }
}

/**
 * Maps a coarse (module, action) pair to the appropriate PermissionMatrix field(s).
 * All unmapped cases default to false — no hidden grants.
 */
function resolveModuleAction(
    perms: Partial<PermissionMatrix>,
    module: ModuleName,
    action: ActionType
): boolean {
    switch (module) {
        case 'PROJECTS':
            if (action === 'read')    return perms.projects?.view !== 'NONE' && perms.projects?.view !== undefined
            if (action === 'write')   return perms.projects?.createEdit === true
            if (action === 'approve') return perms.projects?.approve === true
            return false

        case 'SUPERVISION':
            if (action === 'read')    return perms.supervision?.view !== 'NONE' && perms.supervision?.view !== undefined
            if (action === 'write')   return perms.supervision?.manageDSR === true
            if (action === 'approve') return perms.supervision?.approve === true
            return false

        case 'HR':
            if (action === 'read')    return perms.hr?.view !== 'NONE' && perms.hr?.view !== undefined
            if (action === 'write')   return perms.hr?.createEdit === true
            if (action === 'approve') return perms.hr?.approveLeaves === true
            return false

        case 'FINANCE':
            if (action === 'read')    return perms.finance?.masterVisible === true
            if (action === 'write')   return perms.finance?.masterVisible === true
            if (action === 'approve') return perms.finance?.canApproveFinance === true
            return false

        case 'SETTINGS':
            return perms.system?.manageSettings === true

        case 'ROLES':
        case 'USERS':
            return perms.system?.manageRoles === true

        case 'LOGS':
            return perms.system?.viewLogs === true

        case 'ANALYTICS':
            return perms.system?.viewAnalytics === true

        default:
            return false
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Convenience helpers
// ─────────────────────────────────────────────────────────────────────────────

export async function hasAnyPermission(modules: ModuleName[], action: ActionType): Promise<boolean> {
    for (const module of modules) {
        if (await checkPermission(module, action)) return true
    }
    return false
}
