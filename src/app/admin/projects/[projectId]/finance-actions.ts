'use server'

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { hasPermission } from "@/lib/rbac"

// ─────────────────────────────────────────
// INVOICE ACTIONS
// ─────────────────────────────────────────

export async function createProjectInvoice(projectId: string, data: {
    invoiceNumber: string
    description: string
    baseAmount: number
    dueDate?: string
    date: string
}) {
    const canEdit = await hasPermission('finance', 'viewContracts') || await hasPermission('finance', 'masterVisible')
    if (!canEdit) return { error: "Unauthorized: Requires Finance permission" }

    const session = await auth()
    if (!session) return { error: "Not authenticated" }
    const tenantId = (session.user as any)?.tenantId

    try {
        const baseAmount = data.baseAmount
        const vatAmount = baseAmount * 0.15
        const totalAmount = baseAmount + vatAmount

        const invoice = await (db as any).invoice.create({
            data: {
                projectId,
                tenantId,
                invoiceNumber: data.invoiceNumber || `INV-${Date.now()}`,
                description: data.description,
                baseAmount,
                vatAmount,
                taxRate: 0.15,
                totalAmount,
                date: new Date(data.date),
                dueDate: data.dueDate ? new Date(data.dueDate) : null,
                status: 'ISSUED',
            }
        })

        revalidatePath(`/admin/projects/${projectId}`)
        revalidatePath('/admin/finance')
        return { success: true, invoice }
    } catch (e) {
        console.error("createProjectInvoice error:", e)
        return { error: "Failed to create invoice" }
    }
}

export async function updateInvoiceStatus(invoiceId: string, status: string) {
    const session = await auth()
    const user = session?.user as any

    const isSuperAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN'
    const canEdit = await hasPermission('finance', 'masterVisible')

    // Only Admin can mark CANCELLED on locked invoices
    if (status === 'CANCELLED' && !isSuperAdmin) {
        return { error: "Unauthorized: Only Admin can cancel invoices" }
    }

    if (!isSuperAdmin && !canEdit) return { error: "Unauthorized" }

    try {
        const updateData: any = { status }
        if (status === 'PAID') {
            updateData.paymentDate = new Date()
        }

        const invoice = await (db as any).invoice.update({
            where: { id: invoiceId },
            data: updateData
        })

        revalidatePath(`/admin/projects/${invoice.projectId}`)
        revalidatePath('/admin/finance')
        return { success: true }
    } catch (e) {
        console.error("updateInvoiceStatus error:", e)
        return { error: "Failed to update invoice status" }
    }
}

export async function deleteInvoice(invoiceId: string) {
    const session = await auth()
    const user = session?.user as any
    const isSuperAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN'
    if (!isSuperAdmin) return { error: "Unauthorized: Only Admin can delete invoices" }

    try {
        const invoice = await (db as any).invoice.findUnique({ where: { id: invoiceId } })
        if (invoice?.isLocked) return { error: "Cannot delete a locked invoice" }

        await (db as any).invoice.delete({ where: { id: invoiceId } })
        revalidatePath(`/admin/projects/${invoice?.projectId}`)
        revalidatePath('/admin/finance')
        return { success: true }
    } catch (e) {
        return { error: "Failed to delete invoice" }
    }
}

// ─────────────────────────────────────────
// VARIATION ORDER ACTIONS
// ─────────────────────────────────────────

export async function createVariationOrder(projectId: string, data: {
    title: string
    description?: string
    amount: number
    approvalDocUrl?: string
}) {
    const canEdit = await hasPermission('finance', 'viewContracts') || await hasPermission('finance', 'masterVisible')
    if (!canEdit) return { error: "Unauthorized: Requires Finance permission" }

    const session = await auth()
    const tenantId = (session?.user as any)?.tenantId

    try {
        const vo = await (db as any).variationOrder.create({
            data: {
                projectId,
                tenantId,
                title: data.title,
                description: data.description,
                amount: data.amount,
                approvalDocUrl: data.approvalDocUrl,
                status: 'PENDING',
            }
        })

        revalidatePath(`/admin/projects/${projectId}`)
        return { success: true, vo }
    } catch (e) {
        console.error("createVariationOrder error:", e)
        return { error: "Failed to create Variation Order" }
    }
}

export async function approveVariationOrder(voId: string, approve: boolean) {
    const session = await auth()
    const user = session?.user as any
    const isSuperAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN'
    const canApprove = await hasPermission('finance', 'masterVisible')

    if (!isSuperAdmin && !canApprove) return { error: "Unauthorized: Requires Finance Manager or Admin" }

    try {
        const vo = await (db as any).variationOrder.update({
            where: { id: voId },
            data: {
                status: approve ? 'APPROVED' : 'REJECTED',
                approvedById: user?.id,
                approvalDate: approve ? new Date() : null,
            }
        })

        revalidatePath(`/admin/projects/${vo.projectId}`)
        revalidatePath('/admin/finance')
        return { success: true }
    } catch (e) {
        console.error("approveVariationOrder error:", e)
        return { error: "Failed to update Variation Order" }
    }
}
