'use server'

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { hasPermission } from "@/lib/rbac"

// ─────────────────────────────────────────
// INVOICE ACTIONS
// ─────────────────────────────────────────

export async function createProjectInvoice(projectId: string, data: {
    description?: string
    baseAmount?: number
    dueDate?: string
    date: string
    invoiceType?: string
    items?: Array<{
        description: string
        quantity: number
        unitPrice: number
        taxRate?: number
    }>
}) {
    const canEdit = await hasPermission('finance', 'viewContracts') || await hasPermission('finance', 'masterVisible')
    if (!canEdit) return { error: "Unauthorized: Requires Finance permission" }

    const session = await auth()
    if (!session) return { error: "Not authenticated" }
    const tenantId = (session.user as any)?.tenantId

    try {
        // ── Resolve brand for auto-numbering ─────────────────────────────
        const project = await (db as any).project.findUnique({
            where: { id: projectId },
            select: {
                brandId: true,
                brand: { select: { abbreviation: true, nameEn: true } },
            },
        })
        if (!project) return { error: "Project not found" }

        const highestInv = await (db as any).invoice.findFirst({
            where: { project: { brandId: project.brandId } },
            orderBy: { sequenceNumber: 'desc' },
            select: { sequenceNumber: true },
        })
        const newSequence = (highestInv?.sequenceNumber ?? 0) + 1
        const abbrev = (project.brand?.abbreviation || project.brand?.nameEn?.slice(0, 3) || 'INV').toUpperCase()
        const invoiceNumber = `${abbrev}-INV-${String(newSequence).padStart(4, '0')}`

        // ── Build line items ──────────────────────────────────────────────
        // If items array is provided, compute totals from it.
        // Otherwise fall back to legacy single-amount behaviour.
        let baseAmount: number
        let vatAmount: number
        let totalAmount: number
        let itemsData: Array<{
            description: string
            quantity: number
            unitPrice: number
            taxRate: number
            taxAmount: number
            totalAmount: number
        }>

        if (data.items && data.items.length > 0) {
            itemsData = data.items.map(item => {
                const rate = item.taxRate ?? 0.15
                const lineBase = Math.round(item.quantity * item.unitPrice * 100) / 100
                const lineTax = Math.round(lineBase * rate * 100) / 100
                return {
                    description: item.description,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    taxRate: rate,
                    taxAmount: lineTax,
                    totalAmount: Math.round((lineBase + lineTax) * 100) / 100,
                }
            })
            baseAmount = Math.round(itemsData.reduce((s, i) => s + i.quantity * i.unitPrice, 0) * 100) / 100
            vatAmount = Math.round(itemsData.reduce((s, i) => s + i.taxAmount, 0) * 100) / 100
            totalAmount = Math.round((baseAmount + vatAmount) * 100) / 100
        } else {
            baseAmount = data.baseAmount ?? 0
            vatAmount = Math.round(baseAmount * 0.15 * 100) / 100
            totalAmount = Math.round((baseAmount + vatAmount) * 100) / 100
            itemsData = [{
                description: data.description || 'Service',
                quantity: 1,
                unitPrice: baseAmount,
                taxRate: 0.15,
                taxAmount: vatAmount,
                totalAmount,
            }]
        }

        // ── Atomic create: invoice + all line items ───────────────────────
        const invoice = await (db as any).$transaction(async (tx: any) => {
            const inv = await tx.invoice.create({
                data: {
                    projectId,
                    tenantId,
                    invoiceNumber,
                    sequenceNumber: newSequence,
                    description: data.description,
                    baseAmount,
                    vatAmount,
                    taxRate: 0.15,
                    totalAmount,
                    date: new Date(data.date),
                    dueDate: data.dueDate ? new Date(data.dueDate) : null,
                    status: 'ISSUED',
                    invoiceType: data.invoiceType || 'GENERAL',
                },
            })

            await tx.invoiceItem.createMany({
                data: itemsData.map(item => ({ invoiceId: inv.id, ...item })),
            })

            return inv
        })

        revalidatePath(`/admin/projects/${projectId}`)
        revalidatePath('/admin/finance')
        return { success: true, invoice }
    } catch (e) {
        console.error("createProjectInvoice error:", e)
        return { error: "Failed to create invoice" }
    }
}

// ─────────────────────────────────────────
// ZATCA-COMPLIANT INVOICE FETCH
// ─────────────────────────────────────────

export async function getZatcaInvoice(invoiceId: string) {
    const session = await auth()
    const user = session?.user as any
    if (!user) return { error: "Not authenticated" }

    const tenantId = user.tenantId as string | undefined
    const isGlobalSuper = user.role === 'GLOBAL_SUPER_ADMIN'

    if (!isGlobalSuper && !tenantId) return { error: "Tenant context missing" }

    try {
        const invoice = await (db as any).invoice.findFirst({
            where: isGlobalSuper
                ? { id: invoiceId }
                : { id: invoiceId, tenantId },
            include: {
                items: true,
                project: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                        serviceType: true,
                        client: {
                            select: {
                                id: true,
                                name: true,
                                taxNumber: true,
                                crNumber: true,
                                nationalAddress: true,
                                address: true,
                                phone: true,
                                email: true,
                            },
                        },
                    },
                },
                tenant: {
                    select: {
                        id: true,
                        name: true,
                        companyProfiles: {
                            take: 1,
                            select: {
                                companyNameAr: true,
                                companyNameEn: true,
                                logoUrl: true,
                                vatNumber: true,
                                crNumber: true,
                                nationalAddress: true,
                                address: true,
                                contactEmail: true,
                                contactPhone: true,
                                defaultCurrency: true,
                            },
                        },
                    },
                },
            },
        })

        if (!invoice) return { error: "Invoice not found or access denied" }
        return { success: true, invoice }
    } catch (e) {
        console.error("getZatcaInvoice error:", e)
        return { error: "Failed to fetch invoice" }
    }
}

export async function updateInvoiceStatus(invoiceId: string, status: string) {
    const session = await auth()
    const user = session?.user as any
    const tenantId = user?.tenantId

    const isSuperAdmin = ['GLOBAL_SUPER_ADMIN', 'SUPER_ADMIN', 'ADMIN'].includes(user?.role)
    const canEdit = await hasPermission('finance', 'masterVisible')

    // Only Admin can mark CANCELLED on locked invoices
    if (status === 'CANCELLED' && !isSuperAdmin) {
        return { error: "Unauthorized: Only Admin can cancel invoices" }
    }

    if (!isSuperAdmin && !canEdit) return { error: "Unauthorized" }
    if (!tenantId) return { error: "Tenant context missing" }

    try {
        // Verify the invoice belongs to this tenant before mutating
        const existing = await (db as any).invoice.findUnique({ where: { id: invoiceId } })
        if (!existing) return { error: "Invoice not found" }
        if (!isSuperAdmin && existing.tenantId !== tenantId) return { error: "Access denied" }

        const updateData: any = { status }
        const paidAt = new Date()
        if (status === 'PAID') {
            updateData.paymentDate = paidAt
        }

        // Atomic: invoice update + audit trail in a single transaction.
        // If either write fails the whole operation rolls back — no orphaned PAID state.
        const invoice = await (db as any).$transaction(async (tx: any) => {
            const updated = await tx.invoice.update({
                where: { id: invoiceId },
                data: updateData,
            })

            if (status === 'PAID') {
                // TARGET 4: Use existing.tenantId (the invoice's tenant) instead of the
                // session tenantId.  When a GLOBAL_SUPER_ADMIN marks an invoice as paid,
                // their session tenantId is "system", which would mis-attribute the audit
                // record to the wrong tenant.
                await tx.auditLog.create({
                    data: {
                        tenantId: existing.tenantId,
                        userId:   user?.id ?? null,
                        action:   'INVOICE_PAID',
                        details:  JSON.stringify({
                            invoiceId,
                            invoiceNumber: existing.invoiceNumber,
                            totalAmount:   existing.totalAmount,
                            paidAt:        paidAt.toISOString(),
                        }),
                    },
                })
            }

            return updated
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

    // TARGET 2: Precise role tiers for deletion.
    // GLOBAL_SUPER_ADMIN — cross-tenant SaaS operator, no tenant filter needed.
    // SUPER_ADMIN / ADMIN — tenant-scoped; deletion is restricted to their own tenantId.
    // Everyone else       — blocked.
    const isGlobalSuper = user?.role === 'GLOBAL_SUPER_ADMIN'
    const isTenantAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN'

    if (!isGlobalSuper && !isTenantAdmin) {
        return { error: "Unauthorized: Only Admin can delete invoices" }
    }

    const tenantId = user?.tenantId as string | undefined

    try {
        // Fetch the invoice — GLOBAL_SUPER_ADMIN uses no tenant filter;
        // ADMIN/SUPER_ADMIN are scoped to their own tenantId.
        const invoice = isGlobalSuper
            ? await (db as any).invoice.findUnique({ where: { id: invoiceId } })
            : await (db as any).invoice.findFirst({ where: { id: invoiceId, tenantId } })

        if (!invoice) return { error: "Invoice not found or access denied" }
        if (invoice.isLocked) return { error: "Cannot delete a locked invoice" }

        // Delete — tenant-admin path uses compound where to enforce isolation at DB level
        if (isGlobalSuper) {
            await (db as any).invoice.delete({ where: { id: invoiceId } })
        } else {
            await (db as any).invoice.delete({ where: { id: invoiceId, tenantId } })
        }

        revalidatePath(`/admin/projects/${invoice.projectId}`)
        revalidatePath('/admin/finance')
        return { success: true }
    } catch (e) {
        console.error("deleteInvoice error:", e)
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
    const isSuperAdmin = ['GLOBAL_SUPER_ADMIN', 'SUPER_ADMIN', 'ADMIN'].includes(user?.role)
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
