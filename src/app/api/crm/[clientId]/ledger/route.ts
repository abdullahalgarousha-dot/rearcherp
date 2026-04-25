import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"

export async function GET(req: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const user = session.user as any

    const { clientId } = await params

    const tenantId = user.tenantId as string
    const isAdmin =
        user.role === 'GLOBAL_SUPER_ADMIN' ||
        user.role === 'SUPER_ADMIN' ||
        user.role === 'ADMIN' ||
        user.role === 'ACCOUNTANT'

    // Admin bypass: GSA/SUPER_ADMIN/ADMIN see all tenants; others scoped to their tenant
    const clientWhere = isAdmin
        ? { id: clientId }
        : { id: clientId, tenantId }

    let client: any
    try {
        client = await (db as any).client.findFirst({
            where: clientWhere,
            include: {
                projects: {
                    include: {
                        invoices: { orderBy: { date: 'asc' } },
                        brand: { select: { nameEn: true, nameAr: true, logoUrl: true, primaryColor: true, vatNumber: true } },
                    }
                }
            }
        })
    } catch (error) {
        console.error("🚨 LEDGER FETCH ERROR (client query):", error)
        return NextResponse.json({ error: "Database error fetching client" }, { status: 500 })
    }

    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 })

    // Non-admin engineers: must be assigned to at least one of this client's projects
    if (!isAdmin) {
        try {
            const userProjects = await (db as any).project.count({
                where: {
                    id: { in: client.projects.map((p: any) => p.id) },
                    engineers: { some: { id: user.id } }
                }
            })
            if (userProjects === 0) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
        } catch (error) {
            console.error("🚨 LEDGER FETCH ERROR (RBAC check):", error)
            return NextResponse.json({ error: "Authorization check failed" }, { status: 500 })
        }
    }

    let systemSettings: any = null
    try {
        systemSettings = await (db as any).companyProfile.findFirst(
            tenantId && tenantId !== 'system' ? { where: { tenantId } } : undefined
        )
    } catch (error) {
        console.error("🚨 LEDGER FETCH ERROR (settings query):", error)
        // Non-fatal — continue without settings
    }

    // ── Summary Aggregates ────────────────────────────────────────────────
    const totalContractValue = client.projects.reduce(
        (sum: number, p: any) => sum + parseFloat(p.contractValue?.toString() || '0'), 0
    )

    type InvoiceItem = {
        id: string; invoiceNumber: string; date: Date; amount: number
        status: string; paymentDate: Date | null; projectCode: string; projectName: string
    }
    const allInvoices: InvoiceItem[] = client.projects.flatMap((p: any) =>
        p.invoices.map((inv: any): InvoiceItem => ({
            id: inv.id,
            invoiceNumber: inv.invoiceNumber,
            date: inv.date,
            amount: parseFloat(inv.totalAmount?.toString() || '0'),
            status: inv.status,
            paymentDate: inv.paymentDate ?? null,
            projectCode: p.code,
            projectName: p.name,
        }))
    )
    allInvoices.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    const totalInvoiced = allInvoices.reduce((sum, inv) => sum + inv.amount, 0)
    const totalPaid = allInvoices
        .filter(inv => inv.status === 'PAID')
        .reduce((sum, inv) => sum + inv.amount, 0)
    const totalOutstanding = totalInvoiced - totalPaid

    // Payments = invoices that have been paid (credit entries)
    const payments = allInvoices
        .filter(inv => inv.status === 'PAID')
        .map((inv, idx) => ({
            receiptRef: `RCP-${String(idx + 1).padStart(3, '0')}`,
            invoiceNumber: inv.invoiceNumber,
            date: inv.paymentDate ?? inv.date,
            amount: inv.amount,
            projectCode: inv.projectCode,
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    // ── Chronological Ledger ──────────────────────────────────────────────
    type LedgerRow = {
        id: string
        date: string | Date
        type: 'INVOICE' | 'PAYMENT'
        description: string
        projectCode: string
        projectName: string
        debit: number
        credit: number
        status?: string
    }

    const rawEntries: LedgerRow[] = []

    client.projects.forEach((project: any) => {
        project.invoices.forEach((inv: any) => {
            rawEntries.push({
                id: `inv-${inv.id}`,
                date: inv.date,
                type: 'INVOICE',
                description: `Invoice #${inv.invoiceNumber} | فاتورة رقم`,
                projectCode: project.code,
                projectName: project.name,
                debit: parseFloat(inv.totalAmount?.toString() || '0'),
                credit: 0,
                status: inv.status,
            })

            if (inv.status === 'PAID') {
                const payDate = inv.paymentDate ?? inv.updatedAt ?? new Date(new Date(inv.date).getTime() + 86400000)
                rawEntries.push({
                    id: `pay-${inv.id}`,
                    date: payDate,
                    type: 'PAYMENT',
                    description: `Payment / Receipt for Inv #${inv.invoiceNumber} | دفعة مستلمة`,
                    projectCode: project.code,
                    projectName: project.name,
                    debit: 0,
                    credit: parseFloat(inv.totalAmount?.toString() || '0'),
                })
            }
        })
    })

    rawEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    let runningBalance = 0
    const entries = rawEntries.map(entry => {
        runningBalance = runningBalance + entry.debit - entry.credit
        return { ...entry, balance: runningBalance }
    })

    // Brand: prefer the brand attached to the client's first project; fall back to system settings
    const firstBrand = client.projects[0]?.brand ?? null
    const brand = {
        nameEn: firstBrand?.nameEn ?? (systemSettings as any)?.companyNameEn ?? 'Company',
        nameAr: firstBrand?.nameAr ?? (systemSettings as any)?.companyNameAr ?? '',
        logoUrl: firstBrand?.logoUrl ?? (systemSettings as any)?.logoUrl ?? null,
        primaryColor: firstBrand?.primaryColor ?? '#4f46e5',
        vatNumber: firstBrand?.vatNumber ?? (systemSettings as any)?.vatNumber ?? null,
    }

    return NextResponse.json({
        client: {
            id: client.id,
            name: client.name,
            clientCode: client.clientCode,
            taxNumber: client.taxNumber,
            address: client.address,
        },
        brand,
        settings: {
            companyNameEn: (systemSettings as any)?.companyNameEn,
            companyNameAr: (systemSettings as any)?.companyNameAr,
            vatNumber: (systemSettings as any)?.vatNumber,
            websiteUrl: (systemSettings as any)?.websiteUrl,
            logoUrl: (systemSettings as any)?.logoUrl ?? null,
        },
        summary: {
            totalContractValue,
            totalInvoiced,
            totalPaid,
            totalOutstanding,
            projectCount: client.projects.length,
        },
        invoices: allInvoices,
        payments,
        entries,
    })
}
