'use server'

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { hasPermission } from "@/lib/rbac"

export async function getProjectCosts() {
    const session = await auth()
    const canReadFinance = await hasPermission('finance', 'masterVisible')
    const isGlobalAdmin = (session?.user as any)?.role === 'GLOBAL_SUPER_ADMIN'

    if (!session || (!canReadFinance && !isGlobalAdmin)) {
        throw new Error("Unauthorized")
    }

    const tenantId = (session?.user as any).tenantId
    if (!tenantId) return []

    try {
        const projects = await db.project.findMany({
            where: isGlobalAdmin ? {} : { tenantId },
            include: {
                timeLogs: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        const projectsWithCosts = projects.map((project: any) => {
            let totalHours = 0
            let estimatedCost = 0
            const engineerMap = new Map<string, { engineerName: string; hours: number; cost: number; hourlyRate: number }>()

            project.timeLogs.forEach((log: any) => {
                const hours = log.hoursLogged || 0
                
                // ERP Principle: Use the immutable saved cost from the database recorded at the time of log entry
                const cost = log.cost || 0
                const derivedHourlyRate = hours > 0 ? cost / hours : 0

                totalHours += hours
                estimatedCost += cost

                const engineerId = log.user?.id || 'unknown'
                const engineerName = log.user?.name || 'Unknown Engineer'

                if (engineerMap.has(engineerId)) {
                    const existing = engineerMap.get(engineerId)!
                    existing.hours += hours
                    existing.cost += cost
                } else {
                    engineerMap.set(engineerId, { engineerName, hours, cost, hourlyRate: derivedHourlyRate })
                }
            })

            return {
                id: project.id,
                name: project.name,
                code: project.code,
                status: project.status,
                totalHours,
                estimatedCost,
                engineerCosts: Array.from(engineerMap.values())
            }
        })

        return projectsWithCosts

    } catch (error) {
        console.error("Error fetching project costs:", error)
        throw new Error("Failed to load project costs")
    }
}
