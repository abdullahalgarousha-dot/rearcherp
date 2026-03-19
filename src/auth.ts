import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { db as prisma } from "@/lib/db"
import bcrypt from "bcryptjs"

export const { handlers, auth, signIn, signOut } = NextAuth({
    trustHost: true,
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

                    // 1. EMERGENCY SUPER ADMIN BYPASS
                    // Allows bypass if DB is locked or seeder hasn't run
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

                    // 2. Regular User Lookup
                    // Using findFirst instead of findUnique to avoid strictly enforced unique-only where clauses in some extensions
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

                    // Verify Password using bcrypt
                    const isPasswordValid = await bcrypt.compare(password, user.password)

                    if (!isPasswordValid) return null

                    // Return user with role relations and tenantId
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
                        permissions: (user as any).userRole?.permissionMatrix ? JSON.parse((user as any).userRole.permissionMatrix) : null
                    }
                } catch (error) {
                    console.error("[AUTH ERROR] Critical failure in authorize function:", error)
                    return null
                }
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user, trigger, session }) {
            // Initial sign in
            if (user) {
                token.role = (user as any).role
                token.tenantId = (user as any).tenantId
                token.subscriptionTier = (user as any).subscriptionTier
                token.planId = (user as any).planId
                token.planName = (user as any).planName
                token.planModules = (user as any).planModules
                token.tenantStatus = (user as any).tenantStatus
                token.subscriptionEnd = (user as any).subscriptionEnd
                token.permissions = (user as any).permissions
                token.setupCompleted = (user as any).setupCompleted
            }

            // Refetch on update
            if (trigger === "update" && session?.user) {
                token.role = session.user.role
                token.permissions = session.user.permissions
            }

            return token
        },
        async session({ session, token }) {
            if (token && session.user) {
                (session.user as any).role = token.role;
                (session.user as any).tenantId = token.tenantId;
                (session.user as any).subscriptionTier = token.subscriptionTier;
                (session.user as any).planId = token.planId;
                (session.user as any).planName = token.planName;
                (session.user as any).planModules = token.planModules;
                (session.user as any).tenantStatus = token.tenantStatus;
                (session.user as any).subscriptionEnd = token.subscriptionEnd;
                (session.user as any).id = token.sub;
                (session.user as any).permissions = token.permissions;
                (session.user as any).setupCompleted = token.setupCompleted;
            }
            return session
        },
    },
    events: {
        async signIn(message: any) {
            // message.user contains the authorized user
            try {
                if (message.user?.id) {
                    await (prisma as any).systemLog.create({
                        data: {
                            userId: message.user.id,
                            action: "LOGIN",
                            details: JSON.stringify({
                                provider: message.account?.provider || "credentials"
                            })
                        }
                    })
                }
            } catch (e) {
                console.error("Failed to log sign-in event:", e)
            }
        },
        async signOut(message: any) {
            try {
                const userId = message?.token?.sub;
                if (userId) {
                    await (prisma as any).systemLog.create({
                        data: {
                            userId,
                            action: "LOGOUT",
                            details: JSON.stringify({ source: "NextAuth" })
                        }
                    })
                }
            } catch (e) {
                console.error("Failed to log sign-out event:", e)
            }
        }
    },
    pages: {
        signIn: '/login',
    },
})
