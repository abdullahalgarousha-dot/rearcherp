import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { db as prisma } from "@/lib/db"
import bcrypt from "bcryptjs"
import { authConfig } from "./auth.config"

export const { handlers, auth, signIn, signOut } = NextAuth({
    ...authConfig,
    providers: [
        Credentials({
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            authorize: async (credentials) => {
                try {
                    if (!credentials?.email || !credentials?.password) {
                        return null
                    }

                    const email = (credentials.email as string).toLowerCase().trim()
                    const password = credentials.password as string

                    // EMERGENCY SUPER ADMIN BYPASS
                    const adminEmail = process.env.SUPER_ADMIN_EMAIL || "super@topo-eng.sa"
                    const adminPass = process.env.SUPER_ADMIN_PASSWORD || "password"

                    if (email === adminEmail && password === adminPass) {
                        return {
                            id: "super-admin-id",
                            email: adminEmail,
                            name: "Global Super Admin",
                            role: "GLOBAL_SUPER_ADMIN",
                            tenantId: "system",
                            tenantStatus: "ACTIVE",
                            setupCompleted: true,
                            planModules: ["HR", "FINANCE", "PROJECTS", "GANTT", "ZATCA", "CRM", "FILE_UPLOAD"]
                        }
                    }

                    const user = await (prisma as any).user.findFirst({
                        where: { email },
                        include: {
                            userRole: true,
                            tenant: {
                                include: {
                                    plan: true
                                }
                            }
                        }
                    })

                    if (!user) return null
                    if (!user.password) return null

                    const isPasswordValid = await bcrypt.compare(password, user.password)
                    if (!isPasswordValid) return null

                    // Role resolution: the DB `role` column may be 'GLOBAL_SUPER_ADMIN'
                    // (set by an emergency recovery script). That sentinel must never be
                    // overridden by whatever display name the assigned tenant Role carries
                    // (e.g. 'Emergency Admin'), because every RBAC check compares against
                    // the exact string 'GLOBAL_SUPER_ADMIN'.
                    const dbRole = (user as any).role as string | undefined
                    const assignedRoleName = (user as any).userRole?.name as string | undefined
                    const finalRole = dbRole === 'GLOBAL_SUPER_ADMIN'
                        ? 'GLOBAL_SUPER_ADMIN'
                        : (assignedRoleName || dbRole)

                    // Safe permission matrix parsing: Prisma may return the JSON column
                    // as a plain object (already parsed) or as a raw string, depending on
                    // the driver / SQLite vs Postgres. JSON.parse on an object throws.
                    let parsedPerms: any = null
                    const rawPerms = (user as any).userRole?.permissionMatrix
                    if (rawPerms != null) {
                        parsedPerms = typeof rawPerms === 'string'
                            ? (() => { try { return JSON.parse(rawPerms) } catch { return null } })()
                            : rawPerms  // already an object — use as-is
                    }

                    return {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        role: finalRole,
                        tenantId: (user as any).tenantId,
                        tenantSlug: (user as any).tenant?.slug ?? null,
                        subscriptionTier: (user as any).tenant?.subscriptionTier || 'STANDARD',
                        planId: (user as any).tenant?.planId,
                        planName: (user as any).tenant?.plan?.name,
                        planModules: (user as any).tenant?.plan?.allowedModules || [],
                        tenantStatus: (user as any).tenant?.status || 'ACTIVE',
                        subscriptionEnd: (user as any).tenant?.subscriptionEnd,
                        setupCompleted: (user as any).tenant?.setupCompleted ?? false,
                        permissions: parsedPerms
                    }
                } catch (error) {
                    console.error("[AUTH ERROR] Critical failure in authorize function:", error)
                    return null
                }
            },
        }),
    ],
    // events removed: SystemLog schema has no 'details' field, causing
    // PrismaClientValidationError on every login/logout. Logging can be
    // re-added once the schema field is aligned.
})
