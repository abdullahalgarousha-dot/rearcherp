'use server'

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { startOfDay, endOfDay } from "date-fns"
import { checkPermission } from "@/lib/rbac"

export async function submitTimeLog(data: {
    date: Date;
    hoursLogged: number;
    description: string;
    projectId?: string; // Now optional
    type: "OFFICE" | "SITE";
}) {
    const session = await auth()
    const userId = (session?.user as any)?.id

    if (!userId) {
        return { error: "Unauthorized" }
    }

    if (data.hoursLogged <= 0) {
        return { error: "Hours must be a positive number" }
    }

    if (data.hoursLogged > 24) {
        return { error: "Hours cannot exceed 24 in a single entry" }
    }

    try {
        const user = await (db as any).user.findUnique({
            where: { id: userId },
            include: { profile: true }
        })

        if (!user || !user.profile) return { error: "User profile not found" }

        // Fetch Company Settings for Daily Goal
        const settings = await (db as any).companyProfile.findFirst()
        const dailyGoal = settings?.workingHoursPerDay || 8

        // Check cumulative hours for the day
        const dayLogs = await (db as any).timeLog.findMany({
            where: {
                userId: userId,
                date: {
                    gte: startOfDay(new Date(data.date)),
                    lte: endOfDay(new Date(data.date)),
                }
            }
        })

        const totalToday = dayLogs.reduce((sum: number, l: any) => sum + l.hoursLogged, 0)
        const newTotal = totalToday + parseFloat(data.hoursLogged.toString())

        if (data.projectId && data.projectId !== 'OFFICE') {
            const project = await (db as any).project.findUnique({
                where: { id: data.projectId }
            })

            if (!project) return { error: "Project not found" }
        }

        // Calculate Cost: User's hourlyRate or Derived from Basic Salary
        let calculatedHourlyRate = 0;
        if (user.profile.hourlyRate && user.profile.hourlyRate > 0) {
            calculatedHourlyRate = user.profile.hourlyRate;
        } else {
            const salary = user.profile.basicSalary || 0
            calculatedHourlyRate = salary / (dailyGoal * (settings?.workingDaysPerWeek || 5) * 4) // Dynamic calculation
        }

        const costAmount = parseFloat(data.hoursLogged.toString()) * calculatedHourlyRate

        await (db as any).timeLog.create({
            data: {
                date: new Date(data.date),
                hoursLogged: parseFloat(data.hoursLogged.toString()),
                description: data.description,
                type: data.type,
                userId: userId,
                projectId: (data.projectId === 'OFFICE' || !data.projectId) ? null : data.projectId,
                cost: costAmount,
            }
        })

        let message = "Log submitted successfully."
        if (newTotal < dailyGoal) {
            message += ` Note: You have logged ${newTotal}h today. Your daily goal is ${dailyGoal}h.`
        }

        revalidatePath('/')
        return { success: true, message }
    } catch (e: any) {
        console.error("Timesheet Error:", e)
        return { error: "Failed to submit time log: " + e.message }
    }
}

export async function getAssignedProjects() {
    const session = await auth()
    const userId = (session?.user as any)?.id

    if (!userId) return []

    try {
        const user = await (db as any).user.findUnique({
            where: { id: userId },
            include: {
                projects: {
                    select: { id: true, name: true, code: true }
                }
            }
        })

        return user?.projects || []
    } catch (e) {
        console.error(e)
        return []
    }
}

export async function getTodayLogs() {
    const session = await auth()
    const userId = (session?.user as any)?.id

    if (!userId) return []

    const today = new Date()

    try {
        const logs = await (db as any).timeLog.findMany({
            where: {
                userId: userId,
                date: {
                    gte: startOfDay(today),
                    lte: endOfDay(today),
                }
            },
            include: {
                project: {
                    select: { name: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        })
        return logs
    } catch (e) {
        console.error(e)
        return []
    }
}

export async function getEmployeeReport(userId: string, startDate: Date, endDate: Date) {
    const session = await auth()
    const currentUser = session?.user as any
    const currentUserId = currentUser?.id
    const tenantId = currentUser?.tenantId
    const isGlobalAdmin = currentUser?.role === 'GLOBAL_SUPER_ADMIN'

    if (!currentUserId || (!tenantId && !isGlobalAdmin)) return null

    // Users can see their own report; others need HR/Finance permission
    if (currentUserId !== userId) {
        const canViewHR = await checkPermission('HR', 'read')
        const canViewFinance = await checkPermission('FINANCE', 'read')

        if (!canViewHR && !canViewFinance) {
            return null
        }

        // Verify the target user belongs to the same tenant (GLOBAL_SUPER_ADMIN bypasses)
        if (!isGlobalAdmin) {
            const targetUser = await (db as any).user.findFirst({
                where: { id: userId, tenantId },
                select: { id: true }
            })
            if (!targetUser) return null
        }
    }

    try {
        const logs = await (db as any).timeLog.findMany({
            where: {
                userId: userId,
                date: {
                    gte: startOfDay(startDate),
                    lte: endOfDay(endDate),
                }
            },
            include: {
                project: {
                    select: { name: true, code: true }
                }
            },
            orderBy: { date: 'asc' }
        })

        // Group by project name
        const grouped = logs.reduce((acc: any, log: any) => {
            const key = log.project?.name || "Internal Office Work"
            if (!acc[key]) acc[key] = { hoursLogged: 0, logs: [] }
            acc[key].hoursLogged += log.hoursLogged
            acc[key].logs.push(log)
            return acc
        }, {})

        return {
            logs,
            grouped,
            totalHours: logs.reduce((sum: number, l: any) => sum + l.hoursLogged, 0)
        }
    } catch (e) {
        console.error(e)
        return null
    }
}

export async function getProjectCostReport(projectId: string) {
    const session = await auth()
    const currentUser = (session?.user as any)
    const tenantId = currentUser?.tenantId
    const isGlobalAdmin = currentUser?.role === 'GLOBAL_SUPER_ADMIN'
    if (!tenantId && !isGlobalAdmin) return { totalCost: 0, totalHours: 0, detailedLogs: [] }

    const canView = await checkPermission('FINANCE', 'read')
    if (!canView) {
        return { totalCost: 0, totalHours: 0, detailedLogs: [] }
    }

    // Verify project belongs to this tenant before exposing cost data (GLOBAL_SUPER_ADMIN bypasses)
    if (!isGlobalAdmin) {
        const project = await (db as any).project.findFirst({
            where: { id: projectId, tenantId },
            select: { id: true }
        })
        if (!project) return { totalCost: 0, totalHours: 0, detailedLogs: [] }
    }

    try {
        const result = await (db as any).timeLog.aggregate({
            where: { projectId },
            _sum: {
                cost: true,
                hoursLogged: true
            }
        })

        const detailedLogs = await (db as any).timeLog.findMany({
            where: { projectId },
            include: {
                user: { select: { id: true, name: true } }
            },
            orderBy: { date: 'desc' }
        });

        // Group by user and task
        const breakdown = detailedLogs.reduce((acc: any, log: any) => {
            const userId = log.user.id;
            const taskId = log.task?.id || 'unassigned';
            const key = `${userId}_${taskId}`;

            if (!acc[key]) {
                acc[key] = {
                    userId,
                    userName: log.user.name,
                    taskId: log.task?.id || null,
                    taskName: log.task?.name || 'General / Unassigned Task',
                    totalHours: 0,
                    totalCost: 0,
                    entries: 0
                }
            }
            acc[key].totalHours += log.hoursLogged;
            acc[key].totalCost += log.cost;
            acc[key].entries += 1;
            return acc;
        }, {});

        const breakdownArray = Object.values(breakdown);

        return {
            totalCost: result._sum.cost || 0,
            totalHours: result._sum.hoursLogged || 0,
            breakdown: breakdownArray
        }
    } catch (e) {
        console.error(e)
        return { totalCost: 0, totalHours: 0, breakdown: [] }
    }
}

export async function getAllEmployees() {
    const session = await auth()
    if (!session?.user) return []

    const canViewHR = await checkPermission('HR', 'read')
    const canViewFinance = await checkPermission('FINANCE', 'read')
    if (!canViewHR && !canViewFinance) return []

    const currentUser = session.user as any
    const tenantId = currentUser.tenantId
    const isGlobalAdmin = currentUser.role === 'GLOBAL_SUPER_ADMIN'
    if (!tenantId && !isGlobalAdmin) return []

    try {
        const users = await (db as any).user.findMany({
            where: isGlobalAdmin ? {} : { tenantId },
            select: { id: true, name: true, role: true }
        })
        return users
    } catch (e) {
        console.error(e)
        return []
    }
}
