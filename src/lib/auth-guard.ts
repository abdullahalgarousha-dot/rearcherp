import { auth } from "@/auth"

export async function checkAuth(allowedRoles: string[]) {
    const session = await auth()

    // 1. Check if logged in
    if (!session || !session.user) {
        throw new Error("Unauthorized: Please sign in.")
    }

    const user = session.user as any

    // 2. Check Role (Super Admin bypass or explicit role check)
    // Assuming 'ADMIN' is a super role, or just strict checking as requested.
    // If allowedRoles is empty, maybe just check authentication? 
    // User asked: If user role is NOT in allowedRoles -> Throw 'Forbidden'

    // Helper: If allowedRoles includes 'ALL', allow any authenticated user
    if (allowedRoles.includes('ALL')) {
        return user
    }

    if (!allowedRoles.includes(user.role)) {
        throw new Error(`Forbidden: User role '${user.role}' is not authorized. Required: ${allowedRoles.join(', ')}`)
    }

    return user
}
