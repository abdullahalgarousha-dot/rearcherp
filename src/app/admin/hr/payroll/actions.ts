'use server'

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { hasPermission } from "@/lib/rbac"
import { calculateNetSalary } from "@/lib/payroll-engine"

/**
 * Generates SalarySlips for all employees in the given month.
 *
 * For each employee the entire operation runs inside a single $transaction:
 *   1. Upsert the SalarySlip
 *   2. For every ACTIVE loan: record a LoanPayment (idempotent via @@unique([loanId, month]))
 *   3. Update Loan.paidAmount / Loan.remaining; mark SETTLED when remaining ≤ 0
 *
 * This guarantees atomicity — a SalarySlip is never committed without the
 * corresponding loan-payment ledger entries, and vice-versa.
 */
export async function generateMonthlyPayroll(date: Date = new Date()) {
    const session = await auth()
    const canManage = await hasPermission('finance', 'canApproveFinance')
    if (!canManage) return { error: "Unauthorized: Requires Finance management permissions" }

    const tenantId = (session?.user as any)?.tenantId
    if (!tenantId) return { error: "Tenant context missing" }

    try {
        const monthStart    = new Date(date.getFullYear(), date.getMonth(), 1)
        const nextMonthStart = new Date(date.getFullYear(), date.getMonth() + 1, 1)

        // Fetch all employees with profiles + active loans in one query
        const employees = await (db as any).user.findMany({
            where: { tenantId, profile: { isNot: null } },
            include: {
                profile: {
                    include: {
                        activeLoans: { where: { status: 'ACTIVE' } },
                    },
                },
            },
        })

        let generatedCount = 0
        let skippedCount   = 0
        const errors: string[] = []

        for (const emp of employees) {
            if (!emp.profile) continue

            // Calculate salary (includes real absence deduction via Attendance records)
            const calc = await calculateNetSalary(emp.id, date)
            if (!calc) {
                console.warn(`[Payroll] Could not calculate salary for ${emp.name}`)
                skippedCount++
                continue
            }

            try {
                await (db as any).$transaction(async (tx: any) => {
                    // ── 1. Upsert SalarySlip ──────────────────────────────────────────
                    const slip = await tx.salarySlip.upsert({
                        where: {
                            profileId_month: {
                                profileId: emp.profile.id,
                                month: monthStart,
                            },
                        },
                        create: {
                            tenantId,
                            profileId:          emp.profile.id,
                            month:              monthStart,
                            basicSalary:        calc.income.basic,
                            housingAllowance:   calc.income.housing,
                            transportAllowance: calc.income.transport,
                            otherAllowance:     calc.income.other,
                            totalIncome:        calc.income.total,
                            gosiDeduction:      calc.deductions.gosi,
                            penaltiesAmount:    calc.deductions.penalties,
                            loansAmount:        calc.deductions.loans,
                            absenceAmount:      calc.deductions.absence,
                            totalDeductions:    calc.deductions.total,
                            netSalary:          calc.netSalary,
                            status: 'GENERATED',
                        },
                        update: {
                            basicSalary:        calc.income.basic,
                            housingAllowance:   calc.income.housing,
                            transportAllowance: calc.income.transport,
                            otherAllowance:     calc.income.other,
                            totalIncome:        calc.income.total,
                            gosiDeduction:      calc.deductions.gosi,
                            penaltiesAmount:    calc.deductions.penalties,
                            loansAmount:        calc.deductions.loans,
                            absenceAmount:      calc.deductions.absence,
                            totalDeductions:    calc.deductions.total,
                            netSalary:          calc.netSalary,
                        },
                    })

                    // ── 2 & 3. Process each active loan atomically ────────────────────
                    for (const loan of emp.profile.activeLoans) {
                        if (loan.remaining <= 0) continue   // already fully paid

                        // Actual deduction cannot exceed what is remaining
                        const deductedAmount = Math.round(
                            Math.min(loan.monthlyDeduction, loan.remaining) * 100,
                        ) / 100

                        // Idempotent: if a payment for this month already exists, skip
                        const existing = await tx.loanPayment.findUnique({
                            where: { loanId_month: { loanId: loan.id, month: monthStart } },
                        })
                        if (existing) continue

                        // Create the payment ledger entry
                        await tx.loanPayment.create({
                            data: {
                                tenantId,
                                loanId:    loan.id,
                                profileId: emp.profile.id,
                                month:     monthStart,
                                amount:    deductedAmount,
                                slipId:    slip.id,
                            },
                        })

                        // Update loan running balance
                        const newPaid      = Math.round((loan.paidAmount + deductedAmount) * 100) / 100
                        const newRemaining = Math.round(
                            Math.max(loan.totalAmount - newPaid, 0) * 100,
                        ) / 100

                        await (tx as any).loan.update({
                            where: { id: loan.id },
                            data: {
                                paidAmount: newPaid,
                                remaining:  newRemaining,
                                status:     newRemaining <= 0 ? 'SETTLED' : 'ACTIVE',
                            },
                        })

                        // ── PIPE 2: Financial Bridge — Loan Repayment entry ───────────
                        // Records the monthly installment collected against this loan so
                        // Finance can reconcile advance disbursement vs. recovery.
                        await (tx as any).financialLedger.create({
                            data: {
                                tenantId,
                                type: 'INCOME',
                                category: 'Loan Repayment',
                                description: `Loan installment recovered from ${emp.name || 'Employee'} (${monthStart.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })})`,
                                amount: deductedAmount,
                                referenceType: 'LOAN_PAYMENT',
                                referenceId: loan.id,
                                date: monthStart,
                            }
                        })
                    }

                    // ── PIPE 2: Financial Bridge — Salary Expense entry ───────────────
                    // One EXPENSE entry per employee per month, linked to the SalarySlip.
                    // Uses referenceId = slip.id as natural idempotency key: on re-runs
                    // the slip.id is stable (upserted above) so we delete stale and re-create.
                    await (tx as any).financialLedger.deleteMany({
                        where: { referenceType: 'SALARY_SLIP', referenceId: slip.id }
                    })
                    await (tx as any).financialLedger.create({
                        data: {
                            tenantId,
                            type: 'EXPENSE',
                            category: 'Salary',
                            description: `Net salary for ${emp.name || 'Employee'} — ${monthStart.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`,
                            amount: calc.netSalary,
                            referenceType: 'SALARY_SLIP',
                            referenceId: slip.id,
                            date: monthStart,
                        },
                    })
                })

                generatedCount++
            } catch (txErr: any) {
                console.error(`[Payroll] Transaction failed for ${emp.name}:`, txErr)
                errors.push(`${emp.name}: ${txErr.message}`)
                skippedCount++
            }
        }

        revalidatePath('/admin/hr/payroll')
        revalidatePath('/admin/finance')

        return {
            success: true,
            generated: generatedCount,
            skipped:   skippedCount,
            ...(errors.length ? { errors } : {}),
        }
    } catch (e: any) {
        console.error("generateMonthlyPayroll error:", e)
        return { error: e.message || "Failed to generate payroll" }
    }
}

/**
 * Returns all SalarySlips for the tenant for a given month.
 */
export async function getPayrollForMonth(date: Date = new Date()) {
    const session = await auth()
    const canView = await hasPermission('finance', 'canApproveFinance')
        || await hasPermission('hr', 'approveLeaves')
    if (!canView) return { error: "Unauthorized" }

    const tenantId = (session?.user as any)?.tenantId
    if (!tenantId) return { error: "Tenant context missing" }

    try {
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1)

        const slips = await (db as any).salarySlip.findMany({
            where: { tenantId, month: monthStart },
            include: {
                profile: {
                    include: {
                        user: { select: { id: true, name: true, email: true } },
                    },
                },
            },
            orderBy: { createdAt: 'asc' },
        })

        return { slips }
    } catch (e: any) {
        console.error("getPayrollForMonth error:", e)
        return { error: "Failed to fetch payroll" }
    }
}

/**
 * Returns all LoanPayments for a specific loan — full repayment history.
 */
export async function getLoanPaymentHistory(loanId: string) {
    const session = await auth()
    const tenantId = (session?.user as any)?.tenantId
    if (!tenantId) return { error: "Tenant context missing" }

    try {
        const payments = await (db as any).loanPayment.findMany({
            where: { loanId, tenantId },
            orderBy: { month: 'asc' },
        })
        return { payments }
    } catch (e: any) {
        console.error("getLoanPaymentHistory error:", e)
        return { error: "Failed to fetch loan history" }
    }
}
