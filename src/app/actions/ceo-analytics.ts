"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"

export interface CEODashboardData {
    kpis: {
        totalExpectedRevenue: number
        totalVatCollected: number
        totalInternalCost: number
        totalExternalExpenses: number
        netProfitMargin: number
    }
    projectsSummary: Array<{
        id: string
        name: string
        code: string
        contractValue: number
        externalExpenses: number
        internalLaborCost: number
        totalSpent: number
        grossMargin: number
        marginPercent: number
    }>
    receivables: Array<{
        projectName: string
        title: string
        amount: number
        dueDate: Date
        status: string
        type: 'INVOICE' | 'MILESTONE'
    }>
    revenueTrends: Array<{
        month: string
        revenue: number
    }>
}

export async function getCEODashboardData(): Promise<CEODashboardData> {
    const session = await auth()
    const userRole = (session?.user as any)?.role
    const tenantId = (session?.user as any)?.tenantId

    if (userRole !== 'SUPER_ADMIN' && userRole !== 'GLOBAL_SUPER_ADMIN') {
        throw new Error("Unauthorized: CEO Dashboard access restricted.")
    }

    try {
        const projects = await db.project.findMany({
            where: tenantId ? { tenantId } : {},
            include: {
                timeLogs: true,
                expenses: true,
                invoices: true,
                milestones: true
            }
        })

        const globalInvoices = await (db as any).invoice.findMany({
            where: tenantId ? { tenantId, status: { in: ['PAID', 'ISSUED'] } } : { status: { in: ['PAID', 'ISSUED'] } }
        })

        // 1. KPI Aggregates
        let totalExpectedRevenue = 0
        let totalInternalCost = 0
        let totalExternalExpenses = 0
        const projectsSummary: CEODashboardData['projectsSummary'] = []
        const receivables: CEODashboardData['receivables'] = []

        for (const p of projects as any[]) {
            totalExpectedRevenue += (p.contractValue || 0)

            const internalLaborCost = p.timeLogs.reduce((sum: number, log: any) => sum + (log.cost || 0), 0)
            const externalExpenses = p.expenses.reduce((sum: number, exp: any) => sum + (exp.totalAmount || 0), 0)
            
            totalInternalCost += internalLaborCost
            totalExternalExpenses += externalExpenses

            const totalSpent = internalLaborCost + externalExpenses
            const grossMargin = p.contractValue - totalSpent
            const marginPercent = p.contractValue > 0 ? (grossMargin / p.contractValue) * 100 : 0

            projectsSummary.push({
                id: p.id,
                name: p.name,
                code: p.code,
                contractValue: p.contractValue,
                internalLaborCost,
                externalExpenses,
                totalSpent,
                grossMargin,
                marginPercent
            })

            // Collect Receivables
            // From Invoices (Unpaid)
            p.invoices.filter((i: any) => i.status !== 'PAID').forEach((i: any) => {
                receivables.push({
                    projectName: p.name,
                    title: `Invoice #${i.invoiceNumber}`,
                    amount: i.totalAmount,
                    dueDate: i.dueDate || i.date,
                    status: i.status,
                    type: 'INVOICE' as const
                })
            })

            // From Milestones (Pending)
            p.milestones.filter((m: any) => m.status === 'PENDING').forEach((m: any) => {
                receivables.push({
                    projectName: p.name,
                    title: m.title,
                    amount: m.amount || 0,
                    dueDate: m.dueDate,
                    status: 'PENDING',
                    type: 'MILESTONE' as const
                })
            })
        }

        const totalVatCollected = globalInvoices.reduce((sum: number, i: any) => sum + (i.vatAmount || 0), 0)
        const netProfitMargin = totalExpectedRevenue > 0 
            ? ((totalExpectedRevenue - totalInternalCost - totalExternalExpenses) / totalExpectedRevenue) * 100 
            : 0

        // 2. Revenue Trends
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
            const sum = globalInvoices
                .filter((i: any) => {
                    const id = new Date(i.date)
                    return id.getMonth() === m.monthIndex && id.getFullYear() === m.year
                })
                .reduce((s: number, i: any) => s + (i.baseAmount || 0), 0)
            return { month: m.label, revenue: sum }
        })

        return {
            kpis: {
                totalExpectedRevenue,
                totalVatCollected,
                totalInternalCost,
                totalExternalExpenses,
                netProfitMargin
            },
            projectsSummary,
            receivables: receivables.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime()),
            revenueTrends: revenueTrendsData,
        }

    } catch (error) {
        console.error("CEO Analytics Fetch Error:", error)
        throw new Error("Failed to compile Project Financial Summary.")
    }
}

