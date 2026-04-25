'use server'

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { hasPermission } from "@/lib/rbac"

// ─────────────────────────────────────────────────────────────────
// SUB-CONTRACT ACTIONS
// ─────────────────────────────────────────────────────────────────

export async function createSubContract(projectId: string, data: {
    vendorId: string
    totalAmount: number
    contractDate: string
    scopeOfWork?: string
}) {
    const canManage = await hasPermission('finance', 'masterVisible')
    if (!canManage) return { error: "Unauthorized: Requires Finance Manager permission" }

    try {
        const vendor = await (db as any).vendor.findUnique({
            where: { id: data.vendorId },
            select: { companyName: true }
        })

        if (!vendor) return { error: "Vendor not found" }

        // Drive subfolder: skipped unless project has a driveFolderId field in future
        const driveFolderId: string | null = null

        const subContract = await (db as any).subContract.create({
            data: {
                vendorId: data.vendorId,
                projectId,
                totalAmount: data.totalAmount,
                contractDate: new Date(data.contractDate),
                scopeOfWork: data.scopeOfWork || null,
                driveFolderId,
            }
        })

        revalidatePath(`/admin/projects/${projectId}`)
        revalidatePath('/admin/finance')
        return { success: true, subContract, driveFolderCreated: !!driveFolderId }
    } catch (e: any) {
        console.error("createSubContract error:", e)
        return { error: e.message || "Failed to create sub-contract" }
    }
}

export async function updateSubContract(subContractId: string, data: {
    totalAmount?: number
    contractDate?: string
    scopeOfWork?: string
}) {
    const canManage = await hasPermission('finance', 'masterVisible')
    if (!canManage) return { error: "Unauthorized" }

    try {
        const sc = await (db as any).subContract.update({
            where: { id: subContractId },
            data: {
                ...(data.totalAmount !== undefined && { totalAmount: data.totalAmount }),
                ...(data.contractDate && { contractDate: new Date(data.contractDate) }),
                ...(data.scopeOfWork !== undefined && { scopeOfWork: data.scopeOfWork }),
            }
        })
        revalidatePath(`/admin/projects/${sc.projectId}`)
        return { success: true }
    } catch (e: any) {
        return { error: e.message || "Failed to update sub-contract" }
    }
}

export async function deleteSubContract(subContractId: string) {
    const session = await auth()
    const user = session?.user as any
    const isAdmin = ['GLOBAL_SUPER_ADMIN', 'SUPER_ADMIN', 'ADMIN'].includes(user?.role)
    const canManage = await hasPermission('finance', 'masterVisible')
    if (!isAdmin && !canManage) return { error: "Unauthorized" }

    try {
        const sc = await (db as any).subContract.findUnique({ where: { id: subContractId } })
        if (!sc) return { error: "Sub-contract not found" }

        // Check for paid milestones — can't delete if any exist
        const paidCount = await (db as any).vendorMilestone.count({
            where: { subContractId, status: 'PAID' }
        })
        if (paidCount > 0) return { error: `Cannot delete: ${paidCount} milestone(s) already paid. Contact Admin.` }

        await (db as any).subContract.delete({ where: { id: subContractId } })
        revalidatePath(`/admin/projects/${sc.projectId}`)
        return { success: true }
    } catch (e: any) {
        return { error: e.message || "Failed to delete sub-contract" }
    }
}

// ─────────────────────────────────────────────────────────────────
// VENDOR MILESTONE ACTIONS
// ─────────────────────────────────────────────────────────────────

export async function createVendorMilestone(subContractId: string, data: {
    description: string
    amount: number
    vatAmount?: number
    dueDate?: string
}) {
    const canManage = await hasPermission('finance', 'masterVisible')
    if (!canManage) return { error: "Unauthorized: Requires Finance Manager permission" }

    try {
        const milestone = await (db as any).vendorMilestone.create({
            data: {
                subContractId,
                description: data.description,
                amount: data.amount,
                vatAmount: data.vatAmount || 0,
                dueDate: data.dueDate ? new Date(data.dueDate) : null,
                status: 'PENDING',
            }
        })

        // Get subContract to revalidate project path
        const sc = await (db as any).subContract.findUnique({ where: { id: subContractId } })
        revalidatePath(`/admin/projects/${sc?.projectId}`)
        return { success: true, milestone }
    } catch (e: any) {
        console.error("createVendorMilestone error:", e)
        return { error: e.message || "Failed to create milestone" }
    }
}

export async function updateMilestoneStatus(
    milestoneId: string,
    status: 'PAID' | 'PENDING',
    formData?: FormData   // fields: transferReceipt (File), taxInvoice (File?), vatAmount (string?)
) {
    const session = await auth()
    const user = session?.user as any

    // CRITICAL RBAC: Only 'Approve Finance' permission holders can mark as PAID
    const isSuperAdmin = ['GLOBAL_SUPER_ADMIN', 'SUPER_ADMIN', 'ADMIN'].includes(user?.role)
    const canApprove = await hasPermission('finance', 'canApproveFinance')

    if (!isSuperAdmin && !canApprove) {
        return { error: "غير مصرح: فقط أصحاب صلاحية 'الموافقة المالية' يمكنهم تأكيد مدفوعات الموردين." }
    }

    try {
        const milestone = await (db as any).vendorMilestone.findUnique({
            where: { id: milestoneId },
            include: {
                subContract: {
                    include: { vendor: true }
                }
            }
        })
        if (!milestone) return { error: "المرحلة غير موجودة" }

        if (status === 'PAID') {
            const vendor = milestone.subContract.vendor
            const isVat = vendor.isVatRegistered === true
            const tenantId = vendor.tenantId

            // --- Validate required documents ---
            const transferFile = formData?.get('transferReceipt') as File | null
            const taxFile = formData?.get('taxInvoice') as File | null
            const vatAmountInput = formData?.get('vatAmount') as string | null

            const hasTransfer = (transferFile && transferFile.size > 0) || !!milestone.transferReceiptUrl
            const hasTaxInvoice = (taxFile && taxFile.size > 0) || !!milestone.taxInvoiceUrl

            // Transfer receipt is ALWAYS required
            if (!hasTransfer) {
                return { error: "مطلوب: إيصال الحوالة البنكية. يرجى رفع إيصال التحويل قبل تأكيد الدفع." }
            }

            // Tax invoice required ONLY for VAT-registered vendors
            if (isVat && !hasTaxInvoice) {
                return { error: "مطلوب: الفاتورة الضريبية. هذا المورد مسجل ضريبياً — يلزم رفع الفاتورة الضريبية لنظام ZATCA." }
            }

            let transferReceiptUrl = milestone.transferReceiptUrl
            let transferReceiptDriveId = milestone.transferReceiptDriveId
            let taxInvoiceUrl = milestone.taxInvoiceUrl
            let taxInvoiceDriveId = milestone.taxInvoiceDriveId
            let vatAmount = isVat ? (vatAmountInput ? parseFloat(vatAmountInput) : milestone.vatAmount) : 0

            // Upload transfer receipt
            if (transferFile && transferFile.size > 0) {
                const buf = Buffer.from(await transferFile.arrayBuffer())
                const fname = `Receipt_${vendor.companyName.replace(/\s+/g, '_')}_${milestoneId.slice(-6)}.pdf`
                const targetFolderId = milestone.subContract.driveFolderId
                if (targetFolderId) {
                    try {
                        const { uploadFileToDrive } = await import('@/lib/google-drive')
                        const result = await uploadFileToDrive(tenantId, buf, fname, transferFile.type || 'application/pdf', targetFolderId)
                        transferReceiptUrl = result.webViewLink
                        transferReceiptDriveId = result.fileId
                    } catch { /* non-blocking */ }
                }
            }

            // Upload tax invoice (VAT vendors only)
            if (isVat && taxFile && taxFile.size > 0) {
                const buf = Buffer.from(await taxFile.arrayBuffer())
                const fname = `TaxInvoice_${vendor.companyName.replace(/\s+/g, '_')}_${milestoneId.slice(-6)}.pdf`
                const targetFolderId = milestone.subContract.driveFolderId
                if (targetFolderId) {
                    try {
                        const { uploadFileToDrive } = await import('@/lib/google-drive')
                        const result = await uploadFileToDrive(tenantId, buf, fname, taxFile.type || 'application/pdf', targetFolderId)
                        taxInvoiceUrl = result.webViewLink
                        taxInvoiceDriveId = result.fileId
                    } catch { /* non-blocking */ }
                }
            }

            await (db as any).vendorMilestone.update({
                where: { id: milestoneId },
                data: {
                    status: 'PAID',
                    paidAt: new Date(),
                    paidById: user?.id,
                    vatAmount,
                    transferReceiptUrl,
                    transferReceiptDriveId,
                    taxInvoiceUrl,
                    taxInvoiceDriveId,
                }
            })
        } else {
            // Reverting to PENDING (Admin only)
            if (!isSuperAdmin) return { error: "فقط المدير يمكنه إلغاء تأكيد الدفع" }
            await (db as any).vendorMilestone.update({
                where: { id: milestoneId },
                data: { status: 'PENDING', paidAt: null, paidById: null }
            })
        }

        const sc = await (db as any).subContract.findUnique({ where: { id: milestone.subContractId } })
        revalidatePath(`/admin/projects/${sc?.projectId}`)
        revalidatePath('/admin/finance')
        revalidatePath(`/admin/finance/vendors`)
        return { success: true }
    } catch (e: any) {
        console.error("updateMilestoneStatus error:", e)
        return { error: e.message || "فشل في تحديث حالة الدفع" }
    }
}

export async function deleteMilestone(milestoneId: string) {
    const canManage = await hasPermission('finance', 'masterVisible')
    const session = await auth()
    const user = session?.user as any
    const isAdmin = ['GLOBAL_SUPER_ADMIN', 'SUPER_ADMIN', 'ADMIN'].includes(user?.role)
    if (!isAdmin && !canManage) return { error: "Unauthorized" }

    try {
        const milestone = await (db as any).vendorMilestone.findUnique({
            where: { id: milestoneId },
            include: { subContract: true }
        })
        if (!milestone) return { error: "Milestone not found" }
        if (milestone.status === 'PAID' && !isAdmin) {
            return { error: "Cannot delete a paid milestone. Contact Admin." }
        }
        await (db as any).vendorMilestone.delete({ where: { id: milestoneId } })
        revalidatePath(`/admin/projects/${milestone.subContract.projectId}`)
        return { success: true }
    } catch (e: any) {
        return { error: e.message || "Failed to delete milestone" }
    }
}

// ─────────────────────────────────────────────────────────────────
// PROJECT SUB-CONTRACT QUERY
// ─────────────────────────────────────────────────────────────────

export async function getProjectSubContracts(projectId: string) {
    const canView = await hasPermission('finance', 'masterVisible')
        || await hasPermission('finance', 'viewContracts')
    if (!canView) return []

    try {
        return await (db as any).subContract.findMany({
            where: { projectId },
            include: {
                vendor: true,
                milestones: { orderBy: { createdAt: 'asc' } }
            },
            orderBy: { contractDate: 'desc' }
        })
    } catch (e) {
        console.error("getProjectSubContracts error:", e)
        return []
    }
}

// Lightweight vendor list for the sub-contract dialog dropdown
export async function getVendorsForProject(): Promise<{ id: string; companyName: string; specialty: string; taxNumber?: string }[]> {
    const session = await auth()
    if (!session?.user) return []

    try {
        const vendors = await (db as any).vendor.findMany({
            orderBy: { companyName: 'asc' },
            select: { id: true, companyName: true, specialty: true, taxNumber: true }
        })
        return vendors
    } catch (e) {
        console.error("getVendorsForProject error:", e)
        return []
    }
}
