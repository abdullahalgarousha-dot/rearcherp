'use server'

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { auth } from "@/auth"

export async function initializeDesignStages(projectId: string) {
    const session = await auth()
    if (!session) return { error: "Unauthorized" }

    try {
        const existing = await (db as any).designStage.count({ where: { projectId } })
        if (existing === 0) {
            await (db as any).designStage.create({
                data: {
                    projectId,
                    name: "Phase 1",
                    order: 1,
                    status: "PENDING",
                    progress: 0
                }
            })
        }
        revalidatePath(`/admin/projects/${projectId}`)
        return { success: true }
    } catch (e) {
        console.error("Failed to init stages:", e)
        return { error: "Failed to initialize stages" }
    }
}

export async function getDesignStages(projectId: string) {
    try {
        const stages = await (db as any).designStage.findMany({
            where: { projectId },
            include: {
                assignees: { select: { id: true, name: true, image: true } },
                tasks: {
                    select: { id: true, title: true, status: true, progress: true, start: true, end: true }
                },
                files: {
                    include: { uploadedBy: { select: { name: true } } },
                    orderBy: { createdAt: 'desc' }
                }
            },
            orderBy: { order: 'asc' }
        })
        return stages
    } catch (e) {
        console.error("Fetch stages error:", e)
        return []
    }
}

export async function updateDesignStage(stageId: string, data: {
    status?: string,
    progress?: number,
    name?: string,
    description?: string,
    startDate?: Date | null,
    endDate?: Date | null,
    specialties?: string,
    requirements?: string
}) {
    const session = await auth()
    if (!session) return { error: "Unauthorized" }

    try {
        const stage = await (db as any).designStage.update({
            where: { id: stageId },
            data,
            include: { project: { select: { id: true } } }
        })
        revalidatePath(`/admin/projects/${stage.projectId}`)
        return { success: true }
    } catch (e) {
        console.error("Update stage error:", e)
        return { error: "Failed to update stage" }
    }
}

export async function assignEngineersToStage(stageId: string, userIds: string[]) {
    const session = await auth()
    if (!session) return { error: "Unauthorized" }

    try {
        const stage = await (db as any).designStage.update({
            where: { id: stageId },
            data: {
                assignees: {
                    set: userIds.map(id => ({ id }))
                }
            }
        })
        revalidatePath(`/admin/projects/${stage.projectId}`)
        return { success: true }
    } catch (e) {
        console.error(e)
        return { error: "Failed to assign engineers" }
    }
}

export async function uploadDesignStageFile(formData: FormData) {
    const session = await auth()
    if (!session) return { error: "Unauthorized" }

    const stageId = formData.get("stageId") as string
    const name = formData.get("name") as string
    const url = formData.get("url") as string
    const userId = (session?.user as any)?.id

    try {
        const file = await (db as any).designStageFile.create({
            data: {
                stageId,
                name,
                url,
                uploadedById: userId
            }
        })

        const stage = await (db as any).designStage.findUnique({ where: { id: stageId } })
        if (stage) revalidatePath(`/admin/projects/${stage.projectId}`)

        return { success: true, file }
    } catch (e) {
        console.error("File upload error:", e)
        return { error: "Failed to upload file link" }
    }
}

export async function createDesignStage(projectId: string, name: string) {
    const session = await auth()
    if (!session) return { error: "Unauthorized" }

    try {
        const lastStage = await (db as any).designStage.findFirst({
            where: { projectId },
            orderBy: { order: 'desc' }
        })
        const newOrder = lastStage ? lastStage.order + 1 : 1

        await (db as any).designStage.create({
            data: {
                projectId,
                name,
                order: newOrder,
                status: "PENDING"
            }
        })
        revalidatePath(`/admin/projects/${projectId}`)
        return { success: true }
    } catch (e) {
        console.error(e)
        return { error: "Failed to create stage" }
    }
}

export async function deleteDesignStage(stageId: string) {
    const session = await auth()
    if (!session) return { error: "Unauthorized" }

    try {
        const stage = await (db as any).designStage.findUnique({ where: { id: stageId } })
        if (!stage) return { error: "Stage not found" }

        // Unlink tasks before deleting
        await (db as any).task.updateMany({
            where: { designStageId: stageId },
            data: { designStageId: null }
        })

        await (db as any).designStage.delete({ where: { id: stageId } })
        revalidatePath(`/admin/projects/${stage.projectId}`)
        return { success: true }
    } catch (e) {
        console.error(e)
        return { error: "Failed to delete stage" }
    }
}
