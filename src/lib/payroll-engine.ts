import { db } from "@/lib/db"
import { computeMonthlyCost } from "@/lib/payroll-utils"

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
        absence: number
        total: number
    }
    netSalary: number
    meta: {
        currency: string
        absentDays: number
        workingDaysInMonth: number
        penaltyCount: number
        loanCount: number
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Pure helper — counts actual working days in a calendar month by excluding
// the weekend days defined in CompanyProfile.weekendDays (comma-separated
// day names, e.g. "Friday,Saturday").
// ─────────────────────────────────────────────────────────────────────────────
function getWorkingDaysInMonth(
    year: number,
    month: number,        // 0-indexed (JS Date convention)
    weekendDaysStr: string,
): number {
    const dayNameToIndex: Record<string, number> = {
        sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
        thursday: 4, friday: 5, saturday: 6,
    }
    const weekendIndices = new Set(
        weekendDaysStr
            .split(',')
            .map(d => dayNameToIndex[d.trim().toLowerCase()])
            .filter(n => n !== undefined),
    )

    const daysInMonth = new Date(year, month + 1, 0).getDate()
    let workDays = 0
    for (let d = 1; d <= daysInMonth; d++) {
        if (!weekendIndices.has(new Date(year, month, d).getDay())) workDays++
    }
    return workDays
}

/**
 * Calculates the net salary for a given employee and month.
 * Single Source of Truth for payroll calculations.
 *
 * Absence deduction is now real: it compares Attendance records (status=ABSENT)
 * against the CompanyProfile working-day calendar instead of returning 0.
 */
export async function calculateNetSalary(
    userId: string,
    date: Date = new Date(),
): Promise<PayrollBreakdown | null> {
    try {
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1)
        const monthEnd   = new Date(date.getFullYear(), date.getMonth() + 1, 1)

        // 1. Fetch employee + profile in one query
        const user = await (db as any).user.findUnique({
            where: { id: userId },
            include: {
                profile: {
                    include: {
                        assignedBranch: true,
                        hrStats: true,
                        activeLoans: {
                            where: { status: 'ACTIVE' },
                        },
                        penalties: {
                            where: { date: { gte: monthStart, lt: monthEnd } },
                        },
                    },
                },
            },
        })

        if (!user || !user.profile) return null
        const profile = user.profile
        const tenantId = user.tenantId

        // 2. Income components
        const currency  = profile.assignedBranch?.currencyCode || profile.legacyCurrency || 'SAR'
        const basic     = profile.basicSalary     || 0
        const housing   = profile.housingAllowance  || 0
        const transport = profile.transportAllowance || 0
        const other     = profile.otherAllowance    || 0
        const gosi      = profile.gosiDeduction     || 0
        const totalIncome = basic + housing + transport + other

        // 3. Penalties this month
        const penaltiesTotal = profile.penalties.reduce(
            (s: number, p: any) => s + (p.amount || 0), 0,
        )

        // 4. Active-loan monthly deductions
        const loansTotal = profile.activeLoans.reduce(
            (s: number, l: any) => s + Math.min(l.monthlyDeduction, l.remaining),
            0,
        )

        // 5. Absence deduction — real calculation
        // Fetch CompanyProfile for this tenant's working-day config
        const companyProfile = await (db as any).companyProfile.findFirst({
            where: { tenantId },
            select: { workingDaysPerWeek: true, weekendDays: true },
        })
        const weekendDaysStr = companyProfile?.weekendDays ?? 'Friday,Saturday'

        const workingDaysInMonth = getWorkingDaysInMonth(
            date.getFullYear(),
            date.getMonth(),
            weekendDaysStr,
        )

        // Count days where the employee had an explicit ABSENT record this month
        const absentCount = await (db as any).attendance.count({
            where: {
                userId,
                tenantId,
                status: 'ABSENT',
                date: { gte: monthStart, lt: monthEnd },
            },
        })

        const dailyRate = workingDaysInMonth > 0
            ? Math.round((totalIncome / workingDaysInMonth) * 100) / 100
            : 0
        const absenceDeduction = Math.round(absentCount * dailyRate * 100) / 100

        // 6. Totals
        const totalDeductions = Math.round(
            (gosi + penaltiesTotal + loansTotal + absenceDeduction) * 100,
        ) / 100

        const monthlyCostBaseline = computeMonthlyCost({
            basicSalary: basic,
            housingAllowance: housing,
            transportAllowance: transport,
            otherAllowance: other,
            gosiDeduction: gosi,
        })
        const netSalary = Math.round(
            (monthlyCostBaseline - penaltiesTotal - loansTotal - absenceDeduction) * 100,
        ) / 100

        return {
            income:     { basic, housing, transport, other, total: totalIncome },
            deductions: {
                penalties: penaltiesTotal,
                loans:     loansTotal,
                gosi,
                absence:   absenceDeduction,
                total:     totalDeductions,
            },
            netSalary,
            meta: {
                currency,
                absentDays: absentCount,
                workingDaysInMonth,
                penaltyCount: profile.penalties.length,
                loanCount:    profile.activeLoans.length,
            },
        }
    } catch (error) {
        console.error("Payroll Calculation Error:", error)
        return null
    }
}
