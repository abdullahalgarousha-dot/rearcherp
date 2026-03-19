import { User, EmployeeProfile } from "@prisma/client"
import { addDays, differenceInDays, isBefore } from "date-fns"

export const SAR_TO_EGP_RATE = 12.5 // Fallback if system setting missing
export const EGP_TO_SAR_RATE = 0.08
export type UserWithProfile = User & { profile?: EmployeeProfile | null }

export type ExpiryStatus = "VALID" | "WARNING" | "EXPIRED"

export interface ExpiryAlert {
    document: string
    date: Date
    daysRemaining: number
    status: ExpiryStatus
}

export function getUserExpiryAlerts(user: UserWithProfile): ExpiryAlert[] {
    const alerts: ExpiryAlert[] = []
    const today = new Date()

    const check = (docName: string, date: Date | null) => {
        if (!date) return
        const days = differenceInDays(new Date(date), today)
        let status: ExpiryStatus = "VALID"

        if (days < 0) status = "EXPIRED"
        else if (days < 30) status = "EXPIRED" // User asked for red < 30
        else if (days < 60) status = "WARNING"

        if (status !== "VALID") {
            alerts.push({
                document: docName,
                date: new Date(date),
                daysRemaining: days,
                status
            })
        }
    }

    check("Passport", user.profile?.passportExpiry || null)
    check("Iqama/ID", user.profile?.idExpiry || null)
    check("Medical Insurance", user.profile?.insuranceExpiry || null)

    return alerts.sort((a, b) => a.daysRemaining - b.daysRemaining)
}

export function getSalaryInSAR(user: UserWithProfile, rate: number = EGP_TO_SAR_RATE): number {
    if (user.profile?.branchId === 'Jeddah') return user.profile.totalSalary || 0
    if (user.profile?.branchId === 'Cairo') return (user.profile.totalSalary || 0) * rate
    return 0
}

export const BRANCHES = [
    { id: "Jeddah", label: "Jeddah Branch (SAR)", currency: "SAR" },
    { id: "Cairo", label: "Cairo Branch (EGP)", currency: "EGP" },
]

export function getTotalPayroll(users: UserWithProfile[], exchangeRate: number = EGP_TO_SAR_RATE) {
    let totalSAR = 0
    let totalEGP = 0

    users.forEach(user => {
        if (user.profile?.branchId === 'Jeddah' && user.profile?.totalSalary) {
            totalSAR += user.profile.totalSalary
        }
        if (user.profile?.branchId === 'Cairo' && user.profile?.totalSalary) {
            totalEGP += user.profile.totalSalary
        }
    })

    const egpInSar = totalEGP * exchangeRate
    const grandTotal = totalSAR + egpInSar

    return {
        totalSAR,
        totalEGP,
        egpInSar,
        grandTotal
    }
}
