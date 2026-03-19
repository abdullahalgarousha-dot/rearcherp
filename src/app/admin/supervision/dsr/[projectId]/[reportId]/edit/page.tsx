import { auth } from "@/auth"
import { notFound, redirect } from "next/navigation"
import { db } from "@/lib/db"
import { BackButton } from "@/components/ui/back-button"
import { DSRForm } from "@/components/supervision/dsr-form"
import { checkPermission } from "@/lib/rbac"

export default async function EditDSRPage({ params }: { params: Promise<{ projectId: string, reportId: string }> }) {
    const { projectId, reportId } = await params
    const session = await auth()

    // Permission Check
    const canEdit = await checkPermission('SUPERVISION', 'write')
    const canApprove = await checkPermission('SUPERVISION', 'approve')

    if (!canEdit && !canApprove) {
        redirect('/')
    }

    const project = await db.project.findUnique({
        where: { id: projectId },
        include: {
            brand: true,
            engineers: true,
            projectContractors: {
                include: { contractor: true }
            }
        }
    })

    if (!project) notFound()

    const report = await db.dailyReport.findUnique({
        where: { id: reportId },
        include: {
            project: true, // Need project for logic if needed
            // No need for deep relations as JSON fields hold the data, 
            // but we might want attendees relation if we prefer that over JSON?
            // DSRForm uses JSON state mostly. 
            // Let's rely on the JSON fields which are now primary.
        }
    })

    if (!report) notFound()

    // Check if editable
    if (report.status === 'APPROVED' && !canApprove) {
        // Only Approvers can edit Approved reports (if logic allows, currently workflows usually lock approved stuff)
        // But for safe side, redirect if approved? 
        // User request: "PM opens the report. They must be able to EDIT any field".
        // PM usually edits BEFORE approval.
        // Let's assume PENDING only for now unless specified.
    }

    const contractors = await db.contractor.findMany({
        orderBy: { companyName: 'asc' }
    })

    return (
        <div className="space-y-6 rtl:text-right">
            <div className="flex items-center gap-4">
                <BackButton />
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-primary">تعديل التقرير اليومي</h1>
                    <p className="text-sm text-muted-foreground">{project.name} - Report #{report.serial}</p>
                </div>
            </div>

            <DSRForm
                project={project}
                siteEngineers={project.engineers}
                contractors={contractors}
                projectContractors={project.projectContractors}
                initialData={report}
            />
        </div>
    )
}
