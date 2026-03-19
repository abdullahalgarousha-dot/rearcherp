'use server'

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { auth } from "@/auth"

const DEFAULT_STAGES = [
    { name: "Concept", order: 1 },
    { name: "3D Rendering", order: 2 },
    { name: "Schemes & Blueprints", order: 3 },
    { name: "Licensing", order: 4 },
]

export async function initializeDesignStages(projectId: string) {
    const session = await auth()
    if (!session) return { error: "Unauthorized" }

    try {
        const existing = await (db as any).designStage.count({ where: { projectId } })
        if (existing === 0) {
            await (db as any).designStage.createMany({
                data: DEFAULT_STAGES.map(s => ({
                    projectId,
                    name: s.name,
                    order: s.order,
                    status: "PENDING",
                    progress: 0
                }))
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
                assignedTo: { select: { id: true, name: true, image: true } },
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

export async function updateDesignStage(stageId: string, data: { status?: string, progress?: number, assignedToId?: string | null }) {
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
