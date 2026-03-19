"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"

export interface CEODashboardData {
    kpis: {
        totalExpectedRevenue: number
        totalVatCollected: number
        totalInternalCost: number
        netProfitMargin: number
    }
    projectMargins: Array<{
        name: string
        revenue: number
        cost: number
        isProfitable: boolean
    }>
    revenueTrends: Array<{
        month: string
        revenue: number
    }>
    topEngineers: Array<{
        name: string
        hours: number
    }>
}

export async function getCEODashboardData(): Promise<CEODashboardData> {
    const session = await auth()
    const userRole = (session?.user as any)?.role

    if (userRole !== 'SUPER_ADMIN') {
        throw new Error("Unauthorized: CEO Dashboard access is restricted to SUPER_ADMIN only.")
    }

    try {
        // --- KPI: Expected Revenue & VAT ---
        // Expected Revenue = Sum of all Project Contract Values
        // VAT Collected = Sum of actual VAT amounts from all existing Invoices
        const projects = await db.project.findMany({
            select: {
                name: true,
                contractValue: true,
                createdAt: true,
                timeLogs: {
                    select: {
                        hoursLogged: true,
                        cost: true,
                        user: {
                            select: { name: true }
                        }
                    }
                }
            } as any // Bypass strict outdated typings
        })

        const invoices = await (db as any).invoice.findMany({
            where: { status: { in: ['PAID', 'ISSUED'] } },
            select: { vatAmount: true, date: true, baseAmount: true }
        })

        const totalExpectedRevenue = projects.reduce((sum: number, p: any) => sum + p.contractValue, 0)
        const totalVatCollected = invoices.reduce((sum: number, i: any) => sum + (i.vatAmount || 0), 0)

        // --- KPI: Internal Cost (TimeLogs * Hourly Rate) ---
        let totalInternalCost = 0
        const projectMarginsData = []

        for (const p of projects as any[]) {
            let projectCost = 0
            for (const log of p.timeLogs || []) {
                // Use cost directly from the log (calculated in submitTimeLog)
                projectCost += (log.cost || 0)
            }
            totalInternalCost += projectCost

            // Chart 1: Project Margins
            projectMarginsData.push({
                name: p.name.length > 20 ? p.name.substring(0, 20) + "..." : p.name,
                revenue: p.contractValue,
                cost: projectCost,
                isProfitable: p.contractValue >= projectCost
            })
        }

        // --- KPI: Profit Margin ---
        let netProfitMargin = 0
        if (totalExpectedRevenue > 0) {
            netProfitMargin = ((totalExpectedRevenue - totalInternalCost) / totalExpectedRevenue) * 100
        }

        // --- Chart 2: Revenue Trends (Last 6 Months based on PAID Invoices) ---
        const last6Months = Array.from({ length: 6 }, (_, i) => {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            return {
                monthIndex: d.getMonth(),
                year: d.getFullYear(),
                label: d.toLocaleString('en-US', { month: 'short' })
            };
        }).reverse();

        const revenueTrendsData = last6Months.map(m => {
            const sum = invoices
                .filter((i: any) => {
                    const id = new Date(i.date)
                    return id.getMonth() === m.monthIndex && id.getFullYear() === m.year
                })
                .reduce((s: number, i: any) => s + (i.baseAmount || 0), 0)
            return { month: m.label, revenue: sum }
        })

        // --- Chart 3: Top Engineers (By Volume of Billable Hours) ---
        // Aggregate timelogs globally per user
        const timeLogs = await db.timeLog.findMany({
            include: { user: { select: { name: true } } }
        })

        const engineerHoursMap: Record<string, number> = {}
        for (const log of timeLogs as any[]) {
            const name = log.user?.name || "Unknown Engineer"
            if (!engineerHoursMap[name]) engineerHoursMap[name] = 0
            engineerHoursMap[name] += (log.hoursLogged || 0)
        }

        const topEngineersData = Object.entries(engineerHoursMap)
            .map(([name, hours]) => ({ name, hours }))
            .sort((a, b) => b.hours - a.hours)
            .slice(0, 5) // Top 5

        return {
            kpis: {
                totalExpectedRevenue,
                totalVatCollected,
                totalInternalCost,
                netProfitMargin
            },
            projectMargins: projectMarginsData,
            revenueTrends: revenueTrendsData,
            topEngineers: topEngineersData
        }

    } catch (error) {
        console.error("CEO Analytics Fetch Error:", error)
        throw new Error("Failed to compile CEO Analytics.")
    }
}
