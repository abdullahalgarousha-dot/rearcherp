"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"

interface LedgerEntry {
    id: string
    date: Date
    type: 'INVOICE' | 'PAYMENT'
    description: string
    projectCode: string
    projectName: string
    debit: number // Invoice Amount
    credit: number // Payment Amount
    balance: number // Running Balance
}

export async function getClientLedger(clientId: string) {
    const session = await auth()
    if (!session?.user) throw new Error("Unauthorized")
    const user = session.user as any

    const client = await (db as any).client.findUnique({
        where: { id: clientId },
        include: {
            projects: {
                include: {
                    invoices: true
                }
            }
        }
    })

    if (!client) throw new Error("Client not found")

    // RBAC: If not admin, check if user has access to any of this client's projects
    const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT'].includes(user.role)
    if (!isAdmin) {
        const userProjects = await db.project.count({
            where: {
                id: { in: client.projects.map((p: any) => p.id) },
                engineers: { some: { id: user.id } }
            }
        })
        if (userProjects === 0) throw new Error("Unauthorized to view this client's ledger")
    }

    const systemSettings = await db.systemSettings.findFirst()

    // 1. Gather all Invoices (Debits)
    // 2. Gather all Payments (Credits) -- Currently FTS ERP tracks "Paid Invoices" rather than distinct payment records for clients.
    // If an invoice is marked 'PAID', we will emit TWO ledger entries: 
    //   a) The Invoice issuance (Debit) on invoice.date
    //   b) The Payment receipt (Credit) on invoice.updatedAt (or a mock date slightly after if we don't have exact payment date).
    // For a real accounting system there would be a Receipt model. We'll use this proxy logic for now.

    let entries: Omit<LedgerEntry, 'balance'>[] = []

    client.projects.forEach((project: any) => {
        project.invoices.forEach((inv: any) => {
            // 1. Invoice Issuance (Debit)
            entries.push({
                id: `inv-${inv.id}`,
                date: inv.date,
                type: 'INVOICE',
                description: `Invoice #${inv.invoiceNumber} | فاتورة رقم`,
                projectCode: project.code,
                projectName: project.name,
                debit: parseFloat(inv.totalAmount?.toString() || '0'),
                credit: 0
            })

            // 2. Payment Receipt (Credit)
            // If the invoice is PAID, it means FTS received the money.
            if (inv.status === 'PAID') {
                entries.push({
                    id: `pay-${inv.id}`,
                    // Use paymentDate (set when marked PAID), fallback to updatedAt
                    date: inv.paymentDate ?? inv.updatedAt ?? new Date(new Date(inv.date).getTime() + 86400000),
                    type: 'PAYMENT',
                    description: `Payment / Receipt for Inv #${inv.invoiceNumber} | دفعة مستلمة`,
                    projectCode: project.code,
                    projectName: project.name,
                    debit: 0,
                    credit: parseFloat(inv.totalAmount?.toString() || '0')
                })
            }
        })
    })

    // 3. Sort Chronologically
    entries.sort((a, b) => a.date.getTime() - b.date.getTime())

    // 4. Calculate Running Balance
    let runningBalance = 0
    const calculatedEntries: LedgerEntry[] = entries.map(entry => {
        // Balance = previous balance + Debits - Credits
        runningBalance = runningBalance + entry.debit - entry.credit
        return {
            ...entry,
            balance: runningBalance
        }
    })

    return {
        client: {
            name: client.name,
            clientCode: client.clientCode,
            taxNumber: client.taxNumber,
            address: client.address
        },
        settings: {
            companyNameEn: (systemSettings as any)?.companyNameEn,
            companyNameAr: (systemSettings as any)?.companyNameAr,
            vatNumber: (systemSettings as any)?.vatNumber,
            websiteUrl: (systemSettings as any)?.websiteUrl
        },
        entries: calculatedEntries
    }
}
