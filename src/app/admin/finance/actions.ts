'use server'

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { calculateNetSalary } from "@/lib/payroll-engine"
import { checkPermission, hasPermission } from "@/lib/rbac"
import { getSystemSettings } from "@/app/actions/settings"

export async function generateMonthlyPayroll(date: Date = new Date()) {
    const session = await auth()
    const canManage = await hasPermission('finance', 'canApproveFinance')
    if (!canManage) {
        return { error: "Unauthorized: Requires Finance management permissions" }
    }
    const tenantId = (session?.user as any).tenantId

    try {
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1)
        const nextMonthStart = new Date(date.getFullYear(), date.getMonth() + 1, 1)

        // 1. Fetch all active employees with profiles
        const employees = await (db as any).user.findMany({
            where: {
                tenantId,
                // Ensure they are active employees? Schema doesn't have status on User, maybe check profile exists
                profile: { isNot: null }
            },
            include: { profile: true }
        })

        let generatedCount = 0
        let skippedCount = 0

        for (const emp of employees) {
            if (!emp.profile) continue

            // 2. Calculate Salary for this specific month
            const calculation = await calculateNetSalary(emp.id, date)

            if (!calculation) {
                console.warn(`Could not calculate salary for ${emp.name}`)
                skippedCount++
                continue
            }

            // 3. Create or Update SalarySlip
            await (db as any).salarySlip.upsert({
                where: {
                    profileId_month: {
                        profileId: emp.profile.id,
                        month: monthStart
                    }
                },
                create: {
                    tenantId,
                    profileId: emp.profile.id,
                    month: monthStart,
                    basicSalary: calculation.income.basic,
                    housingAllowance: calculation.income.housing,
                    transportAllowance: calculation.income.transport,
                    otherAllowance: calculation.income.other,
                    totalIncome: calculation.income.total,
                    gosiDeduction: calculation.deductions.gosi,
                    penaltiesAmount: calculation.deductions.penalties,
                    loansAmount: calculation.deductions.loans,
                    absenceAmount: calculation.deductions.absence,
                    totalDeductions: calculation.deductions.total,
                    netSalary: calculation.netSalary,
                    status: 'GENERATED'
                },
                update: {
                    // Update valid fields if responding to changes before payment
                    basicSalary: calculation.income.basic,
                    housingAllowance: calculation.income.housing,
                    transportAllowance: calculation.income.transport,
                    otherAllowance: calculation.income.other,
                    totalIncome: calculation.income.total,
                    gosiDeduction: calculation.deductions.gosi,
                    penaltiesAmount: calculation.deductions.penalties,
                    loansAmount: calculation.deductions.loans,
                    absenceAmount: calculation.deductions.absence,
                    totalDeductions: calculation.deductions.total,
                    netSalary: calculation.netSalary,
                }
            })
            generatedCount++
        }

        revalidatePath('/admin/finance')
        return { success: true, generated: generatedCount, skipped: skippedCount }

    } catch (e: any) {
        console.error("Generate Payroll Error:", e)
        return { error: e.message || "Failed to generate payroll" }
    }
}

export async function getFinancialStatement(startDate?: Date, endDate?: Date) {
    const session = await auth()
    const currentUser = (session?.user as any)
    const tenantId = currentUser?.tenantId
    const isGlobalAdmin = currentUser?.role === 'GLOBAL_SUPER_ADMIN'
    const canView = await hasPermission('finance', 'masterVisible')
    if (!canView || (!tenantId && !isGlobalAdmin)) {
        return { transactions: [], totalIncome: 0, totalExpense: 0 }
    }

    try {
        const dateFilter = startDate && endDate ? { gte: startDate, lte: endDate } : undefined
        const tenantFilter = isGlobalAdmin ? {} : { tenantId }

        // Fetch Incomes (Invoices) — scoped to current tenant (GLOBAL_SUPER_ADMIN sees all)
        const invoices = await (db as any).invoice.findMany({
            where: {
                ...tenantFilter,
                status: { in: ['ISSUED', 'PAID'] },
                ...(dateFilter ? { date: dateFilter } : {})
            },
            orderBy: { date: 'desc' }
        })

        // Fetch Expenses — scoped to current tenant (GLOBAL_SUPER_ADMIN sees all)
        const expenses = await (db as any).expense.findMany({
            where: {
                ...tenantFilter,
                ...(dateFilter ? { date: dateFilter } : {})
            },
            orderBy: { date: 'desc' }
        })

        const mappedInvoices = invoices.map((inv: any) => ({
            id: inv.id,
            date: inv.date,
            type: 'INCOME', // Keeping INCOME for consistency with totalIncome
            description: inv.description || `فاتورة ${inv.invoiceNumber}`,
            credit: inv.totalAmount, // Assuming totalAmount is the new total
            debit: 0,
            taxAmount: inv.vatAmount,
            balance: 0 // Calculated later
        }))

        const transactions = [
            ...mappedInvoices,
            ...expenses.map((exp: any) => ({
                id: exp.id,
                date: exp.date,
                type: 'EXPENSE',
                description: `Expense: ${exp.category} - ${exp.description}`,
                credit: 0,
                debit: exp.totalAmount,
                taxAmount: exp.taxAmount,
                balance: 0 // Calculated later
            }))
        ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

        // Calculate Running Balance
        let balance = 0
        const transactionsWithBalance = transactions.map(t => {
            balance += (t.credit - t.debit)
            return { ...t, balance }
        })

        const totalIncome = invoices.reduce((sum: number, inv: any) => sum + inv.totalAmount, 0) // Updated to totalAmount
        const totalExpense = expenses.reduce((sum: number, exp: any) => sum + exp.totalAmount, 0)

        return {
            transactions: transactionsWithBalance,
            totalIncome,
            totalExpense
        }

    } catch (e) {
        console.error("Financial Statement Error:", e)
        return { transactions: [], totalIncome: 0, totalExpense: 0 }
    }
}

export async function getTaxReport(year: number, quarter: number) {
    const session = await auth()
    const currentUser = (session?.user as any)
    const tenantId = currentUser?.tenantId
    const isGlobalAdmin = currentUser?.role === 'GLOBAL_SUPER_ADMIN'
    const canView = await hasPermission('finance', 'viewVATReports')
    if (!canView || (!tenantId && !isGlobalAdmin)) {
        return { netVatPayable: 0, quarter, year }
    }

    try {
        const startMonth = (quarter - 1) * 3
        const startDate = new Date(year, startMonth, 1)
        const endDate = new Date(year, startMonth + 3, 0)
        const tenantFilter = isGlobalAdmin ? {} : { tenantId }

        const invoices = await (db as any).invoice.findMany({
            where: {
                ...tenantFilter,
                status: { in: ['ISSUED', 'PAID'] },
                date: { gte: startDate, lte: endDate }
            }
        })

        const expenses = await (db as any).expense.findMany({
            where: {
                ...tenantFilter,
                date: { gte: startDate, lte: endDate },
                isTaxRecoverable: true
            }
        })

        // This try-catch block is nested unnecessarily, moving it outside
        // try {
        const totalOutputVat = invoices.reduce((sum: number, inv: any) => sum + inv.vatAmount, 0) // Updated to vatAmount
        const totalInputVat = expenses.reduce((sum: number, exp: any) => sum + exp.taxAmount, 0) // Note: expenses model still uses taxAmount

        return {
            netVatPayable: totalOutputVat - totalInputVat,
            quarter,
            year
        }

    } catch (e) {
        console.error("Tax Report Error:", e)
        return { netVatPayable: 0, quarter, year }
    }
}

export async function createInvoice(formData: FormData) {
    const session = await auth()
    const tenantId = (session?.user as any)?.tenantId
    const isGlobalAdmin = (session?.user as any)?.role === 'GLOBAL_SUPER_ADMIN'
    const canViewContracts = await hasPermission('finance', 'viewContracts')
    const canManageMaster = await hasPermission('finance', 'masterVisible')
    if (!isGlobalAdmin && ((!canViewContracts && !canManageMaster) || !tenantId)) {
        return { error: "Unauthorized" }
    }

    try {
        const invoiceNumber = formData.get("invoiceNumber") as string
        const description = formData.get("description") as string
        const projectId = formData.get("projectId") as string
        const baseAmount = parseFloat(formData.get("subtotal") as string) // Renamed subtotal to baseAmount
        const date = new Date(formData.get("date") as string)
        const file = formData.get("file") as string // In real app, upload handling

        // Fetch dynamic VAT
        const settings = await getSystemSettings()
        const systemVatRate = (settings?.vatPercentage || 15) / 100

        // Assuming project and brand data is available or fetched here
        // For now, using a placeholder for taxRate logic
        const project = { brand: { vatNumber: true } }; // Placeholder for project data
        const taxRate = project.brand?.vatNumber ? systemVatRate : 0 // Or configurable
        const isExempt = formData.get("isExempt") === "true"

        // If explicitly exempt, tax is 0. Otherwise, standard 15%
        const finalTaxRate = isExempt ? 0 : taxRate
        const vatAmount = baseAmount * finalTaxRate
        const totalAmount = baseAmount + vatAmount

        await (db as any).invoice.create({
            data: {
                projectId,
                tenantId,
                invoiceNumber: `INV-${projectId || 'N/A'}-${Date.now()}`, // Adjusted invoiceNumber generation
                baseAmount,
                taxRate: finalTaxRate,
                vatAmount,
                totalAmount,
                description: formData.get("description") as string,
                date,
                status: 'ISSUED',
                file: file || null
            }
        })

        revalidatePath('/admin/finance/invoices')
        revalidatePath('/admin/finance') // Update dashboard
        return { success: true }

    } catch (e) {
        console.error("Create Invoice Error:", e)
        return { error: "Failed to create invoice" }
    }
}

export async function createExpense(formData: FormData) {
    const session = await auth()
    const tenantId = (session?.user as any)?.tenantId
    const isGlobalAdmin = (session?.user as any)?.role === 'GLOBAL_SUPER_ADMIN'
    const canManageMaster = await hasPermission('finance', 'masterVisible')
    if (!isGlobalAdmin && (!canManageMaster || !tenantId)) {
        return { error: "Unauthorized" }
    }

    try {
        const description = formData.get("description") as string
        const amountBeforeTax = parseFloat(formData.get("amountBeforeTax") as string)
        const isTaxRecoverable = formData.get("isTaxRecoverable") === 'on'
        const category = formData.get("category") as string
        const date = new Date(formData.get("date") as string)
        const projectIdRaw = formData.get("projectId") as string
        const projectId = projectIdRaw === 'none' ? null : projectIdRaw

        const receiptFile = formData.get("receipt") as File | null
        const receipt = receiptFile && receiptFile.size > 0 ? receiptFile.name : null

        const settings = await getSystemSettings()
        const taxRate = (settings?.vatPercentage || 15) / 100
        const taxAmount = amountBeforeTax * taxRate
        const totalAmount = amountBeforeTax + taxAmount

        await (db as any).expense.create({
            data: {
                tenantId,
                description,
                amountBeforeTax,
                taxRate,
                taxAmount,
                totalAmount,
                isTaxRecoverable,
                category,
                date,
                projectId,
                receipt: receipt || null // In real app, handle upload
            }
        })

        revalidatePath('/admin/finance/expenses')
        revalidatePath('/admin/finance')
        return { success: true }

    } catch (e) {
        console.error("Create Expense Error:", e)
        return { error: "Failed to create expense" }
    }
}

