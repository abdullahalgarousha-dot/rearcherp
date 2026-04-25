'use server'

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

const ADMIN_ROLES = ['GLOBAL_SUPER_ADMIN', 'SUPER_ADMIN', 'ADMIN', 'HR_MANAGER']

async function getAdminUser() {
    const session = await auth()
    const user = session?.user as any
    if (!user?.id) throw new Error("Not authenticated")
    if (!ADMIN_ROLES.includes(user.role)) throw new Error("Unauthorized")
    return { userId: user.id as string, tenantId: (user.tenantId as string) || 't_undefined' }
}

// ── Approve ───────────────────────────────────────────────────────────────────

export async function approveInboxRequest(type: string, id: string) {
    try {
        const { userId: adminId } = await getAdminUser()

        if (type === 'LEAVE') {
            const leave = await (db as any).leaveRequest.findUnique({ where: { id } })
            if (!leave) return { error: 'Leave request not found' }

            await (db as any).leaveRequest.update({
                where: { id },
                data: { status: 'APPROVED', approverId: adminId }
            })

            // ── Balance deduction ─────────────────────────────────────────────
            const days = Math.max(1,
                Math.ceil((new Date(leave.endDate).getTime() - new Date(leave.startDate).getTime()) / 86_400_000) + 1
            )

            const leaveTypeToField: Record<string, string> = {
                ANNUAL:    'annualLeaveUsed',
                SICK:      'sickLeaveUsed',
                EMERGENCY: 'emergencyLeaveUsed',
            }
            const field = leaveTypeToField[leave.type]

            const profile = await (db as any).employeeProfile.findUnique({
                where: { userId: leave.userId },
                select: { id: true, tenantId: true }
            })
            if (profile && field) {
                await (db as any).employeeHRStats.upsert({
                    where: { profileId: profile.id },
                    create: {
                        profileId: profile.id,
                        tenantId: profile.tenantId || 't_undefined',
                        [field]: days,
                    },
                    update: { [field]: { increment: days } },
                })
            }

        } else if (type === 'PERMISSION') {
            await (db as any).permissionRequest.update({
                where: { id },
                data: { status: 'APPROVED' }
            })

        } else if (type === 'LOAN') {
            const loan = await (db as any).loanRequest.findUnique({
                where: { id },
                include: { profile: { include: { user: { select: { name: true } } } } }
            })
            if (!loan) return { error: 'Loan request not found' }

            const tenantId = loan.tenantId || 't_undefined'

            await (db as any).loanRequest.update({
                where: { id },
                data: { status: 'APPROVED', hrApprovedAt: new Date() }
            })

            // ── PIPE 1: Create active Loan record (repayment tracker) ────────
            await (db as any).loan.create({
                data: {
                    profileId: loan.profileId,
                    tenantId,
                    totalAmount: loan.amount,
                    paidAmount: 0,
                    remaining: loan.amount,
                    monthlyDeduction: loan.monthlyDeduction,
                    status: 'ACTIVE',
                }
            })

            // ── PIPE 1: Financial Bridge — post to FinancialLedger ───────────
            // This gives Finance a single source of truth for all cash outflows
            // originating from HR without needing to join LoanRequest directly.
            const employeeName = loan.profile?.user?.name || 'Employee'
            await (db as any).financialLedger.create({
                data: {
                    tenantId,
                    type: 'EXPENSE',
                    category: 'Employee Advances',
                    description: `Salary advance approved for ${employeeName} — SAR ${loan.amount.toLocaleString()} over ${loan.installments} months (SAR ${loan.monthlyDeduction.toLocaleString()}/mo)`,
                    amount: loan.amount,
                    referenceType: 'LOAN_REQUEST',
                    referenceId: id,
                    date: new Date(),
                }
            })

        } else if (type === 'DOCUMENT') {
            await (db as any).documentRequest.update({
                where: { id },
                data: { status: 'APPROVED' }
            })
        }

        revalidatePath('/admin/hr')
        return { success: true }
    } catch (e: any) {
        console.error('[approveInboxRequest]', e.message)
        return { error: e.message || 'Approval failed' }
    }
}

// ── Reject ────────────────────────────────────────────────────────────────────

export async function rejectInboxRequest(type: string, id: string, reason: string) {
    try {
        await getAdminUser()

        const rejectionData = { status: 'REJECTED', rejectionReason: reason || 'Rejected by HR' }

        if (type === 'LEAVE')      await (db as any).leaveRequest.update({ where: { id }, data: rejectionData })
        else if (type === 'PERMISSION') await (db as any).permissionRequest.update({ where: { id }, data: rejectionData })
        else if (type === 'LOAN')  await (db as any).loanRequest.update({ where: { id }, data: { status: 'REJECTED', rejectionReason: rejectionData.rejectionReason } })
        else if (type === 'DOCUMENT') await (db as any).documentRequest.update({ where: { id }, data: { status: 'REJECTED', rejectionReason: rejectionData.rejectionReason } })

        revalidatePath('/admin/hr')
        return { success: true }
    } catch (e: any) {
        console.error('[rejectInboxRequest]', e.message)
        return { error: e.message || 'Rejection failed' }
    }
}

async function getSessionUser() {
    const session = await auth()
    const user = session?.user as any
    if (!user?.id) throw new Error("Not authenticated")
    return {
        userId: user.id as string,
        tenantId: (user.tenantId as string) || 't_undefined',
    }
}

// ── Leave Request ─────────────────────────────────────────────────────────────

export async function submitLeaveRequest(data: {
    leaveType: string
    startDate: string
    endDate: string
    reason?: string
}) {
    try {
        const { userId, tenantId } = await getSessionUser()

        const profile = await (db as any).employeeProfile.findUnique({
            where: { userId },
            select: { directManagerId: true }
        })
        const routedStatus = profile?.directManagerId ? 'PENDING_MANAGER' : 'PENDING_HR'
        const status = data.leaveType === 'SICK' ? 'PENDING_ATTACHMENT' : routedStatus

        await (db as any).leaveRequest.create({
            data: {
                userId,
                tenantId,
                type: data.leaveType,
                startDate: new Date(data.startDate),
                endDate: new Date(data.endDate),
                reason: data.reason?.trim() || null,
                status,
            }
        })

        revalidatePath('/admin/hr')
        return { success: true }
    } catch (e: any) {
        console.error('[submitLeaveRequest]', e.message)
        return { error: e.message || 'Failed to submit leave request' }
    }
}

// ── Permission / Short Leave (أذن) ────────────────────────────────────────────

export async function submitPermissionRequest(data: {
    date: string
    hours: number
    reason?: string
}) {
    try {
        const { userId, tenantId } = await getSessionUser()

        const profile = await (db as any).employeeProfile.findUnique({
            where: { userId },
            select: { directManagerId: true }
        })
        const status = profile?.directManagerId ? 'PENDING_MANAGER' : 'PENDING_HR'

        await (db as any).permissionRequest.create({
            data: {
                userId,
                tenantId,
                date: new Date(data.date),
                hours: Number(data.hours),
                reason: data.reason?.trim() || null,
                status,
            }
        })

        revalidatePath('/admin/hr')
        return { success: true }
    } catch (e: any) {
        console.error('[submitPermissionRequest]', e.message)
        return { error: e.message || 'Failed to submit permission request' }
    }
}

// ── Advance / Loan Request ────────────────────────────────────────────────────

export async function submitAdvanceRequest(data: {
    amount: number
    installments: number
    reason?: string
}) {
    try {
        const { userId, tenantId } = await getSessionUser()

        const profile = await (db as any).employeeProfile.findUnique({
            where: { userId },
            select: { id: true }
        })
        if (!profile) return { error: 'Employee profile not found. Contact HR.' }

        const monthly = Number(data.amount) / Number(data.installments)

        await (db as any).loanRequest.create({
            data: {
                profileId: profile.id,
                tenantId,
                amount: Number(data.amount),
                installments: Number(data.installments),
                monthlyInstallment: monthly,
                monthlyDeduction: monthly,
                reason: data.reason?.trim() || null,
                status: 'PENDING_HR',
            }
        })

        revalidatePath('/admin/hr')
        return { success: true }
    } catch (e: any) {
        console.error('[submitAdvanceRequest]', e.message)
        return { error: e.message || 'Failed to submit advance request' }
    }
}

// ── Document / Letter Request (المعاملات) ─────────────────────────────────────

export async function submitDocumentRequest(data: {
    documentType: string
    description?: string
}) {
    try {
        const { userId, tenantId } = await getSessionUser()

        const profile = await (db as any).employeeProfile.findUnique({
            where: { userId },
            select: { id: true }
        })
        if (!profile) return { error: 'Employee profile not found. Contact HR.' }

        await (db as any).documentRequest.create({
            data: {
                profileId: profile.id,
                tenantId,
                type: data.documentType,
                details: data.description?.trim() || null,
                status: 'PROCESSING',
            }
        })

        revalidatePath('/admin/hr')
        return { success: true }
    } catch (e: any) {
        console.error('[submitDocumentRequest]', e.message)
        return { error: e.message || 'Failed to submit document request' }
    }
}
