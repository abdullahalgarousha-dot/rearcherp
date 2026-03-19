'use server'

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import { redirect } from "next/navigation"

export async function createTask(formData: FormData) {
    const session = await auth()
    if (!session) redirect('/login')

    const projectId = formData.get('projectId') as string
    const name = formData.get('name') as string
    const type = formData.get('type') as string
    const start = new Date(formData.get('start') as string)
    const end = new Date(formData.get('end') as string)
    let designStageId = formData.get('designStageId') as string | null
    if (designStageId === 'NONE' || !designStageId) designStageId = null

    let assigneeIds: string[] = []
    try {
        assigneeIds = JSON.parse(formData.get('assigneeIds') as string || "[]")
    } catch (e) {
        assigneeIds = []
    }

    await (db as any).task.create({
        data: {
            projectId,
            title: name,
            type,
            start,
            end,
            progress: 0,
            status: 'PLANNED',
            designStageId, // Link to design stage
            assignees: {
                connect: assigneeIds.map(id => ({ id }))
            }
        }
    })

    revalidatePath(`/admin/projects/${projectId}`)
}

export async function updateTask(formData: FormData) {
    const session = await auth()
    if (!session) redirect('/login')

    const taskId = formData.get('taskId') as string
    const projectId = formData.get('projectId') as string
    const name = formData.get('name') as string
    const type = formData.get('type') as string
    const start = new Date(formData.get('start') as string)
    const end = new Date(formData.get('end') as string)
    let designStageId = formData.get('designStageId') as string | null
    if (designStageId === 'NONE' || !designStageId) designStageId = null

    let assigneeIds: string[] = []
    try {
        assigneeIds = JSON.parse(formData.get('assigneeIds') as string || "[]")
    } catch (e) {
        assigneeIds = []
    }

    await (db as any).task.update({
        where: { id: taskId },
        data: {
            title: name,
            type,
            start,
            end,
            designStageId, // Update link to design stage
            assignees: {
                set: [], // Clear existing relations
                connect: assigneeIds.map(id => ({ id })) // Connect new ones
            }
        }
    })

    revalidatePath(`/admin/projects/${projectId}`)
}

export async function updateProject(formData: FormData) {
    const session = await auth()
    if (!session) redirect('/login')

    const projectId = formData.get('projectId') as string
    const name = formData.get('name') as string
    const client = formData.get('client') as string
    const clientAddress = formData.get('clientAddress') as string
    const clientVat = formData.get('clientVat') as string
    const contractValue = parseFloat(formData.get('contractValue') as string)
    const engineerIds = formData.getAll('engineerIds') as string[]
    const serviceType = formData.get('serviceType') as string
    const status = formData.get('status') as string
    const contractDuration = parseInt(formData.get('contractDuration') as string) || 0

    // Retention is auto-calculated 10%
    const retentionAmount = contractValue * 0.10

    // Update Project and Engineers relation
    await (db as any).project.update({
        where: { id: projectId },
        data: {
            name,
            client,
            clientAddress,
            clientVat,
            contractValue,
            serviceType,
            status,
            contractDuration,
            engineers: {
                set: [], // Clear existing
                connect: engineerIds.map(id => ({ id })) // Connect selected
            }
        }
    })

    revalidatePath(`/admin/projects/${projectId}`)
}

export async function logWork(formData: FormData) {
    const taskId = formData.get("taskId") as string
    const projectId = formData.get("projectId") as string
    const date = new Date(formData.get("date") as string)
    const hoursLogged = parseFloat(formData.get("hours") as string)
    const type = formData.get("type") as string
    const description = formData.get("description") as string

    // TODO: Get real user ID from session
    const session = await auth()
    const user = session?.user as any
    // For now, if no user, might fail or we can attach to a default for testing if strict
    if (!user) return

    // Cast db to any
    await (db as any).workLog.create({
        data: {
            taskId,
            userId: user.id || "cm6u...", // Fallback or error if strict
            date,
            hoursLogged,
            type,
            description
        }
    })

    revalidatePath(`/admin/projects/${projectId}`)
}

export async function updateTaskProgress(formData: FormData) {
    const taskId = formData.get("taskId") as string
    const projectId = formData.get("projectId") as string
    const progress = parseInt(formData.get("progress") as string)

    // Cast db to any
    await (db as any).task.update({
        where: { id: taskId },
        data: { progress }
    })

    revalidatePath(`/admin/projects/${projectId}`)
}
