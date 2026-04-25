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

    const tenantId = (session?.user as any)?.tenantId
    if (!tenantId) redirect('/login')

    const project = await db.project.findFirst({
        where: { id: projectId, tenantId },
        include: {
            brand: true,
            engineers: true,
            projectContractors: {
                include: { contractor: true }
            }
        }
    })

    if (!project) notFound()

    const report = await db.dailyReport.findFirst({
        where: { id: reportId, tenantId },
        include: { project: true }
    })

    if (!report) notFound()

    const contractors = await db.contractor.findMany({
        where: { tenantId },
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
