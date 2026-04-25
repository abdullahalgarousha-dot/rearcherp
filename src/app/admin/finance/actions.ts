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

        // 1. Fetch all active employees with profiles
        const employees = await db.user.findMany({
            where: {
                tenantId,
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
            await db.salarySlip.upsert({
                where: {
                    profileId_month: {
                        profileId: emp.profile.id,
                        month: monthStart
                    }
                },
                create: {
                    tenantId: tenantId!,
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
        const invoices = await db.invoice.findMany({
            where: {
                ...tenantFilter,
                status: { in: ['ISSUED', 'PAID'] },
                ...(dateFilter ? { date: dateFilter } : {})
            },
            orderBy: { date: 'desc' }
        })

        // Fetch Expenses — scoped to current tenant (GLOBAL_SUPER_ADMIN sees all)
        const expenses = await db.expense.findMany({
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

        const invoices = await db.invoice.findMany({
            where: {
                ...tenantFilter,
                status: { in: ['ISSUED', 'PAID'] },
                date: { gte: startDate, lte: endDate }
            }
        })

        const expenses = await db.expense.findMany({
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

export async function createInvoice(data: any) {
    const session = await auth()
    const userRole = (session?.user as any)?.role
    const tenantId = (session?.user as any)?.tenantId

    const isGlobalAdmin = userRole === 'GLOBAL_SUPER_ADMIN'
    
    // Auth Check
    if (!tenantId && !isGlobalAdmin) return { error: "Unauthorized" }

    try {
        const { description, projectId, date, discountType, discountValue, items } = data;

        // 1. Strict Project Verification (IDOR Protection)
        const project = await db.project.findFirst({
            where: isGlobalAdmin ? { id: projectId } : { id: projectId, tenantId },
            include: { client: true }
        });

        if (!project) {
            return { error: "Project not found or unauthorized access" };
        }

        const projectTenantId = project.tenantId;

        // 2. Generate Sequential Invoice Number (Server-Side only)
        const lastInvoice = await db.invoice.findFirst({
            where: { tenantId: projectTenantId },
            orderBy: { sequenceNumber: 'desc' }
        });

        const nextSequence = (lastInvoice?.sequenceNumber || 0) + 1;
        const year = new Date(date).getFullYear();
        const generatedInvoiceNumber = `INV-${year}-${nextSequence.toString().padStart(4, '0')}`;

        // 3. Absolute Server-Side Financial Math
        let rawItemsSubtotal = 0;
        const validItems = items.map((item: any) => {
            const qty = parseFloat(item.quantity) || 0;
            const price = parseFloat(item.unitPrice) || 0;
            const lineSubtotal = qty * price;
            
            rawItemsSubtotal += lineSubtotal;

            const itemTax = parseFloat((lineSubtotal * 0.15).toFixed(2));
            const itemTotal = parseFloat((lineSubtotal + itemTax).toFixed(2));

            return {
                tenantId: projectTenantId,
                description: String(item.description),
                quantity: qty,
                unitPrice: price,
                taxRate: 0.15,
                taxAmount: itemTax,
                totalAmount: itemTotal
            };
        });

        // Apply Discount
        let discountAmount = 0;
        const dVal = parseFloat(discountValue) || 0;
        if (discountType === "PERCENTAGE") {
            discountAmount = rawItemsSubtotal * (Math.min(100, Math.max(0, dVal)) / 100);
        } else if (discountType === "FIXED") {
            discountAmount = Math.min(rawItemsSubtotal, Math.max(0, dVal));
        }

        const taxableSubtotal = parseFloat(Math.max(0, rawItemsSubtotal - discountAmount).toFixed(2));
        
        // ZATCA / Standard 15% VAT
        const vatAmount = parseFloat((taxableSubtotal * 0.15).toFixed(2));
        const grandTotal = parseFloat((taxableSubtotal + vatAmount).toFixed(2));

        const invoiceType = project.client?.clientType === "INDIVIDUAL" ? "SIMPLIFIED" : "STANDARD";

        // 4. Create Invoice with explicitly propagated tenantId for children
        await db.invoice.create({
            data: {
                tenantId: projectTenantId,
                projectId: project.id,
                invoiceNumber: generatedInvoiceNumber,
                sequenceNumber: nextSequence,
                invoiceType,
                discountType: discountType || null,
                discountValue: dVal,
                subTotal: taxableSubtotal,
                baseAmount: taxableSubtotal,
                taxRate: 0.15,
                vatAmount: vatAmount,
                taxAmount: vatAmount,
                totalAmount: grandTotal,
                grandTotal: grandTotal,
                description,
                date: new Date(date),
                status: 'ISSUED',
                items: {
                    create: validItems
                }
            }
        });

        revalidatePath('/admin/finance/invoices')
        revalidatePath('/admin/finance') 
        return { success: true }

    } catch (e: any) {
        console.error("Create Invoice Error:", e)
        return { error: e.message || "Failed to create invoice" }
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
        if (!amountBeforeTax || amountBeforeTax <= 0) return { error: "Expense amount must be greater than zero" }
        const isTaxRecoverable = formData.get("isTaxRecoverable") === 'on'
        const category = formData.get("category") as string
        const date = new Date(formData.get("date") as string)
        const projectIdRaw = formData.get("projectId") as string
        const projectId = projectIdRaw === 'none' ? null : projectIdRaw

        // 1. Secure Project Verification (IDOR Prevention)
        if (projectId) {
            const project = await db.project.findFirst({
                where: { id: projectId, tenantId }
            })
            if (!project) return { error: "Unauthorized: Project not found or belongs to another tenant" }
        }

        const receiptFile = formData.get("receipt") as File | null
        const receipt = receiptFile && receiptFile.size > 0 ? receiptFile.name : null

        // 2. Tenant-Aware VAT Settings
        const settings = await getSystemSettings()
        const taxRate = (settings?.vatPercentage || 15) / 100
        const taxAmount = Math.round(amountBeforeTax * taxRate * 100) / 100
        const totalAmount = Math.round((amountBeforeTax + taxAmount) * 100) / 100

        await db.expense.create({
            data: {
                tenantId: tenantId!,
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

