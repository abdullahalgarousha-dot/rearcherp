"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

export async function submitLeaveRequest(formData: FormData) {
    const session = await auth()
    const userId = (session?.user as any)?.id
    if (!userId) return { error: "Unauthorized" }

    try {
        const type = formData.get("type") as string
        const startDate = new Date(formData.get("startDate") as string)
        const endDate = new Date(formData.get("endDate") as string)
        const reason = formData.get("reason") as string

        if (!type || !startDate || !endDate) return { error: "Missing required fields" }

        await db.leaveRequest.create({
            data: {
                userId,
                type,
                startDate,
                endDate,
                reason,
                status: "PENDING_MANAGER"
            }
        })

        revalidatePath('/dashboard/requests')
        return { success: true }
    } catch (e) {
        console.error(e)
        return { error: "Failed to submit leave request" }
    }
}

export async function submitLoanRequest(formData: FormData) {
    const session = await auth()
    const userId = (session?.user as any)?.id
    if (!userId) return { error: "Unauthorized" }

    try {
        const profile = await db.employeeProfile.findUnique({ where: { userId } })
        if (!profile) return { error: "Employee profile not found" }

        const amount = parseFloat(formData.get("amount") as string)
        const installments = parseInt(formData.get("installments") as string)
        const reason = formData.get("reason") as string

        if (!amount || !installments || amount <= 0 || installments <= 0) {
            return { error: "Invalid amount or installments" }
        }

        const monthlyDeduction = amount / installments

        await db.loanRequest.create({
            data: {
                profileId: profile.id,
                amount,
                installments,
                reason,
                monthlyDeduction,
                status: "PENDING_MANAGER"
            }
        })

        revalidatePath('/dashboard/requests')
        return { success: true }
    } catch (e) {
        console.error(e)
        return { error: "Failed to submit loan request" }
    }
}

export async function submitDocumentRequest(formData: FormData) {
    const session = await auth()
    const userId = (session?.user as any)?.id
    if (!userId) return { error: "Unauthorized" }

    try {
        const profile = await db.employeeProfile.findUnique({ where: { userId } })
        if (!profile) return { error: "Employee profile not found" }

        const type = formData.get("type") as string
        const details = formData.get("details") as string

        if (!type) return { error: "Document type is required" }

        await db.documentRequest.create({
            data: {
                profileId: profile.id,
                type,
                details,
                status: "PENDING_HR" // Documents usually go straight to HR
            }
        })

        revalidatePath('/dashboard/requests')
        return { success: true }
    } catch (e) {
        console.error(e)
        return { error: "Failed to submit document request" }
    }
}
