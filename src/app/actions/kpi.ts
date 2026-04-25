'use server'

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { checkPermission } from "@/lib/rbac"
import { startOfMonth, endOfMonth, differenceInCalendarDays } from "date-fns"

// ── Scoring weights ─────────────────────────────────────────────────────────
const KPI_WEIGHTS = {
    TASK_MAX:        50,   // pts — task completion & long-task bonuses
    TIMESHEET_MAX:   30,   // pts — logged hours compliance
    DISCIPLINE_MAX:  20,   // pts — penalty cap
    LONG_TASK_DAYS:  7,    // tasks spanning more than this are "long tasks"
    WORKING_DAYS:    22,   // standard working days per month (176 h)
    WARNING_PTS:     5,    // deducted per DisciplinaryAction WARNING
    DEDUCTION_PTS:   10,   // deducted per DisciplinaryAction DEDUCTION
    EARLY_BONUS:     2,    // bonus per long-task completed before deadline
    OVERDUE_PEN:     3,    // penalty per overdue task (not completed past end date)
    OVERDUE_CAP:     10,   // max overdue penalty
    RISK_THRESHOLD:  50,   // totalScore below this triggers a risk flag
}

// ── Core: calculate & persist one employee's monthly KPI ──────────────────────
export async function calculateMonthlyKPI(
    targetUserId: string,
    month: number,   // 1–12
    year: number,
    feedback?: string,
) {
    const session = await auth()
    const currentUser = session?.user as any
    if (!currentUser) return { error: "Unauthorized" }

    const canEvaluate = await checkPermission('HR', 'write')
    const isSelf      = currentUser.id === targetUserId
    if (!canEvaluate && !isSelf) return { error: "Insufficient permissions" }

    const tenantId      = currentUser.tenantId as string | undefined
    const isGlobalAdmin = currentUser.role === 'GLOBAL_SUPER_ADMIN'
    if (!tenantId && !isGlobalAdmin) return { error: "No tenant context" }

    const tenantFilter = isGlobalAdmin ? {} : { tenantId }
    const monthStart   = startOfMonth(new Date(year, month - 1))
    const monthEnd     = endOfMonth(new Date(year, month - 1))

    try {
        // ── 1. EmployeeTasks due or completed in this month ───────────────────
        const tasks = await (db as any).employeeTask.findMany({
            where: {
                assigneeId: targetUserId,
                ...tenantFilter,
                OR: [
                    { plannedEndDate: { gte: monthStart, lte: monthEnd } },
                    { actualCompletionDate: { gte: monthStart, lte: monthEnd } },
                ],
            },
        })

        const totalTasks     = tasks.length
        const completedTasks = tasks.filter((t: any) => t.status === 'COMPLETED')
        const overdueTasks   = tasks.filter(
            (t: any) =>
                t.status !== 'COMPLETED' &&
                t.status !== 'CANCELLED' &&
                t.plannedEndDate &&
                new Date(t.plannedEndDate) < new Date(),
        )

        // Base: completion ratio × 40 pts
        let rawTaskScore = totalTasks > 0 ? (completedTasks.length / totalTasks) * 40 : 0

        // Early-completion bonus on long tasks
        for (const task of completedTasks) {
            if (!task.plannedStartDate || !task.plannedEndDate) continue
            const span = differenceInCalendarDays(
                new Date(task.plannedEndDate),
                new Date(task.plannedStartDate),
            )
            if (span < KPI_WEIGHTS.LONG_TASK_DAYS) continue
            if (task.actualCompletionDate && new Date(task.actualCompletionDate) < new Date(task.plannedEndDate)) {
                rawTaskScore = Math.min(rawTaskScore + KPI_WEIGHTS.EARLY_BONUS, KPI_WEIGHTS.TASK_MAX)
            }
        }

        // Overdue penalty (capped)
        rawTaskScore = Math.max(
            0,
            rawTaskScore - Math.min(overdueTasks.length * KPI_WEIGHTS.OVERDUE_PEN, KPI_WEIGHTS.OVERDUE_CAP),
        )
        const taskScore = Math.round(rawTaskScore * 10) / 10

        // ── 2. Timesheet compliance ───────────────────────────────────────────
        const timeLogs = await (db as any).timeLog.findMany({
            where: { userId: targetUserId, date: { gte: monthStart, lte: monthEnd } },
        })
        const loggedHours    = timeLogs.reduce((s: number, l: any) => s + (l.hoursLogged || 0), 0)
        const requiredHours  = KPI_WEIGHTS.WORKING_DAYS * 8   // 176 h
        const complianceRatio = Math.min(loggedHours / requiredHours, 1.0)
        const timesheetScore  = Math.round(complianceRatio * KPI_WEIGHTS.TIMESHEET_MAX * 10) / 10

        // ── 3. Disciplinary penalty ───────────────────────────────────────────
        const disciplineRecords = await (db as any).disciplinaryAction.findMany({
            where: { userId: targetUserId, ...tenantFilter, date: { gte: monthStart, lte: monthEnd } },
        })
        let rawPenalty = 0
        for (const rec of disciplineRecords) {
            rawPenalty += rec.type === 'WARNING' ? KPI_WEIGHTS.WARNING_PTS : KPI_WEIGHTS.DEDUCTION_PTS
        }
        const disciplinePenalty = Math.min(rawPenalty, KPI_WEIGHTS.DISCIPLINE_MAX)

        // ── 4. Composite score ────────────────────────────────────────────────
        const totalScore = Math.round(
            Math.max(0, Math.min(100, taskScore + timesheetScore - disciplinePenalty)) * 10,
        ) / 10

        // ── 5. Breakdown JSON (for UI tooltip) ───────────────────────────────
        const breakdown = JSON.stringify({
            tasks: {
                total:     totalTasks,
                completed: completedTasks.length,
                overdue:   overdueTasks.length,
                score:     taskScore,
                maxPts:    KPI_WEIGHTS.TASK_MAX,
                note:      'Base 40pts × completion rate + early-completion bonuses − overdue penalties',
            },
            timesheet: {
                logged:   Math.round(loggedHours * 10) / 10,
                required: requiredHours,
                score:    timesheetScore,
                maxPts:   KPI_WEIGHTS.TIMESHEET_MAX,
                note:     '(Logged hours ÷ 176 required hours) × 30',
            },
            discipline: {
                count:      disciplineRecords.length,
                penalty:    disciplinePenalty,
                maxPenalty: KPI_WEIGHTS.DISCIPLINE_MAX,
                note:       'WARNING = −5pts, DEDUCTION = −10pts, capped at −20',
            },
        })

        // ── 6. Upsert ─────────────────────────────────────────────────────────
        const record = await (db as any).kpiEvaluation.upsert({
            where: { userId_month_year: { userId: targetUserId, month, year } },
            update: {
                totalScore, taskScore, timesheetScore, disciplinePenalty,
                feedback:    feedback ?? null,
                breakdown,
                evaluatorId: !isSelf ? currentUser.id : undefined,
            },
            create: {
                userId:      targetUserId,
                month,
                year,
                totalScore,
                taskScore,
                timesheetScore,
                disciplinePenalty,
                feedback:    feedback ?? null,
                breakdown,
                tenantId:    tenantId ?? 't_undefined',
                evaluatorId: !isSelf ? currentUser.id : undefined,
            },
        })

        return { success: true, evaluation: record, breakdown: JSON.parse(breakdown) }
    } catch (e: any) {
        console.error('[calculateMonthlyKPI]', e)
        return { error: e.message }
    }
}

// ── Get full KPI history for one employee (most recent first) ─────────────────
export async function getKPIHistory(targetUserId: string, limitMonths = 12) {
    const session = await auth()
    const currentUser = session?.user as any
    if (!currentUser) return []

    const isSelf    = currentUser.id === targetUserId
    const canView   = await checkPermission('HR', 'read')
    if (!isSelf && !canView) return []

    try {
        return await (db as any).kpiEvaluation.findMany({
            where: { userId: targetUserId },
            orderBy: [{ year: 'desc' }, { month: 'desc' }],
            take: limitMonths,
            include: { evaluator: { select: { name: true } } },
        })
    } catch {
        return []
    }
}

// ── Top N employees by KPI score for a given month/year ───────────────────────
export async function getTopKPILeaderboard(
    month: number,
    year: number,
    tenantId: string | undefined,
    limit = 5,
) {
    try {
        const where: any = { month, year }
        if (tenantId) where.tenantId = tenantId

        return await (db as any).kpiEvaluation.findMany({
            where,
            orderBy: { totalScore: 'desc' },
            take: limit,
            include: {
                user: {
                    include: {
                        profile: { select: { position: true, department: true, photo: true } },
                    },
                },
            },
        })
    } catch {
        return []
    }
}

// ── Low-score / at-risk employees for the current month ───────────────────────
export async function getRiskEmployees(
    month: number,
    year: number,
    tenantId: string | undefined,
) {
    try {
        const where: any = { month, year, totalScore: { lt: KPI_WEIGHTS.RISK_THRESHOLD } }
        if (tenantId) where.tenantId = tenantId

        return await (db as any).kpiEvaluation.findMany({
            where,
            orderBy: { totalScore: 'asc' },
            take: 10,
            include: { user: { select: { id: true, name: true } } },
        })
    } catch {
        return []
    }
}
