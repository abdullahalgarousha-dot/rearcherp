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
                    const adminEmail = process.env.SUPER_ADMIN_EMAIL || "super@rearch.sa"
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

                    return {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        role: (user as any).userRole?.name || (user as any).role,
                        tenantId: (user as any).tenantId,
                        subscriptionTier: (user as any).tenant?.subscriptionTier || 'STANDARD',
                        planId: (user as any).tenant?.planId,
                        planName: (user as any).tenant?.plan?.name,
                        planModules: (user as any).tenant?.plan?.allowedModules || [],
                        tenantStatus: (user as any).tenant?.status || 'ACTIVE',
                        subscriptionEnd: (user as any).tenant?.subscriptionEnd,
                        setupCompleted: (user as any).tenant?.setupCompleted ?? false,
                        permissions: (user as any).userRole?.permissionMatrix
                            ? JSON.parse((user as any).userRole.permissionMatrix)
                            : null
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
