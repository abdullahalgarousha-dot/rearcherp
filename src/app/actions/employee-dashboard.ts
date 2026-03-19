"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"

export async function getEmployeeDashboardData() {
    const session = await auth()
    const userId = (session?.user as any)?.id

    if (!userId) return { error: "Unauthorized" }

    try {
        const user = await db.user.findUnique({
            where: { id: userId },
            include: {
                profile: {
                    include: {
                        hrStats: true,
                        penalties: { orderBy: { date: 'desc' } },
                        activeLoans: {
                            where: { status: 'ACTIVE' },
                            orderBy: { createdAt: 'desc' },
                            take: 1
                        },
                        directManager: { select: { user: { select: { name: true } } } }
                    }
                },
                userRole: true
            }
        })

        if (!user) return { error: "User not found" }

        // If Admin and no profile, create one on the fly
        if (user.role === 'ADMIN' && !user.profile) {
            await db.employeeProfile.create({
                data: {
                    userId: user.id,
                    department: 'Administration',
                    position: 'System Administrator',
                    employeeCode: 'ADMIN-001',
                    hireDate: new Date(),
                    leaveBalance: 30,
                    legacyCurrency: 'SAR',
                    legacyBranch: 'Jeddah',
                }
            })
            // Re-fetch with fresh profile
            return getEmployeeDashboardData()
        }

        if (!user.profile) {
            return { error: "Profile not found" }
        }

        // Define Current Month & Year
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

        // 1. Calculate Actual Working Hours for Current Month
        const currentMonthLogs = await db.timeLog.findMany({
            where: {
                userId: user.id,
                date: { gte: startOfMonth, lte: endOfMonth }
            }
        })
        const actualWorkHoursMonth = currentMonthLogs.reduce((acc: number, log: any) => acc + (log.hoursLogged || 0), 0)

        // 2. Fetch Approved Leave Requests (Annual, Sick, Emergency)
        const approvedLeaves = await db.leaveRequest.findMany({
            where: {
                userId: user.id,
                status: 'APPROVED',
                // For simplicity, tracking all-time approved leaves for balance deduction if needed
                // But typically leave requests have a duration.
            }
        })

        let sickLeaveUsed = 0
        let emergencyLeaveUsed = 0

        approvedLeaves.forEach((leave: any) => {
            const days = Math.ceil((leave.endDate.getTime() - leave.startDate.getTime()) / (1000 * 3600 * 24)) + 1
            if (leave.type === 'SICK') sickLeaveUsed += days
            if (leave.type === 'EMERGENCY') emergencyLeaveUsed += days
        })

        // 3. Absences & Penalties
        const absentDaysCount = await db.leaveRequest.count({
            where: {
                userId: user.id,
                status: 'APPROVED',
                type: 'UNPAID', // Assuming unpaid leaves are counted as absent or similar
                startDate: { gte: startOfMonth, lte: endOfMonth }
            }
        })

        const profile = user.profile

        const penaltiesCount = await db.penalty.count({
            where: {
                profileId: profile.id,
                date: { gte: startOfMonth, lte: endOfMonth }
            }
        })
        const targetHours = 180 // Standard
        const annualLeaveTotal = profile.leaveBalance || 0 // Fetch from real DB profile
        const sickLeaveTotal = 12
        const emergencyLeaveTotal = 5

        const calcPercent = (used: number, total: number) => {
            if (total === 0) return 0
            return Math.min(100, Math.round((used / total) * 100))
        }

        const dashboardData = {
            user: {
                name: user.name,
                image: user.image,
                position: user.userRole?.name || profile.position,
                department: profile.department
            },
            profile: {
                employeeCode: profile.employeeCode,
                dob: null, // Add Dob to DB later if needed
                nationality: profile.nationality,
                idNumber: profile.idNumber,
                idExpiry: profile.idExpiry?.toLocaleDateString() || null,
                passportNum: profile.passportNum,
                insuranceProvider: profile.insuranceProvider,
                insurancePolicy: profile.insurancePolicy,
                insuranceExpiry: profile.insuranceExpiry?.toLocaleDateString() || null,
                hireDate: profile.hireDate?.toLocaleDateString() || null,
            },
            jobInfo: {
                department: profile.department,
                directManagerName: profile.directManager?.user?.name || null,
                roleName: user.userRole?.name || profile.position,
            },
            financial: {
                basicSalary: profile.basicSalary,
                housingAllowance: profile.housingAllowance,
                transportAllowance: profile.transportAllowance,
                otherAllowance: profile.otherAllowance,
                gosiDeduction: profile.gosiDeduction,
                totalSalary: profile.totalSalary,
                iban: profile.iban,
                bankName: profile.bankName
            },
            mainPerformance: {
                label: "ساعات العمل في الشهر",
                value: actualWorkHoursMonth,
                total: targetHours,
                percent: calcPercent(actualWorkHoursMonth, targetHours)
            },
            statsGrid: [
                {
                    label: "أيام العمل عن بعد",
                    value: 0, // Mock for now until Remote feature is built
                    total: 12,
                    percent: 0,
                    icon: "Globe",
                    iconColor: "blue-500",
                    color: "default"
                },
                {
                    label: "الغياب (هذا الشهر)",
                    value: absentDaysCount,
                    total: 10, // Threshold for warning
                    percent: calcPercent(absentDaysCount, 10),
                    icon: "UserX",
                    iconColor: "red-500",
                    color: "danger"
                },
                {
                    label: "الرصيد المتبقي (سنوي)",
                    value: annualLeaveTotal, // Balance is literally the remaining amount.
                    total: 30, // Reference max
                    percent: calcPercent(30 - Math.min(annualLeaveTotal, 30), 30),
                    icon: "Palmtree",
                    iconColor: "indigo-500",
                    color: "default"
                },
                {
                    label: "الرصيد المتبقي (مرضي)",
                    value: sickLeaveTotal - sickLeaveUsed,
                    total: sickLeaveTotal,
                    percent: calcPercent(sickLeaveUsed, sickLeaveTotal),
                    icon: "Stethoscope",
                    iconColor: "emerald-500",
                    color: "success"
                },
                {
                    label: "إجازات طارئة",
                    value: emergencyLeaveUsed,
                    total: 5,
                    percent: calcPercent(emergencyLeaveUsed, 5),
                    icon: "AlertTriangle",
                    iconColor: "amber-500",
                    color: "warning"
                },
                {
                    label: "أذونات الخروج",
                    value: 0,
                    total: 10,
                    percent: 0,
                    icon: "LogOut",
                    iconColor: "slate-500",
                    color: "default"
                },
                {
                    label: "دقائق التأخير",
                    value: 0,
                    total: 60,
                    percent: 0,
                    icon: "Clock",
                    iconColor: "orange-500",
                    color: "warning"
                },
                {
                    label: "ساعات العمل الإضافي",
                    value: 0,
                    total: 40,
                    percent: 0,
                    icon: "Zap",
                    iconColor: "yellow-500",
                    color: "success"
                },
                {
                    label: "عدد الجزاءات",
                    value: penaltiesCount,
                    total: 3,
                    percent: calcPercent(penaltiesCount, 3),
                    icon: "ShieldAlert",
                    iconColor: "red-600",
                    color: "danger"
                }
            ],
            loan: profile.activeLoans[0] ? {
                paid: profile.activeLoans[0].paidAmount,
                total: profile.activeLoans[0].totalAmount,
                percent: calcPercent(profile.activeLoans[0].paidAmount, profile.activeLoans[0].totalAmount)
            } : null,
            recentPenalties: profile.penalties.slice(0, 5)
        }

        return { success: true, data: dashboardData }
    } catch (e) {
        console.error(e)
        return { error: "Failed to fetch dashboard data" }
    }
}
