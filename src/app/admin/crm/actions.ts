"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { hasPermission } from "@/lib/rbac"

// ==========================================
// DRIVE INTEGRATION HELPER
// ==========================================
async function triggerClientDriveFolders(tenantId: string, clientId: string, clientName: string) {
    try {
        const { getDriveSettings, createClientFolders } = await import('@/lib/google-drive')
        const { driveFolderId: rootId } = await getDriveSettings(tenantId)
        const folderMap = await createClientFolders(tenantId, clientName, rootId)
        await (db as any).client.update({
            where: { id: clientId },
            data: { driveFolderId: folderMap.root }
        })
        console.log(`[Drive] Client "${clientName}" folder created: ${folderMap.root}`)
    } catch (driveErr) {
        console.warn(`[Drive] Failed to create client folders for "${clientName}" (non-blocking):`, driveErr)
    }
}

// ----------------------------------------------------------------------
// 1. DTO & Helper
// ----------------------------------------------------------------------

export type ClientDTO = {
    id: string
    clientCode: string
    name: string
    clientType: "INDIVIDUAL" | "COMPANY"
    taxNumber: string | null
    crNumber: string | null
    nationalAddress: string | null
    phone: string | null
    email: string | null
    address: string | null
    tenantId: string | null
    createdAt: Date
}

// ----------------------------------------------------------------------
// 2. Client Management Actions
// ----------------------------------------------------------------------

export async function getAllClients(): Promise<ClientDTO[]> {
    const session = await auth()
    const canView = await hasPermission('crm', 'view')
    if (!canView) throw new Error("Unauthorized")

    const tenantId = (session?.user as any).tenantId
    const clients = await (db as any).client.findMany({
        where: { tenantId },
        orderBy: { name: 'asc' }
    })
    return clients
}

export async function findOrCreateClient(clientName: string, additionalData?: {
    address?: string
    taxNumber?: string
}): Promise<ClientDTO> {
    const session = await auth()
    const canCreate = await hasPermission('crm', 'createEdit')
    if (!canCreate) throw new Error("Unauthorized")
    const tenantId = (session?.user as any).tenantId

    // Trim name
    const name = clientName.trim()
    if (!name) throw new Error("Client name is required")

    // Check if exists
    let client = await (db as any).client.findFirst({
        where: {
            tenantId,
            name: { equals: name }
        }
    })

    if (!client) {
        // Generate code
        const count = await (db as any).client.count({ where: { tenantId } })
        const code = `CLI-${1000 + count + 1}`

        client = await (db as any).client.create({
            data: {
                tenantId,
                clientCode: code,
                name: name,
                address: additionalData?.address || null,
                taxNumber: additionalData?.taxNumber || null,
            }
        })

        // Fire Drive folder creation asynchronously (non-blocking)
        triggerClientDriveFolders(tenantId, client.id, name)
    }

    revalidatePath("/admin/crm")
    revalidatePath("/admin/projects")
    return client
}

export async function updateClient(clientId: string, data: Partial<ClientDTO>) {
    const session = await auth()
    const canEdit = await hasPermission('crm', 'createEdit')
    if (!canEdit) throw new Error("Unauthorized")
    const tenantId = (session?.user as any).tenantId

    const updated = await (db as any).client.update({
        where: { id: clientId, tenantId },
        data: {
            name: data.name,
            clientType: data.clientType,
            taxNumber: data.taxNumber,
            crNumber: data.crNumber,
            nationalAddress: data.nationalAddress,
            phone: data.phone,
            email: data.email,
            address: data.address
        }
    })

    revalidatePath("/admin/crm")
    revalidatePath(`/admin/crm/${clientId}`)
    return { success: true, client: updated }
}

export async function createClient(data: Partial<ClientDTO>) {
    const session = await auth()
    const canCreate = await hasPermission('crm', 'createEdit')
    if (!canCreate) throw new Error("Unauthorized")
    const tenantId = (session?.user as any).tenantId

    if (!data.name || !data.name.trim()) throw new Error("Client name is required")

    try {
        // Generate code
        const count = await (db as any).client.count({ where: { tenantId } })
        const code = `CLI-${1000 + count + 1}`

        const newClient = await (db as any).client.create({
            data: {
                tenantId,
                clientCode: code,
                name: data.name!.trim(),
                clientType: data.clientType || 'COMPANY',
                taxNumber: data.taxNumber || null,
                crNumber: data.crNumber || null,
                nationalAddress: data.nationalAddress || null,
                phone: data.phone || null,
                email: data.email || null,
                address: data.address || null,
            }
        })

        // Fire Drive folder creation asynchronously (non-blocking)
        triggerClientDriveFolders(tenantId, newClient.id, newClient.name)

        revalidatePath("/admin/crm")
        return newClient
    } catch (e: any) {
        // Surface a clear message instead of a raw Prisma stack trace
        const msg: string = e?.message || ""
        if (msg.includes("entityTypeId")) {
            throw new Error(
                "Database schema is being updated — please retry in a moment. " +
                "(A one-time column migration is running on first server start.)"
            )
        }
        if (e?.code === "P2002") {
            throw new Error("A client with this code already exists. Please try again.")
        }
        throw e
    }
}

export async function deleteClient(clientId: string) {
    const session = await auth()
    const canDelete = await hasPermission('crm', 'delete')
    if (!canDelete) throw new Error("Unauthorized: Requires CRM Delete permission")
    const tenantId = (session?.user as any).tenantId

    // Check if there are linked projects
    const count = await (db as any).project.count({
        where: { clientId }
    })

    if (count > 0) {
        throw new Error(`Cannot delete client. They have ${count} linked projects.`)
    }

    await (db as any).client.delete({
        where: { id: clientId, tenantId }
    })

    revalidatePath("/admin/crm")
    return { success: true }
}
