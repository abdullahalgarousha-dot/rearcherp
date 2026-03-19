import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { BackButton } from "@/components/ui/back-button"
import { Badge } from "@/components/ui/badge"
import { PrintLayout } from "@/components/common/print-layout"
import { RevisionTimeline } from "@/components/supervision/revision-timeline"
import { RevisionWorkspace } from "@/components/supervision/revision-workspace"
import { IRActionPanel } from "@/components/supervision/ir-action-panel"
import { PDFExportButton } from "@/components/supervision/pdf-export-button"
import { Separator } from "@/components/ui/separator"
import ClientIRPage from "./client-page"

export default async function IRDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await auth()
    const userRole = (session?.user as any)?.role

    if (!['ADMIN', 'PM', 'HR', 'SITE_ENGINEER', 'ACCOUNTANT'].includes(userRole)) {
        redirect('/dashboard')
    }

    const { id } = await params

    const ir = await db.inspectionRequest.findUnique({
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

    if (!ir) return <div>IR not found</div>

    return (
        <ClientIRPage ir={ir} userRole={userRole} />
    )
}
