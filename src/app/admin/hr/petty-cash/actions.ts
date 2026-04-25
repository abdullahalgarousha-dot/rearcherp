'use server'

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { hasPermission } from "@/lib/rbac"
import { archiveCustodySettlementToDrive } from "@/lib/google-drive"

const FINANCE_ROLES = ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'GLOBAL_SUPER_ADMIN']

// ─── EMPLOYEE: Request new custody ────────────────────────────────────────────
export async function createPettyCashRequest(data: {
    projectId: string
    reason: string
    amount: number
}) {
    const session = await auth()
    if (!session) return { error: "Not authenticated" }
    const userId = (session.user as any).id
    const tenantId = (session.user as any).tenantId

    try {
        const req = await (db as any).pettyCashRequest.create({
            data: {
                tenantId,
                projectId: data.projectId,
                userId,
                reason: data.reason,
                amount: data.amount,
                status: 'REQUESTED',
            }
        })
        revalidatePath('/admin/hr/petty-cash')
        return { success: true, id: req.id }
    } catch (e) {
        console.error("createPettyCashRequest error:", e)
        return { error: "Failed to submit request" }
    }
}

// ─── ACCOUNTANT: Approve custody (cash disbursed — NO auto expense) ───────────
export async function approvePettyCashRequest(requestId: string) {
    const session = await auth()
    const user = session?.user as any
    const isFinance = FINANCE_ROLES.includes(user?.role)
    const canApprove = await hasPermission('finance', 'masterVisible')
    if (!isFinance && !canApprove) return { error: "Unauthorized: Requires Finance permission" }

    try {
        await (db as any).pettyCashRequest.update({
            where: { id: requestId },
            data: { status: 'APPROVED' }
        })
        revalidatePath('/admin/hr/petty-cash')
        return { success: true }
    } catch (e) {
        console.error("approvePettyCashRequest error:", e)
        return { error: "Failed to approve request" }
    }
}

// ─── EMPLOYEE: Submit settlement invoices (proof of spend) ────────────────────
// IMPORTANT: This only settles the employee's obligation.
// It does NOT inject costs into Finance or Projects — that is the accountant's job.
export async function submitCustodySettlement(
    requestId: string,
    items: Array<{ amount: number; invoicePhotoUrl?: string; description?: string; projectId?: string }>
) {
    const session = await auth()
    if (!session) return { error: "Not authenticated" }
    const userId = (session.user as any).id
    const tenantId = (session.user as any).tenantId

    try {
        const request = await (db as any).pettyCashRequest.findUnique({
            where: { id: requestId }
        })
        if (!request) return { error: "Custody record not found" }
        if (request.userId !== userId) return { error: "This custody does not belong to you" }
        if (request.status !== 'APPROVED') {
            return { error: "Only approved custodies can be settled" }
        }

        // Archive the settlement invoices — no financial side-effects
        for (const item of items) {
            await (db as any).custodySettlementItem.create({
                data: {
                    requestId,
                    tenantId,
                    submittedById: userId,
                    projectId: item.projectId || request.projectId,
                    amount: item.amount,
                    invoicePhotoUrl: item.invoicePhotoUrl || null,
                    description: item.description || null,
                }
            })
        }

        // Move to PENDING_REVIEW — accountant now audits the uploads
        await (db as any).pettyCashRequest.update({
            where: { id: requestId },
            data: { status: 'PENDING_REVIEW' }
        })

        revalidatePath('/admin/hr/petty-cash')
        return { success: true }
    } catch (e) {
        console.error("submitCustodySettlement error:", e)
        return { error: "Failed to submit settlement" }
    }
}

// ─── ACCOUNTANT: Close custody — atomic: marks CLOSED + auto-creates Expense ──
// The Expense is created inside the same $transaction as the status change so
// the books are never inconsistent (closed custody with no expense record, or
// an expense record with an unclosed custody).
export async function closeCustody(requestId: string, notes?: string) {
    const session = await auth()
    const user = session?.user as any
    const tenantId = user?.tenantId
    const isFinance = FINANCE_ROLES.includes(user?.role)
    const canApprove = await hasPermission('finance', 'canApproveFinance')
    if (!isFinance && !canApprove) return { error: "Unauthorized: Requires Finance permission" }
    if (!tenantId) return { error: "Tenant context missing" }

    try {
        const request = await (db as any).pettyCashRequest.findUnique({
            where: { id: requestId },
            include: { settlementItems: true }
        })
        if (!request) return { error: "Custody record not found" }
        if (request.tenantId !== tenantId) return { error: "Access denied" }
        if (request.status !== 'PENDING_REVIEW') {
            return { error: "Only custodies in PENDING_REVIEW can be closed" }
        }

        // Sum verified settlement items — this becomes the expense amount
        const verifiedTotal = request.settlementItems.reduce(
            (sum: number, item: any) => sum + (item.amount || 0), 0,
        )

        // Atomic: close the custody AND record the expense in one transaction
        await (db as any).$transaction(async (tx: any) => {
            // 1. Close the custody request
            await tx.pettyCashRequest.update({
                where: { id: requestId },
                data: {
                    status:      'CLOSED',
                    closedById:  user.id,
                    closedAt:    new Date(),
                    closedNotes: notes || null,
                },
            })

            // 2. Auto-create Expense from the verified settlement total
            //    isTaxRecoverable = false — petty cash receipts are typically pre-tax consumer
            if (verifiedTotal > 0) {
                await tx.expense.create({
                    data: {
                        tenantId,
                        projectId:       request.projectId || null,
                        description:     `Petty Cash Settlement — ${request.reason}`,
                        category:        'PETTY_CASH',
                        amountBeforeTax: verifiedTotal,
                        taxRate:         0,
                        taxAmount:       0,
                        totalAmount:     verifiedTotal,
                        isTaxRecoverable: false,
                        date:            new Date(),
                    },
                })
            }
        })

        // Non-blocking Drive archive — closure never fails due to Drive issues
        archiveCustodySettlementToDrive(
            tenantId,
            requestId,
            request.projectId,
            request.settlementItems,
        ).catch(err => console.error('[Drive] Background custody archive failed:', err))

        revalidatePath('/admin/hr/petty-cash')
        revalidatePath('/admin/finance/expenses')
        return { success: true }
    } catch (e) {
        console.error("closeCustody error:", e)
        return { error: "Failed to close custody" }
    }
}

// ─── ACCOUNTANT: Reject a request ─────────────────────────────────────────────
export async function rejectPettyCashRequest(requestId: string) {
    const session = await auth()
    const user = session?.user as any
    const isFinance = FINANCE_ROLES.includes(user?.role)
    const canApprove = await hasPermission('finance', 'masterVisible')
    if (!isFinance && !canApprove) return { error: "Unauthorized" }

    try {
        await (db as any).pettyCashRequest.update({
            where: { id: requestId },
            data: { status: 'REJECTED' }
        })
        revalidatePath('/admin/hr/petty-cash')
        return { success: true }
    } catch (e) {
        return { error: "Failed to reject request" }
    }
}

// ─── FETCH: All requests (admin / accountant) ─────────────────────────────────
export async function getAllPettyCashRequests() {
    const session = await auth()
    const user = session?.user as any
    const isFinance = FINANCE_ROLES.includes(user?.role)
    const canView = await hasPermission('finance', 'masterVisible')
    if (!isFinance && !canView) return { error: "Unauthorized" }

    const tenantId = user?.tenantId
    const isGlobalAdmin = user?.role === 'GLOBAL_SUPER_ADMIN'

    const requests = await (db as any).pettyCashRequest.findMany({
        where: isGlobalAdmin ? {} : { tenantId },
        include: {
            user: { select: { id: true, name: true, email: true } },
            project: { select: { id: true, name: true } },
            closedBy: { select: { id: true, name: true } },
            settlementItems: {
                include: { project: { select: { name: true } } },
                orderBy: { createdAt: 'asc' }
            }
        },
        orderBy: { createdAt: 'desc' }
    })
    return { requests }
}

// ─── FETCH: My custodies (employee self-service) ──────────────────────────────
export async function getMyCustodies() {
    const session = await auth()
    if (!session) return { custodies: [] }
    const userId   = (session.user as any).id
    const tenantId = (session.user as any).tenantId

    const custodies = await (db as any).pettyCashRequest.findMany({
        where: { userId, tenantId },
        include: {
            project: { select: { id: true, name: true } },
            settlementItems: { orderBy: { createdAt: 'asc' } },
        },
        orderBy: { createdAt: 'desc' }
    })
    return { custodies }
}

// ─── FETCH: Settled custody archive (for accountant manual expense entry) ──────
export async function getCustodyArchive(filters?: { projectId?: string; userId?: string }) {
    const session = await auth()
    const user = session?.user as any
    const isFinance = FINANCE_ROLES.includes(user?.role)
    if (!isFinance) return { items: [] }

    const tenantId = user?.tenantId
    const isGlobalAdmin = user?.role === 'GLOBAL_SUPER_ADMIN'

    const items = await (db as any).custodySettlementItem.findMany({
        where: {
            ...(isGlobalAdmin ? {} : { tenantId }),
            ...(filters?.projectId ? { projectId: filters.projectId } : {}),
            ...(filters?.userId ? { submittedById: filters.userId } : {}),
        },
        include: {
            request: { select: { id: true, reason: true, amount: true, status: true, closedAt: true } },
            submittedBy: { select: { name: true } },
            project: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' }
    })
    return { items }
}
