import type { NextAuthConfig } from "next-auth"

/**
 * Edge-compatible auth config — no Prisma, no bcrypt.
 * Used by middleware.ts (Edge runtime).
 * The full auth.ts spreads this and adds the Credentials provider + events.
 */
export const authConfig = {
    trustHost: true,
    pages: {
        signIn: '/login',
    },
    providers: [], // providers added in auth.ts (Node runtime only)
    callbacks: {
        async jwt({ token, user, trigger, session }: any) {
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
            if (trigger === "update" && session?.user) {
                token.role = session.user.role
                token.permissions = session.user.permissions
            }
            return token
        },
        async session({ session, token }: any) {
            if (token && session.user) {
                (session.user as any).role = token.role
                ;(session.user as any).tenantId = token.tenantId
                ;(session.user as any).subscriptionTier = token.subscriptionTier
                ;(session.user as any).planId = token.planId
                ;(session.user as any).planName = token.planName
                ;(session.user as any).planModules = token.planModules
                ;(session.user as any).tenantStatus = token.tenantStatus
                ;(session.user as any).subscriptionEnd = token.subscriptionEnd
                ;(session.user as any).id = token.sub
                ;(session.user as any).permissions = token.permissions
                ;(session.user as any).setupCompleted = token.setupCompleted
            }
            return session
        },
    },
} satisfies NextAuthConfig
