import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import ClientNCRPage from "./client-page"

export default async function NCRDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await auth()
    const userRole = (session?.user as any)?.role

    if (!['ADMIN', 'PM', 'HR', 'SITE_ENGINEER', 'ACCOUNTANT'].includes(userRole)) {
        redirect('/dashboard')
    }

    const { id } = await params

    const ncr = await db.nCR.findUnique({
        where: { id },
        include: {
            project: { include: { brand: true } },
            contractor: true,
            createdBy: true,
            approvedBy: true,
            revisions: {
                include: { respondedBy: true },
                orderBy: { revNumber: 'desc' }
            }
        }
    })

    if (!ncr) return <div>NCR not found</div>

    return (
        <ClientNCRPage ncr={ncr} userRole={userRole} />
    )
}
