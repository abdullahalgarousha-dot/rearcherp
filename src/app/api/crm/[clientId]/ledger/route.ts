import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"

export async function GET(req: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const user = session.user as any

    const { clientId } = await params

    const client = await (db as any).client.findUnique({
        where: { id: clientId },
        include: {
            projects: {
                include: { invoices: true }
            }
        }
    })

    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 })

    // RBAC
    const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT'].includes(user.role)
    if (!isAdmin) {
        const userProjects = await db.project.count({
            where: {
                id: { in: client.projects.map((p: any) => p.id) },
                engineers: { some: { id: user.id } }
            }
        })
        if (userProjects === 0) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const systemSettings = await db.systemSettings.findFirst()

    // Build ledger entries
    type EntryWithoutBalance = {
        id: string
        date: string
        type: 'INVOICE' | 'PAYMENT'
        description: string
        projectCode: string
        projectName: string
        debit: number
        credit: number
    }

    const entries: EntryWithoutBalance[] = []

    client.projects.forEach((project: any) => {
        project.invoices.forEach((inv: any) => {
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

            if (inv.status === 'PAID') {
                const payDate = inv.paymentDate ?? inv.updatedAt ?? new Date(new Date(inv.date).getTime() + 86400000)

                entries.push({
                    id: `pay-${inv.id}`,
                    date: payDate,
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

    entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    let runningBalance = 0
    const calculatedEntries = entries.map(entry => {
        runningBalance = runningBalance + entry.debit - entry.credit
        return { ...entry, balance: runningBalance }
    })

    return NextResponse.json({
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
    })
}
