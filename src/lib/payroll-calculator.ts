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
                                status: 'APPLIED',
                                createdAt: {
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
        const totalIncome = basic + housing + transport + other

        // 3. Calculate Deductions

        // GOSI (Social Insurance) - Typically 9.75% of Basic + Housing for Saudis, but let's use the DB field or default
        // For simplicity, we use the manual field if set, or 0
        const gosi = profile.gosiDeduction || 0

        // Penalties: Sum of all penalties issued THIS MONTH
        const penaltiesTotal = profile.penalties.reduce((sum: number, p: any) => sum + p.amount, 0)

        // Loans: Sum of monthly installments for active loans
        const loansTotal = profile.loans.reduce((sum: number, l: any) => sum + l.monthlyInstallment, 0)

        // Absence: (Total Package / 30) * Absent Days
        // Logic: Absence usually deducts from the total package, not just basic.
        const absentDays = stats?.absentDays || 0
        const absenceDeduction = (totalIncome / 30) * absentDays

        const totalDeductions = gosi + penaltiesTotal + loansTotal + absenceDeduction

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
