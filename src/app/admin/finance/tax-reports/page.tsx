import { auth } from "@/auth"
import { hasPermission } from "@/lib/rbac"
import { redirect } from "next/navigation"
import { getTaxReports } from "./actions"
import { TaxReportsClient } from "./client-page"

export default async function TaxReportsPage() {
    const session = await auth()
    const canReadFinance = await hasPermission('finance', 'viewVATReports')
    const isGlobalAdmin = (session?.user as any)?.role === 'GLOBAL_SUPER_ADMIN'

    if (!session || (!canReadFinance && !isGlobalAdmin)) {
        redirect('/')
    }

    const now = new Date()
    const currentYear = now.getFullYear()
    const currentQuarter = Math.floor(now.getMonth() / 3) + 1
    const startMonth = (currentQuarter - 1) * 3
    const startOfQuarter = new Date(currentYear, startMonth, 1)
    const endOfQuarter = new Date(currentYear, startMonth + 3, 0, 23, 59, 59)

    const initialData = await getTaxReports(startOfQuarter, endOfQuarter)

    return (
        <TaxReportsClient
            initialData={initialData as any}
            initialDate={{ from: startOfQuarter, to: endOfQuarter }}
            currentYear={currentYear}
            currentQuarter={currentQuarter}
        />
    )
}
