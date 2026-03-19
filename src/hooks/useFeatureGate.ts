"use client"

import { useSession } from "next-auth/react"

export type ModuleName = 'HR' | 'FINANCE' | 'GANTT' | 'ZATCA' | 'PROJECTS' | 'CRM' | 'FILE_UPLOAD'

export function useFeatureGate() {
    const { data: session } = useSession()
    const user = session?.user as any

    const checkFeature = (moduleName: ModuleName) => {
        if (!user) return false

        // 1. Check if plan exists
        if (user.planModules) {
            return user.planModules.includes(moduleName)
        }

        // 2. Fallback to tier (until session is refreshed with plan data)
        const tier = user.subscriptionTier || 'STANDARD'
        const tierMap: Record<string, ModuleName[]> = {
            'STANDARD': ['PROJECTS'],
            'PROFESSIONAL': ['PROJECTS', 'FINANCE', 'CRM'],
            'ENTERPRISE': ['PROJECTS', 'FINANCE', 'CRM', 'HR', 'GANTT', 'ZATCA', 'FILE_UPLOAD']
        }
        const allowed = tierMap[tier] || ['PROJECTS']
        return allowed.includes(moduleName)
    }

    return {
        checkFeature,
        isEnterprise: user?.subscriptionTier === 'ENTERPRISE' || user?.planName === 'Enterprise'
    }
}
