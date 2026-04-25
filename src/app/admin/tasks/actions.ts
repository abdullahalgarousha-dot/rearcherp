'use server'

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { checkPermission } from "@/lib/rbac"

const VALID_STATUSES = ['TO_DO', 'IN_PROGRESS', 'UNDER_REVIEW', 'DONE']

const STATUS_PROGRESS: Record<string, number> = {
    'TO_DO': 0,
    'IN_PROGRESS': 50,
    'UNDER_REVIEW': 90,
    'DONE': 100,
}

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN', 'GLOBAL_SUPER_ADMIN']

// ─────────────────────────────────────────────────────────────────────────────
// Task CRUD
// ─────────────────────────────────────────────────────────────────────────────

export async function moveTask(taskId: string, newStatus: string) {
    if (!VALID_STATUSES.includes(newStatus)) return { error: "Invalid status" }

    const session = await auth()
    const userRole = (session?.user as any)?.role as string

    const isAllowed = await checkPermission('PROJECTS', 'write')
    if (!isAllowed) return { error: "Unauthorized" }

    if (newStatus === 'DONE' && !ADMIN_ROLES.includes(userRole)) {
        return { error: "Only Admins can approve tasks (move to Done)" }
    }

    try {
        await (db as any).task.update({
            where: { id: taskId },
            data: { status: newStatus, progress: STATUS_PROGRESS[newStatus] }
        })
        revalidatePath('/admin/tasks')
        return { success: true }
    } catch (e: any) {
        return { error: e.message }
    }
}

export async function createTask(formData: FormData) {
    const isAllowed = await checkPermission('PROJECTS', 'write')
    if (!isAllowed) return { error: "Unauthorized" }

    const session = await auth()
    const user = session?.user as any

    const title = formData.get("title") as string
    const description = formData.get("description") as string | null
    const rawProjectId = formData.get("projectId") as string | null
    const type = (formData.get("type") as string) || "OFFICE"
    const startRaw = formData.get("start") as string
    const endRaw = formData.get("end") as string
    const assigneeIdsRaw = formData.get("assigneeIds") as string | null

    if (!title) return { error: "Title is required" }

    // Normalise projectId — INTERNAL / NONE / empty / literal "null" → null
    const finalProjectId = (
        !rawProjectId ||
        rawProjectId === 'INTERNAL' ||
        rawProjectId === 'NONE' ||
        rawProjectId === 'null' ||
        rawProjectId.trim() === ''
    ) ? null : rawProjectId

    const start = startRaw ? new Date(startRaw) : new Date()
    const end   = endRaw   ? new Date(endRaw)   : new Date()

    let assigneeIds: string[] = []
    try { assigneeIds = JSON.parse(assigneeIdsRaw || "[]") } catch { assigneeIds = [] }

    try {
        // ── Resolve a REAL tenantId — never pass null or 'system' to Prisma ─────
        // Step 1: start with whatever the session carries
        let resolvedTenantId: string = user?.tenantId ?? ''

        // Step 2: if a real project was selected, inherit its tenantId (most reliable)
        if (finalProjectId) {
            const proj = await (db as any).project.findUnique({
                where: { id: finalProjectId },
                select: { tenantId: true }
            })
            if (proj?.tenantId) resolvedTenantId = proj.tenantId
        }

        // Step 3: if still 'system' (GSA) or empty, fall back to first real tenant row
        if (!resolvedTenantId || resolvedTenantId === 'system') {
            const fallbackTenant = await (db as any).tenant.findFirst({ select: { id: true } })
            if (!fallbackTenant) return { error: "No tenant found in DB — cannot create task." }
            resolvedTenantId = fallbackTenant.id
        }

        const notifTenantId = resolvedTenantId

        console.log("🛠 createTask payload:", {
            tenantId: resolvedTenantId,
            projectId: finalProjectId,
            title,
            type,
            assigneeCount: assigneeIds.length,
        })

        // Build payload as explicit object — no spread, no undefined keys
        const taskData: any = {
            tenantId: resolvedTenantId,
            projectId: finalProjectId,   // null is valid for String? field
            title,
            description: description || null,
            status: 'TO_DO',
            type,
            start,                       // schema field is `start DateTime`
            end,                         // schema field is `end DateTime`
            progress: 0,
        }

        if (assigneeIds.length > 0) {
            taskData.assignees = { connect: assigneeIds.map((id: string) => ({ id })) }
        }

        let created: any
        try {
            created = await (db as any).task.create({ data: taskData })
        } catch (e: any) {
            console.error("🚨 PRISMA CREATE ERROR:", e)
            return { error: e instanceof Error ? e.message : "Failed to create task" }
        }

        // Notify each assignee of the new task assignment
        if (assigneeIds.length > 0 && notifTenantId) {
            for (const assigneeId of assigneeIds) {
                await (db as any).inAppNotification.create({
                    data: {
                        tenantId: notifTenantId,
                        userId: assigneeId,
                        title: `New Task Assigned: ${title}`,
                        message: `You have been assigned to: "${title}"`,
                        type: 'TASK_ASSIGNED',
                        link: `/admin/tasks?taskId=${created.id}`,
                        isRead: false,
                    }
                }).catch(() => {}) // Non-blocking
            }
        }

        revalidatePath('/admin/tasks')
        return { success: true }
    } catch (e: any) {
        return { error: e.message }
    }
}

export async function deleteTask(taskId: string) {
    const isAllowed = await checkPermission('PROJECTS', 'write')
    if (!isAllowed) return { error: "Unauthorized" }

    try {
        await (db as any).task.delete({ where: { id: taskId } })
        revalidatePath('/admin/tasks')
        return { success: true }
    } catch (e: any) {
        return { error: e.message }
    }
}

export async function getTaskDetails(taskId: string) {
    const session = await auth()
    if (!session?.user) return null

    const userRole = (session.user as any)?.role as string
    const tenantId = (session.user as any)?.tenantId as string

    // Explicit string comparison — avoids any ADMIN_ROLES array drift
    const isAdmin =
        userRole === 'GLOBAL_SUPER_ADMIN' ||
        userRole === 'SUPER_ADMIN' ||
        userRole === 'ADMIN'

    const whereClause = isAdmin ? { id: taskId } : { id: taskId, tenantId }

    console.log("🔍 getTaskDetails:", { taskId, isAdmin, role: userRole, tenantId })

    try {
        // NOTE: 'project' relation excluded from include — use scalar projectId instead.
        // Re-add after running `npx prisma generate` to refresh the client.
        const task = await (db as any).task.findFirst({
            where: whereClause,
            include: {
                assignees: { select: { id: true, name: true } },
                comments: {
                    orderBy: { createdAt: 'asc' },
                    include: { user: { select: { id: true, name: true } } }
                }
            }
        })
        console.log("🔍 getTaskDetails result:", task ? `found (${task.id})` : "null")
        return task
    } catch (e: any) {
        console.error("🚨 getTaskDetails error:", e)
        return null
    }
}

export async function updateTaskDelayReason(taskId: string, delayReason: string) {
    const isAllowed = await checkPermission('PROJECTS', 'write')
    if (!isAllowed) return { error: "Unauthorized" }

    const session = await auth()
    const userRole = (session?.user as any)?.role as string
    const tenantId = (session?.user as any)?.tenantId as string
    const isAdmin = ADMIN_ROLES.includes(userRole)
    const whereClause = isAdmin ? { id: taskId } : { id: taskId, tenantId }

    try {
        await (db as any).task.updateMany({ where: whereClause, data: { delayReason } })
        revalidatePath('/admin/tasks')
        return { success: true }
    } catch (e: any) {
        return { error: e.message }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Task Comments
// ─────────────────────────────────────────────────────────────────────────────

export async function addTaskComment(taskId: string, text: string) {
    if (!text?.trim()) return { error: "Comment cannot be empty" }

    const isAllowed = await checkPermission('PROJECTS', 'write')
    if (!isAllowed) return { error: "Unauthorized" }

    const session = await auth()
    const userId = (session?.user as any)?.id as string
    if (!userId) return { error: "Unauthorized" }

    const userRole = (session?.user as any)?.role as string
    const tenantId = (session?.user as any)?.tenantId as string
    const isAdmin = ADMIN_ROLES.includes(userRole)
    const taskWhereClause = isAdmin ? { id: taskId } : { id: taskId, tenantId }

    try {
        // Fetch task first to get tenantId (required by TaskComment FK)
        // Admin bypass: ADMIN/SUPER_ADMIN/GLOBAL_SUPER_ADMIN can comment on any task
        const task = await (db as any).task.findFirst({
            where: taskWhereClause,
            select: { title: true, tenantId: true, assignees: { select: { id: true } } }
        })

        if (!task?.tenantId) return { error: "Task not found" }

        const comment = await (db as any).taskComment.create({
            data: { taskId, userId, tenantId: task.tenantId, text: text.trim() },
            include: { user: { select: { id: true, name: true } } }
        })

        if (task?.tenantId) {
            for (const assignee of (task.assignees || [])) {
                if (assignee.id !== userId) {
                    await (db as any).inAppNotification.create({
                        data: {
                            tenantId: task.tenantId,
                            userId: assignee.id,
                            title: `New comment on: ${task.title}`,
                            message: text.length > 100 ? text.substring(0, 97) + '...' : text,
                            type: 'TASK_COMMENT',
                            link: `/admin/tasks?taskId=${taskId}`,
                            isRead: false,
                        }
                    }).catch(() => {})
                }
            }
        }

        revalidatePath('/admin/tasks')
        return { success: true, comment }
    } catch (e: any) {
        return { error: e.message }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Notifications
// ─────────────────────────────────────────────────────────────────────────────

export async function getUnreadNotifications() {
    const session = await auth()
    const userId = (session?.user as any)?.id as string
    if (!userId) return []

    try {
        const notifications = await (db as any).inAppNotification.findMany({
            where: { userId, isRead: false },
            orderBy: { createdAt: 'desc' },
            take: 25
        })
        return notifications
    } catch {
        return []
    }
}

export async function markNotificationRead(notificationId: string) {
    const session = await auth()
    const userId = (session?.user as any)?.id as string
    if (!userId) return { error: "Unauthorized" }

    try {
        await (db as any).inAppNotification.update({
            where: { id: notificationId },
            data: { isRead: true }
        })
        return { success: true }
    } catch (e: any) {
        return { error: e.message }
    }
}

export async function markAllNotificationsRead() {
    const session = await auth()
    const userId = (session?.user as any)?.id as string
    if (!userId) return { error: "Unauthorized" }

    try {
        await (db as any).inAppNotification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true }
        })
        return { success: true }
    } catch (e: any) {
        return { error: e.message }
    }
}

export async function createTaskNotification(userId: string, taskId: string, message: string) {
    try {
        const task = await (db as any).task.findUnique({
            where: { id: taskId },
            select: { title: true, tenantId: true }
        })
        if (!task?.tenantId) return { error: "Task not found or missing tenant" }

        await (db as any).inAppNotification.create({
            data: {
                tenantId: task.tenantId,
                userId,
                title: `Task Update: ${task.title}`,
                message,
                type: 'TASK',
                link: `/admin/tasks?taskId=${taskId}`,
                isRead: false,
            }
        })
        return { success: true }
    } catch (e: any) {
        return { error: e.message }
    }
}

export async function checkTaskDeadlines() {
    const session = await auth()
    const userRole = (session?.user as any)?.role as string
    if (!ADMIN_ROLES.includes(userRole)) return { error: "Unauthorized" }

    const tenantId = (session?.user as any)?.tenantId as string
    const isGSA = userRole === 'GLOBAL_SUPER_ADMIN'

    const now = new Date()
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const tenantFilter = isGSA ? {} : { tenantId }

    try {
        const tasks = await (db as any).task.findMany({
            where: {
                ...tenantFilter,
                status: { not: 'DONE' },
                end: { lte: in24h }
            },
            select: {
                id: true,
                title: true,
                tenantId: true,
                end: true,
                assignees: { select: { id: true } }
            }
        })

        let created = 0
        for (const task of tasks) {
            if (!task.tenantId) continue
            const isOverdue = new Date(task.end) < now
            const message = isOverdue
                ? `Task "${task.title}" is overdue!`
                : `Task "${task.title}" is due within 24 hours.`

            for (const assignee of task.assignees) {
                // Deduplicate: skip if a deadline notification was sent in the last 12 hours
                const existing = await (db as any).inAppNotification.findFirst({
                    where: {
                        userId: assignee.id,
                        link: `/admin/tasks?taskId=${task.id}`,
                        type: 'TASK_DEADLINE',
                        createdAt: { gte: new Date(now.getTime() - 12 * 60 * 60 * 1000) }
                    }
                })
                if (!existing) {
                    await (db as any).inAppNotification.create({
                        data: {
                            tenantId: task.tenantId,
                            userId: assignee.id,
                            title: isOverdue ? 'Task Overdue' : 'Task Due Soon',
                            message,
                            type: 'TASK_DEADLINE',
                            link: `/admin/tasks?taskId=${task.id}`,
                            isRead: false,
                        }
                    }).catch(() => {})
                    created++
                }
            }
        }
        return { success: true, created }
    } catch (e: any) {
        return { error: e.message }
    }
}
