import { auth } from "@/auth"

// Roles that automatically bypass the allowedRoles array check.
// GLOBAL_SUPER_ADMIN operates across all tenants (SaaS operator).
// SUPER_ADMIN is the top role within a single tenant.
const SUPER_ROLES = new Set(["SUPER_ADMIN", "GLOBAL_SUPER_ADMIN"])

/**
 * Server-side authentication + role guard.
 *
 * Usage:
 *   const user = await checkAuth(['ADMIN', 'HR_MANAGER'])
 *
 * Special values in allowedRoles:
 *   'ALL'  — any authenticated user passes (no role restriction)
 *
 * Role hierarchy:
 *   GLOBAL_SUPER_ADMIN and SUPER_ADMIN automatically bypass the
 *   allowedRoles check and are granted access to every route that
 *   calls checkAuth, regardless of what roles are listed.
 *
 * Throws:
 *   Error("Unauthorized")  — not logged in
 *   Error("Forbidden")     — wrong role
 */
export async function checkAuth(allowedRoles: string[]) {
    const session = await auth()

    // 1. Must be authenticated
    if (!session?.user) {
        throw new Error("Unauthorized: Please sign in.")
    }

    const user = session.user as any

    // 2. Super-role bypass — SUPER_ADMIN / GLOBAL_SUPER_ADMIN clear all role gates
    if (SUPER_ROLES.has(user.role)) {
        return user
    }

    // 3. 'ALL' sentinel — any authenticated user is allowed (no role restriction)
    if (allowedRoles.includes("ALL")) {
        return user
    }

    // 4. Strict role check
    if (!allowedRoles.includes(user.role)) {
        throw new Error(
            `Forbidden: role '${user.role}' is not authorised for this action. Required: ${allowedRoles.join(", ")}`
        )
    }

    return user
}
