'use server'

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { getSystemSettings } from "@/app/actions/settings"
import { checkPermission, hasPermission } from "@/lib/rbac"

// --- Milestone Actions ---

export async function createMilestone(projectId: string, formData: FormData) {
    const session = await auth()
    const canManage = await hasPermission('finance', 'masterVisible')
    if (!canManage) {
        return { error: "Unauthorized: Requires Finance permission" }
    }
    const tenantId = (session?.user as any).tenantId

    const name = formData.get("name") as string
    const percentage = parseFloat(formData.get("percentage") as string)
    const category = formData.get("category") as string || "DESIGN"

    // We need to calculate amount based on Project Contract Value
    // Fetch project first
    const project = await db.project.findUnique({ where: { id: projectId } })
    if (!project) return { error: "Project not found" }

    const amount = (project.contractValue * percentage) / 100

    try {
        await (db as any).milestone.create({
            data: {
                tenantId,
                projectId,
                name,
                percentage,
                amount,
                category,
                status: "PENDING"
            }
        })
        revalidatePath(`/admin/projects/${projectId}`)
        return { success: true }
    } catch (e) {
        console.error(e)
        return { error: "Failed to create milestone" }
    }
}

export async function generateMonthlyMilestones(projectId: string, duration: number, startAmount?: number) {
    const session = await auth()
    const canManage = await hasPermission('finance', 'masterVisible')
    if (!canManage) {
        return { error: "Unauthorized: Requires Finance permission" }
    }
    const tenantId = (session?.user as any).tenantId

    const project = await db.project.findUnique({ where: { id: projectId } })
    if (!project) return { error: "Project not found" }

    // If startAmount is provided (e.g. fixed monthly fee), use it. 
    // Otherwise, maybe divide a supervision contract value? 
    // Usually supervision is a monthly fee. Let's assume the user enters the Monthly Fee in the UI or valid contract value.
    // For now, let's assume the project.contractValue IS the total supervision contract, or we use a provided monthly amount.
    // Requirement says: "Monthly Payments or Package". 
    // Let's implement: Total Contract / Duration = Monthly Amount.

    // Safety check
    if (duration <= 0) return { error: "Duration must be positive" }

    const monthlyAmount = startAmount || (project.contractValue / duration)
    const percentage = (monthlyAmount / project.contractValue) * 100

    try {
        await db.$transaction(
            Array.from({ length: duration }).map((_, index) => {
                return (db as any).milestone.create({
                    data: {
                        tenantId,
                        projectId,
                        name: `Supervision Month ${index + 1}`,
                        percentage: parseFloat(percentage.toFixed(2)),
                        amount: monthlyAmount,
                        category: "SUPERVISION",
                        status: "PENDING"
                    }
                })
            })
        )
        revalidatePath(`/admin/projects/${projectId}`)
        return { success: true }
    } catch (e) {
        console.error(e)
        return { error: "Failed to generate milestones" }
    }
}

export async function generateInvoiceFromMilestone(milestoneId: string) {
    const session = await auth()
    const canManage = await hasPermission('finance', 'masterVisible')
    if (!canManage) {
        return { error: "Unauthorized: Requires Finance permission" }
    }
    const tenantId = (session?.user as any).tenantId

    const milestone = await db.milestone.findUnique({
        where: { id: milestoneId },
        include: { project: true }
    })

    if (!milestone) return { error: "Milestone not found" }
    if (milestone.status !== "PENDING" && milestone.status !== "READY_TO_INVOICE") {
        return { error: "Milestone status invalid for invoicing" }
    }

    // Generate Invoice Number (Simple sequential logic for MVP, or random unique)
    // Ideally we count existing invoices for this year.
    const year = new Date().getFullYear()
    const count = await (db as any).invoice.count({
        where: {
            tenantId,
            createdAt: { gte: new Date(`${year}-01-01`) }
        }
    })
    const invoiceNumber = `INV-${year}-${(count + 1).toString().padStart(3, '0')}`

    // Fetch system settings for dynamic VAT
    const settings = await getSystemSettings()
    const currentVatRate = (settings?.vatPercentage || 15) / 100

    // Map to new ERP Schema
    const baseAmount = Number(milestone.amount)
    const vatAmount = baseAmount * currentVatRate
    const totalAmount = baseAmount + vatAmount

    try {
        // Transaction to ensure both created/updated
        await db.$transaction([
            (db as any).invoice.create({
                data: {
                    tenantId,
                    projectId: milestone.projectId,
                    invoiceNumber: `INV-${Date.now()}`, // Using timestamp for uniqueness
                    baseAmount,
                    taxRate: currentVatRate,
                    vatAmount,
                    totalAmount,
                    status: "ISSUED",
                    milestoneId: milestone.id,
                    date: new Date()
                }
            }),
            db.milestone.update({
                where: { id: milestone.id },
                data: { status: "INVOICED" }
            })
        ])

        revalidatePath(`/admin/projects/${milestone.projectId}`)
        revalidatePath('/admin/finance/invoices')
        return { success: true }
    } catch (e) {
        console.error(e)
        return { error: "Failed to generate invoice" }
    }
}

export async function updateMilestoneStatus(milestoneId: string, status: string) {
    const session = await auth()
    const canManage = await hasPermission('finance', 'masterVisible')
    if (!canManage) {
        return { error: "Unauthorized: Requires Finance permission" }
    }

    try {
        await db.milestone.update({
            where: { id: milestoneId },
            data: { status }
        })
        revalidatePath('/admin/projects')
        return { success: true }
    } catch (e) {
        return { error: "Update failed" }
    }
}
