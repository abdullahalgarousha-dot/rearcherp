'use server'

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { hasPermission } from "@/lib/rbac"

// ==========================================
// DRIVE INTEGRATION HELPER
// ==========================================
async function triggerVendorDriveFolders(tenantId: string, vendorId: string, companyName: string) {
    try {
        const { getDriveSettings, createVendorFolders } = await import('@/lib/google-drive')
        const { driveFolderId: rootId } = await getDriveSettings(tenantId)
        const folderMap = await createVendorFolders(tenantId, companyName, rootId)
        await (db as any).vendor.update({
            where: { id: vendorId },
            data: { driveFolderId: folderMap.root }
        })
        console.log(`[Drive] Vendor "${companyName}" folder created: ${folderMap.root}`)
    } catch (driveErr) {
        console.warn(`[Drive] Failed to create vendor folders for "${companyName}" (non-blocking):`, driveErr)
    }
}

// ─────────────────────────────────────────────────────────────────
// VENDOR CRUD
// ─────────────────────────────────────────────────────────────────

export async function createVendor(data: {
    companyName: string
    specialty: string
    isVatRegistered?: boolean
    taxNumber?: string
    bankAccountDetails?: string
    contactPerson?: string
    phone?: string
    email?: string
}) {
    const session = await auth()
    const canManage = await hasPermission('finance', 'masterVisible')
    if (!canManage) return { error: "Unauthorized: Requires Finance Manager permission" }
    const tenantId = (session?.user as any).tenantId

    try {
        const vendor = await (db as any).vendor.create({
            data: {
                companyName: data.companyName,
                specialty: data.specialty,
                isVatRegistered: data.isVatRegistered ?? false,
                taxNumber: data.isVatRegistered ? (data.taxNumber || null) : null,
                bankAccountDetails: data.bankAccountDetails || null,
                contactPerson: data.contactPerson || null,
                phone: data.phone || null,
                email: data.email || null,
            }
        })
        revalidatePath('/admin/finance/vendors')

        // Fire Drive folder creation asynchronously (non-blocking)
        triggerVendorDriveFolders(tenantId, vendor.id, vendor.companyName)

        return { success: true, vendor }
    } catch (e: any) {
        console.error("createVendor error:", e)
        return { error: e.message || "Failed to create vendor" }
    }
}

export async function updateVendor(vendorId: string, data: {
    companyName?: string
    specialty?: string
    taxNumber?: string
    bankAccountDetails?: string
    contactPerson?: string
    phone?: string
    email?: string
}) {
    const canManage = await hasPermission('finance', 'masterVisible')
    if (!canManage) return { error: "Unauthorized" }

    try {
        await (db as any).vendor.update({
            where: { id: vendorId },
            data
        })
        revalidatePath('/admin/finance/vendors')
        return { success: true }
    } catch (e: any) {
        return { error: e.message || "Failed to update vendor" }
    }
}

export async function deleteVendor(vendorId: string) {
    const session = await auth()
    const user = session?.user as any
    const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN'
    if (!isAdmin) return { error: "Unauthorized: Only Admin can delete vendors" }

    try {
        // Check for active sub-contracts
        const activeContracts = await (db as any).subContract.count({
            where: { vendorId }
        })
        if (activeContracts > 0) {
            return { error: `Cannot delete vendor: ${activeContracts} sub-contract(s) exist. Archive them first.` }
        }

        await (db as any).vendor.delete({ where: { id: vendorId } })
        revalidatePath('/admin/finance/vendors')
        return { success: true }
    } catch (e: any) {
        return { error: e.message || "Failed to delete vendor" }
    }
}

// ─────────────────────────────────────────────────────────────────
// VENDOR QUERIES
// ─────────────────────────────────────────────────────────────────

export async function getAllVendors() {
    const canView = await hasPermission('finance', 'masterVisible')
        || await hasPermission('finance', 'viewContracts')
    if (!canView) return []

    try {
        const vendors = await (db as any).vendor.findMany({
            include: {
                subContracts: {
                    include: {
                        project: { select: { id: true, name: true, code: true } },
                        milestones: true,
                    }
                }
            },
            orderBy: { companyName: 'asc' }
        })

        return vendors.map((v: any) => {
            const totalContracted = v.subContracts.reduce((s: number, sc: any) => s + sc.totalAmount, 0)
            const totalPaid = v.subContracts.reduce((s: number, sc: any) =>
                s + sc.milestones.filter((m: any) => m.status === 'PAID').reduce((ms: number, m: any) => ms + m.amount, 0), 0
            )
            return {
                ...v,
                totalContracted,
                totalPaid,
                balance: totalContracted - totalPaid,
                activeContractsCount: v.subContracts.length,
            }
        })
    } catch (e) {
        console.error("getAllVendors error:", e)
        return []
    }
}

export async function getVendorStatement(vendorId: string) {
    const canView = await hasPermission('finance', 'masterVisible')
        || await hasPermission('finance', 'viewContracts')
    if (!canView) return null

    try {
        const vendor = await (db as any).vendor.findUnique({
            where: { id: vendorId },
            include: {
                subContracts: {
                    include: {
                        project: { select: { id: true, name: true, code: true, status: true } },
                        milestones: {
                            orderBy: { createdAt: 'asc' }
                        }
                    },
                    orderBy: { contractDate: 'desc' }
                }
            }
        })

        if (!vendor) return null

        const totalContracted = vendor.subContracts.reduce((s: number, sc: any) => s + sc.totalAmount, 0)
        const totalPaid = vendor.subContracts.reduce((s: number, sc: any) =>
            s + sc.milestones.filter((m: any) => m.status === 'PAID').reduce((ms: number, m: any) => ms + m.amount, 0), 0
        )
        const totalVatPaid = vendor.subContracts.reduce((s: number, sc: any) =>
            s + sc.milestones.filter((m: any) => m.status === 'PAID').reduce((ms: number, m: any) => ms + (m.vatAmount || 0), 0), 0
        )

        return {
            ...vendor,
            totalContracted,
            totalPaid,
            balance: totalContracted - totalPaid,
            totalVatPaid,  // For ZATCA Input VAT reconciliation
        }
    } catch (e) {
        console.error("getVendorStatement error:", e)
        return null
    }
}
