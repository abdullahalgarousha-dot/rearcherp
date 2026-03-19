import { auth } from "@/auth"
import { notFound, redirect } from "next/navigation"
import { db } from "@/lib/db"
import { BackButton } from "@/components/ui/back-button"

import { ProjectForm } from "../../new/project-form"
import { ContractorManager } from "@/components/projects/contractor-manager"

export default async function EditProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
    const { projectId } = await params
    const session = await auth()
    if (!session) redirect('/login')

    const project = await (db as any).project.findUnique({
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

    const brands = await db.brand.findMany({ orderBy: { nameEn: 'asc' } })
    const engineers = await db.user.findMany({
        where: { role: { in: ['PM', 'DESIGN_ENGINEER', 'SITE_ENGINEER'] } },
        orderBy: { name: 'asc' }
    })
    const allContractors = await (db as any).contractor.findMany({ orderBy: { companyName: 'asc' } })

    return (
        <div className="space-y-6 rtl:text-right">
            <div className="flex items-center gap-4">
                <BackButton />
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-primary">تعديل المشروع</h1>
                    <p className="text-sm text-muted-foreground">{project.name} ({project.code})</p>
                </div>
            </div>

            <ProjectForm
                brands={brands}
                engineers={engineers}
                initialData={JSON.parse(JSON.stringify(project))}
            />

            <ContractorManager
                projectId={projectId}
                projectContractors={project.projectContractors}
                allContractors={allContractors}
            />
        </div>
    )
}
