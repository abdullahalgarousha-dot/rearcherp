'use server'

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import { redirect } from "next/navigation"

// ─────────────────────────────────────────────────────────────────────────────
// RBAC HELPER — user must be ADMIN/SUPER_ADMIN OR explicitly assigned to the
// project (as lead or team engineer) within the same tenant.
// ─────────────────────────────────────────────────────────────────────────────
async function assertProjectAccess(
    projectId: string,
    userId: string,
    userRole: string,
    tenantId: string,
): Promise<boolean> {
    const isAdmin = ['GLOBAL_SUPER_ADMIN', 'SUPER_ADMIN', 'ADMIN'].includes(userRole)
    if (isAdmin) return true

    const project = await (db as any).project.findUnique({
        where: { id: projectId, tenantId },          // tenant-scoped lookup
        select: {
            leadEngineerId: true,
            engineers: { select: { id: true } },
        },
    })

    if (!project) return false
    return (
        project.leadEngineerId === userId ||
        project.engineers.some((e: any) => e.id === userId)
    )
}

// ─────────────────────────────────────────────────────────────────────────────
export async function createTask(formData: FormData) {
    const session = await auth()
    if (!session) redirect('/login')
    const user = session.user as any

    const projectId = formData.get('projectId') as string
    const name = formData.get('name') as string
    const type = formData.get('type') as string
    const start = new Date(formData.get('start') as string)
    const end = new Date(formData.get('end') as string)
    let designStageId = formData.get('designStageId') as string | null
    if (designStageId === 'NONE' || !designStageId) designStageId = null

    // RBAC: must be admin or assigned to this project
    const allowed = await assertProjectAccess(projectId, user.id, user.role, user.tenantId)
    if (!allowed) return { error: "Unauthorized" }

    let assigneeIds: string[] = []
    try {
        assigneeIds = JSON.parse(formData.get('assigneeIds') as string || "[]")
    } catch {
        assigneeIds = []
    }

    try {
        await (db as any).task.create({
            data: {
                projectId,
                title: name,
                type,
                start,
                end,
                progress: 0,
                status: 'PLANNED',
                designStageId,
                assignees: { connect: assigneeIds.map(id => ({ id })) },
            },
        })

        revalidatePath(`/admin/projects/${projectId}`)
        return { success: true }
    } catch (error) {
        console.error("createTask error:", error)
        return { error: "Database operation failed." }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
export async function updateTask(formData: FormData) {
    const session = await auth()
    if (!session) redirect('/login')
    const user = session.user as any

    const taskId = formData.get('taskId') as string
    const projectId = formData.get('projectId') as string
    const name = formData.get('name') as string
    const type = formData.get('type') as string
    const start = new Date(formData.get('start') as string)
    const end = new Date(formData.get('end') as string)
    let designStageId = formData.get('designStageId') as string | null
    if (designStageId === 'NONE' || !designStageId) designStageId = null

    // RBAC: must be admin or assigned to this project
    const allowed = await assertProjectAccess(projectId, user.id, user.role, user.tenantId)
    if (!allowed) return { error: "Unauthorized" }

    let assigneeIds: string[] = []
    try {
        assigneeIds = JSON.parse(formData.get('assigneeIds') as string || "[]")
    } catch {
        assigneeIds = []
    }

    try {
        await (db as any).task.update({
            where: { id: taskId },
            data: {
                title: name,
                type,
                start,
                end,
                designStageId,
                assignees: {
                    set: [],                                          // clear existing
                    connect: assigneeIds.map(id => ({ id })),        // attach new
                },
            },
        })

        revalidatePath(`/admin/projects/${projectId}`)
        return { success: true }
    } catch (error) {
        console.error("updateTask error:", error)
        return { error: "Database operation failed." }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
export async function updateProject(formData: FormData) {
    const session = await auth()
    if (!session) redirect('/login')

    const projectId = formData.get('projectId') as string
    const name = formData.get('name') as string
    const client = formData.get('client') as string
    const clientId = formData.get('clientId') as string | null
    const contractValue = parseFloat(formData.get('contractValue') as string)
    const engineerIds = formData.getAll('engineerIds') as string[]
    const serviceType = formData.get('serviceType') as string
    const status = formData.get('status') as string
    const contractDuration = parseInt(formData.get('contractDuration') as string) || 0

    const updateData: any = {
        name,
        contractValue: Number(contractValue),
        serviceType,
        status,
        contractDuration: Number(contractDuration),
        engineers: { set: engineerIds.map((id: string) => ({ id })) },
    }

    // Prevent "[object Object]" from crashing the DB
    if (typeof client === 'string' && client !== '[object Object]' && client.trim() !== '') {
        updateData.client = { connect: { id: client } }
    } else if (clientId && clientId !== '[object Object]') {
        updateData.client = { connect: { id: clientId } }
    }

    try {
        await (db as any).project.update({
            where: { id: projectId },
            data: updateData,
        })

        revalidatePath(`/admin/projects/${projectId}`)
        return { success: true }
    } catch (error) {
        console.error("updateProject error:", error)
        return { error: "Database operation failed." }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
export async function logWork(formData: FormData) {
    const session = await auth()
    const user = session?.user as any
    if (!user) return { error: "Unauthorized" }

    const taskId = formData.get("taskId") as string
    const projectId = formData.get("projectId") as string
    const date = new Date(formData.get("date") as string)
    const hoursLogged = parseFloat(formData.get("hours") as string)
    const type = formData.get("type") as string
    const description = formData.get("description") as string

    try {
        await (db as any).workLog.create({
            data: {
                taskId,
                userId: user.id,
                date,
                hoursLogged,
                type,
                description,
            },
        })

        revalidatePath(`/admin/projects/${projectId}`)
        return { success: true }
    } catch (error) {
        console.error("logWork error:", error)
        return { error: "Database operation failed." }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
export async function updateTaskProgress(formData: FormData) {
    const taskId = formData.get("taskId") as string
    const projectId = formData.get("projectId") as string
    const progress = parseInt(formData.get("progress") as string)

    const updated = await (db as any).task.update({
        where: { id: taskId },
        data: { progress },
    })

    // Rollup: recalculate parent stage progress as average of all its child tasks
    if (updated?.designStageId) {
        const siblings = await (db as any).task.findMany({
            where: { designStageId: updated.designStageId },
            select: { progress: true },
        })
        const avg = Math.round(
            siblings.reduce((sum: number, t: any) => sum + t.progress, 0) / siblings.length
        )
        await (db as any).designStage.update({
            where: { id: updated.designStageId },
            data: { progress: avg },
        })
    }

    revalidatePath(`/admin/projects/${projectId}`)
}
