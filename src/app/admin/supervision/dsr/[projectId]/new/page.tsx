import { auth } from "@/auth"
import { notFound, redirect } from "next/navigation"
import { db } from "@/lib/db"
import { BackButton } from "@/components/ui/back-button"
import { DSRForm } from "@/components/supervision/dsr-form"

export default async function NewDSRProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
    const { projectId } = await params
    const session = await auth()
    if (!session) redirect('/login')

    const tenantId = (session.user as any)?.tenantId
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

    const contractors = await db.contractor.findMany({
        where: { tenantId },
        orderBy: { companyName: 'asc' }
    })

    return (
        <div className="space-y-6 rtl:text-right">
            <div className="flex items-center gap-4">
                <BackButton />
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-primary">تقرير يومي جديد</h1>
                    <p className="text-sm text-muted-foreground">{project.name} ({project.code})</p>
                </div>
            </div>

            <DSRForm
                project={project}
                siteEngineers={project.engineers}
                contractors={contractors}
                projectContractors={project.projectContractors}
            />
        </div>
    )
}
