'use server'

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { hasPermission } from "@/lib/rbac"

export async function getTaxReports(startDate: Date, endDate: Date) {
    const session = await auth()
    const canReadFinance = await hasPermission('finance', 'viewVATReports')
    const isGlobalAdmin = (session?.user as any)?.role === 'GLOBAL_SUPER_ADMIN'

    if (!session || (!canReadFinance && !isGlobalAdmin)) {
        throw new Error("Unauthorized")
    }

    const tenantId = (session?.user as any)?.tenantId
    const tenantFilter = isGlobalAdmin ? {} : { tenantId }

    const [invoices, expenses] = await Promise.all([
        (db as any).invoice.findMany({
            where: {
                ...tenantFilter,
                date: { gte: startDate, lte: endDate },
                status: { not: "CANCELLED" }
            },
            include: { project: { select: { name: true } } },
            orderBy: { date: 'asc' }
        }),
        (db as any).expense.findMany({
            where: {
                ...tenantFilter,
                date: { gte: startDate, lte: endDate },
                isTaxRecoverable: true
            },
            include: { project: { select: { name: true } } },
            orderBy: { date: 'asc' }
        })
    ])

    const totalRevenue = invoices.reduce((sum: number, inv: any) => sum + inv.baseAmount, 0)
    const totalSalesVat = invoices.reduce((sum: number, inv: any) => sum + inv.vatAmount, 0)
    const grandTotal = invoices.reduce((sum: number, inv: any) => sum + inv.totalAmount, 0)
    const totalPurchaseVat = expenses.reduce((sum: number, exp: any) => sum + (exp.taxAmount || 0), 0)
    const netVatLiability = totalSalesVat - totalPurchaseVat

    return {
        invoices,
        expenses,
        totalRevenue,
        totalSalesVat,
        totalPurchaseVat,
        netVatLiability,
        grandTotal,
        // Legacy field for backwards compatibility
        totalVat: totalSalesVat,
    }
}

export async function getTaxReportByQuarter(year: number, quarter: number) {
    const startMonth = (quarter - 1) * 3
    const startDate = new Date(year, startMonth, 1)
    const endDate = new Date(year, startMonth + 3, 0, 23, 59, 59)
    return getTaxReports(startDate, endDate)
}
