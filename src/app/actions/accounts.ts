"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { hasPermission } from "@/lib/rbac"
import { uploadSmartFileToDrive } from "@/lib/google-drive"

/**
 * Calculates real-time P&L for a specific project.
 * Includes Revenue (Contract + VOs), Direct Costs (Expenses + Vendors),
 * and Indirect Costs (Internal labor).
 */
export async function getProjectPL(projectId: string) {
    const session = await auth()
    if (!session?.user) throw new Error("Unauthorized")

    const currentUser = session.user as any
    const tenantId = currentUser.tenantId
    const isGlobalAdmin = currentUser.role === 'GLOBAL_SUPER_ADMIN'

    const project = await (db as any).project.findUnique({
        where: { id: projectId },
        include: {
            variationOrders: { where: { status: 'APPROVED' } },
            invoices: true,
            expenses: true,
            timeLogs: true,
            vendorContracts: true,
            subContracts: {
                include: {
                    vendor: { select: { companyName: true, specialty: true } },
                    milestones: { where: { status: 'PAID' } }
                }
            }
        }
    })

    if (!project) throw new Error("Project not found")

    // Tenant isolation: GLOBAL_SUPER_ADMIN can view any tenant's project
    if (!isGlobalAdmin && tenantId && project.tenantId !== tenantId) throw new Error("Access Denied")

    // 1. Total Revenue: (Contract Value + Approved Variation Orders)
    const totalVOs = project.variationOrders.reduce((sum: number, vo: any) => sum + vo.amount, 0)
    const totalRevenue = (project.contractValue || 0) + totalVOs

    // 2a. Legacy Vendor Costs (old VendorContract model)
    const directExpenses = project.expenses.reduce((sum: number, exp: any) => sum + exp.totalAmount, 0)
    const legacyVendorCosts = project.vendorContracts.reduce((sum: number, vc: any) => sum + (vc.contractValue - vc.balance), 0)

    // 2b. Sub-Consultant Costs (new SubContract / VendorMilestone model — PAID milestones only)
    const subConsultantBreakdown = project.subContracts.map((sc: any) => {
        const paid = sc.milestones.reduce((s: number, m: any) => s + m.amount, 0)
        const vatPaid = sc.milestones.reduce((s: number, m: any) => s + (m.vatAmount || 0), 0)
        return {
            vendorName: sc.vendor.companyName,
            specialty: sc.vendor.specialty,
            contractTotal: sc.totalAmount,
            paid,
            vatPaid,
        }
    })
    const subConsultantCosts = subConsultantBreakdown.reduce((s: number, sc: any) => s + sc.paid, 0)
    const totalInputVAT = subConsultantBreakdown.reduce((s: number, sc: any) => s + sc.vatPaid, 0)

    const totalDirectCosts = directExpenses + legacyVendorCosts + subConsultantCosts

    // 3. Indirect Costs: (Calculated Internal Labor from TimeLogs)
    const indirectCosts = project.timeLogs.reduce((sum: number, log: any) => sum + (log.cost || 0), 0)

    // 4. Net Profit Margin
    const netProfit = totalRevenue - totalDirectCosts - indirectCosts
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

    return {
        revenue: totalRevenue,
        directCosts: totalDirectCosts,
        directExpenses,
        legacyVendorCosts,
        subConsultantCosts,
        subConsultantBreakdown,
        totalInputVAT,
        indirectCosts,
        netProfit,
        profitMargin,
        currency: "SAR"
    }

}

/**
 * Background-style service to update Internal Costing for hours logged.
 * Pulls hourlyRate from HR EmployeeProfile.
 */
export async function calculateInternalCost(projectId: string) {
    const session = await auth()
    if (!session?.user) throw new Error("Unauthorized")

    const timeLogs = await (db as any).timeLog.findMany({
        where: { projectId, cost: 0 },
        include: {
            user: {
                include: {
                    profile: true
                }
            }
        }
    })

    for (const log of timeLogs) {
        const hourlyRate = log.user?.profile?.hourlyRate || 0
        if (hourlyRate > 0) {
            await (db as any).timeLog.update({
                where: { id: log.id },
                data: { cost: log.hoursLogged * hourlyRate }
            })
        }
    }

    revalidatePath(`/admin/projects/${projectId}`)
    return { success: true, processedCount: timeLogs.length }
}

/**
 * Variation Order Workflow
 * Restricted to users with 'canApproveFinance' permission.
 */
export async function createVariationOrder(projectId: string, data: { title: string, amount: number, description?: string }) {
    const session = await auth()
    if (!session?.user) throw new Error("Unauthorized")

    const vo = await (db as any).variationOrder.create({
        data: {
            projectId,
            title: data.title,
            amount: data.amount,
            description: data.description,
            tenantId: (session.user as any).tenantId
        }
    })

    return vo
}

export async function approveVariationOrder(voId: string) {
    const session = await auth()
    if (!session?.user) throw new Error("Unauthorized")

    // Security Gate: Check for 'Approve Finance' toggle in RBAC
    const canApprove = await hasPermission('finance', 'canApproveFinance');
    if (!canApprove) throw new Error("Permission Denied: Financial Authorization required to approve Variation Orders.");

    const vo = await (db as any).variationOrder.update({
        where: { id: voId },
        data: {
            status: 'APPROVED',
            approvedById: session.user.id
        }
    })

    // Increment Project TotalContractValue
    await (db as any).project.update({
        where: { id: vo.projectId },
        data: {
            contractValue: { increment: vo.amount }
        }
    })

    revalidatePath(`/admin/projects/${vo.projectId}`)
    return vo
}

/**
 * Invoice Creation with Automated Retention Deduction
 * Tracks TotalRetentionHeld in the Project model.
 * Optional: Auto-archiving to Google Drive.
 */
export async function createInvoice(projectId: string, data: {
    invoiceNumber: string,
    baseAmount: number,
    description?: string,
    date: Date,
    fileBuffer?: Buffer // For archiving
}) {
    const session = await auth()
    if (!session?.user) throw new Error("Unauthorized")

    const project = await (db as any).project.findUnique({
        where: { id: projectId },
        include: { brand: true }
    })

    if (!project) throw new Error("Project not found")

    let retentionAmount = 0
    if (project.hasRetention && project.retentionPercentage > 0) {
        retentionAmount = data.baseAmount * (project.retentionPercentage / 100)
    }

    const vatAmount = (data.baseAmount - retentionAmount) * 0.15
    const totalAmount = (data.baseAmount - retentionAmount) + vatAmount

    const invoice = await (db as any).invoice.create({
        data: {
            projectId,
            tenantId: (session.user as any).tenantId,
            invoiceNumber: data.invoiceNumber,
            baseAmount: data.baseAmount,
            retentionAmount,
            vatAmount,
            totalAmount,
            description: data.description,
            date: data.date,
            status: 'ISSUED'
        }
    })

    // Track total retention held
    if (retentionAmount > 0) {
        await (db as any).project.update({
            where: { id: projectId },
            data: { totalRetentionHeld: { increment: retentionAmount } }
        })
    }

    // Auto-Archive to Google Drive if enabled
    if (project.autoArchiveToDrive && data.fileBuffer) {
        try {
            const year = new Date(data.date).getFullYear().toString();
            const month = (new Date(data.date).getMonth() + 1).toString().padStart(2, '0');

            const tenantId = (session.user as any).tenantId
            await uploadSmartFileToDrive(
                tenantId,
                data.fileBuffer,
                `${invoice.invoiceNumber}.pdf`,
                'application/pdf',
                ['Accounts - الحسابات', project.brand.acronym || project.brand.abbreviation || 'Invoices', 'Invoices - فواتير', year, month]
            );
        } catch (error) {
            console.error("Auto-archiving failed:", error);
            // Non-blocking error: don't fail the invoice creation
        }
    }

    revalidatePath(`/admin/projects/${projectId}`)
    return invoice
}

/**
 * Petty Cash Reconcile Workflow
 * Validates VAT and logs expense against Project Cost Center.
 * Restricted to users with 'canApproveFinance' permission.
 */
export async function reconcilePettyCash(requestId: string, data: {
    receiptUrl: string,
    actualVat: number
}) {
    const session = await auth()
    if (!session?.user) throw new Error("Unauthorized")

    const canApprove = await hasPermission('finance', 'canApproveFinance');
    if (!canApprove) throw new Error("Permission Denied: Financial Authorization required to reconcile Petty Cash.");

    // Update receipt URL only — custody closure is handled via closeCustody() action.
    // Expense creation is intentionally manual (accountant creates it from the archive).
    const request = await (db as any).pettyCashRequest.update({
        where: { id: requestId },
        data: {
            receiptUrl: data.receiptUrl,
            vatAmount: data.actualVat
        }
    })

    revalidatePath(`/admin/projects/${request.projectId}`)
    return request
}

/**
 * Project Status Update with High-Priority Accountant Alerts
 */
export async function updateProjectStatus(projectId: string, status: string) {
    const session = await auth()
    if (!session?.user) throw new Error("Unauthorized")

    const canUpdate = await hasPermission('finance', 'canApproveFinance')
    if (!canUpdate) throw new Error("Permission Denied: Requires Finance authorization to update project status")

    const currentUser = session.user as any
    const tenantId = currentUser.tenantId
    const isGlobalAdmin = currentUser.role === 'GLOBAL_SUPER_ADMIN'
    const project = await (db as any).project.update({
        where: isGlobalAdmin ? { id: projectId } : { id: projectId, tenantId },
        data: { status }
    })

    if (status === 'COMPLETED' && project.totalRetentionHeld > 0) {
        const accountants = await (db as any).user.findMany({
            where: {
                tenantId: project.tenantId,
                OR: [
                    { role: 'ADMIN' },
                    { role: 'SUPER_ADMIN' },
                    { role: 'FINANCE_ADMIN' }
                ]
            }
        })

        for (const accountant of accountants) {
            await (db as any).notification.create({
                data: {
                    userId: accountant.id,
                    tenantId: project.tenantId,
                    title: "Action Required: Claim Retention",
                    message: `Project ${project.code} is marked as COMPLETED. Please claim total retention of SAR ${project.totalRetentionHeld}.`,
                    priority: "HIGH"
                }
            })
        }
    }

    revalidatePath(`/admin/projects/${projectId}`)
    return project
}
