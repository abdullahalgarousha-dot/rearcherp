"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { checkPermission } from "@/lib/rbac"

export async function processLeaveRequest(id: string, action: 'APPROVE' | 'REJECT', rejectionReason?: string) {
    const session = await auth()
    const userId = (session?.user as any)?.id
    if (!userId) return { error: "Unauthorized" }

    try {
        const leave = await db.leaveRequest.findUnique({
            where: { id },
            include: { user: { include: { profile: true } } }
        })

        if (!leave || !leave.user?.profile) return { error: "Leave request or profile not found" }

        const isHR = await checkPermission('HR', 'approve')
        const isManager = leave.user.profile.directManagerId === userId

        if (!isHR && !isManager) {
            return { error: "You do not have permission to process this request." }
        }

        if (action === 'REJECT') {
            await db.leaveRequest.update({
                where: { id },
                data: {
                    status: 'REJECTED',
                    rejectionReason,
                    reviewerId: isManager ? userId : null,
                    approverId: isHR ? userId : null
                }
            })
        } else {
            // APPROVAL LOGIC
            if (leave.status === 'PENDING_MANAGER' && isManager) {
                // Manager approved, now goes to HR
                await db.leaveRequest.update({
                    where: { id },
                    data: {
                        status: 'PENDING_HR',
                        reviewerId: userId
                    }
                })
            } else if ((leave.status === 'PENDING_HR' || leave.status === 'PENDING_MANAGER') && isHR) {
                // Final HR Approval
                // Deduct balance
                const daysRequested = Math.ceil((new Date(leave.endDate).getTime() - new Date(leave.startDate).getTime()) / (1000 * 3600 * 24)) + 1

                await db.$transaction([
                    db.leaveRequest.update({
                        where: { id },
                        data: {
                            status: 'APPROVED',
                            approverId: userId
                        }
                    }),
                    db.employeeProfile.update({
                        where: { id: leave.user.profile.id },
                        data: {
                            leaveBalance: { decrement: daysRequested }
                        }
                    })
                ])
            } else {
                return { error: "Invalid workflow state for approval." }
            }
        }

        revalidatePath('/admin/hr/requests')
        return { success: true }
    } catch (e) {
        console.error(e)
        return { error: "Failed to process request" }
    }
}

export async function processLoanRequest(id: string, action: 'APPROVE' | 'REJECT', rejectionReason?: string) {
    const session = await auth()
    const userId = (session?.user as any)?.id
    const isHR = await checkPermission('HR', 'approve')
    const isFinance = await checkPermission('FINANCE', 'approve')

    // In a real scenario, we'd check if `userId` is the direct manager.
    // For MVP, we'll let Manager or HR approve step 1, Finance step 2.

    try {
        const loanReq = await db.loanRequest.findUnique({ where: { id } })
        if (!loanReq) return { error: "Loan request not found" }

        if (action === 'REJECT') {
            await db.loanRequest.update({
                where: { id },
                data: { status: 'REJECTED', rejectionReason }
            })
        } else {
            if (loanReq.status === 'PENDING_MANAGER' || loanReq.status === 'PENDING_HR') {
                if (!isHR) return { error: "Unauthorized for this step." }
                await db.loanRequest.update({
                    where: { id },
                    data: { status: 'PENDING_FINANCE', hrApprovedAt: new Date() }
                })
            } else if (loanReq.status === 'PENDING_FINANCE') {
                if (!isFinance) return { error: "Only Finance can give final approval." }

                // Final Approval: Create the Active Loan
                await db.$transaction([
                    db.loanRequest.update({
                        where: { id },
                        data: { status: 'APPROVED', financeApprovedAt: new Date() }
                    }),
                    db.loan.create({
                        data: {
                            profileId: loanReq.profileId,
                            totalAmount: loanReq.amount,
                            monthlyDeduction: loanReq.monthlyDeduction,
                            remaining: loanReq.amount,
                            paidAmount: 0,
                            status: 'ACTIVE'
                        }
                    })
                ])
            }
        }
        revalidatePath('/admin/hr/requests')
        return { success: true }
    } catch (e) {
        console.error(e)
        return { error: "Failed to process loan request" }
    }
}

export async function processDocumentRequest(id: string, action: 'APPROVE' | 'REJECT', rejectionReason?: string) {
    const session = await auth()
    const isHR = await checkPermission('HR', 'write')
    if (!isHR) return { error: "Only HR can process document requests." }

    try {
        await db.documentRequest.update({
            where: { id },
            data: {
                status: action === 'APPROVE' ? 'READY_FOR_PICKUP' : 'REJECTED',
                rejectionReason: action === 'REJECT' ? rejectionReason : null
            }
        })
        revalidatePath('/admin/hr/requests')
        return { success: true }
    } catch (e) {
        return { error: "Failed to process document request" }
    }
}
