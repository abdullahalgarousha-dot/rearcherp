import { db } from "@/lib/db"

export interface PayrollBreakdown {
    income: {
        basic: number
        housing: number
        transport: number
        other: number
        total: number
    }
    deductions: {
        penalties: number
        loans: number
        gosi: number
        absence: number // Value of absent days
        total: number
    }
    netSalary: number
    meta: {
        currency: string
        absentDays: number
        penaltyCount: number
        loanCount: number
    }
}

/**
 * Calculates the net salary for a given employee and date.
 * Single Source of Truth for Payroll Calculations.
 */
export async function calculateNetSalary(userId: string, date: Date = new Date()): Promise<PayrollBreakdown | null> {
    try {
        // 1. Fetch Employee Data
        const user = await (db as any).user.findUnique({
            where: { id: userId },
            include: {
                profile: {
                    include: {
                        hrStats: true,
                        loans: {
                            where: { status: 'ACTIVE' }
                        },
                        penalties: {
                            where: {
                                date: {
                                    gte: new Date(date.getFullYear(), date.getMonth(), 1),
                                    lt: new Date(date.getFullYear(), date.getMonth() + 1, 1)
                                }
                            }
                        }
                    }
                }
            }
        })

        if (!user || !user.profile) return null

        const profile = user.profile
        const stats = profile.hrStats

        // 2. Calculate Income
        // Determine currency and relevant salary field
        const currency = profile.currency || 'SAR'
        const basic = profile.basicSalary || 0
        const housing = profile.housingAllowance || 0
        const transport = profile.transportAllowance || 0
        const other = profile.otherAllowance || 0

        // Total Income = Basic + Housing + Transport + Other
        const totalIncome = basic + housing + transport + other

        // 3. Calculate Deductions

        // SIMPLIFIED PAYROLL LOGIC (Pre-Beta): 
        // Strict governmental tax/GOSI math and variable absence deductions are stripped out.
        // Calculation restricted to: (Basic + Allowances) - (Loans + Penalties)
        const gosi = 0
        const absenceDeduction = 0

        // B. Penalties: Sum of all penalties issued THIS MONTH
        const penaltiesTotal = profile.penalties.reduce((sum: number, p: any) => sum + p.amount, 0)

        const absentDays = stats?.absentDays || 0
        const loansTotal = profile.loans.reduce((sum: number, l: any) => sum + l.monthlyInstallment, 0)

        const totalDeductions = penaltiesTotal + loansTotal

        // 4. Net Salary
        const netSalary = totalIncome - totalDeductions

        return {
            income: {
                basic,
                housing,
                transport,
                other,
                total: totalIncome
            },
            deductions: {
                penalties: penaltiesTotal,
                loans: loansTotal,
                gosi,
                absence: absenceDeduction,
                total: totalDeductions
            },
            netSalary,
            meta: {
                currency,
                absentDays,
                penaltyCount: profile.penalties.length,
                loanCount: profile.loans.length
            }
        }

    } catch (error) {
        console.error("Payroll Calculation Error:", error)
        return null
    }
}
