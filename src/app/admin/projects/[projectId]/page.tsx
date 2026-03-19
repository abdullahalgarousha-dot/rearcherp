import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { GanttChart, Printer } from "lucide-react"
import { ProjectGanttChart } from "@/components/timeline/gantt-chart"
import { TaskList } from "@/components/timeline/task-list"
import { NewTaskDialog } from "@/components/timeline/new-task-dialog"
import { EditProjectDialog } from "@/components/projects/edit-project-dialog"
import { BackButton } from "@/components/ui/back-button"
import { PrintButton } from "@/components/common/print-button"
import { DriveSyncButton } from "@/components/projects/drive-sync-button"
import { SupervisionWorkspace } from "@/components/projects/SupervisionWorkspace"
import { ProjectFilesTab } from "@/components/projects/files/project-files-tab"
import { FinancialsTab } from "@/components/projects/financials-tab"
import { FinancialDocumentsTab } from "@/components/projects/financial-documents-tab"
import { DesignStagesTab } from "@/components/projects/design-stages-tab"
import { DocumentRegisterTab } from "@/components/projects/documents/document-register-tab"
import { getProjectCostReport } from "@/app/actions/timesheet"
import { getProjectPL } from "@/app/actions/accounts"

interface ProjectDetailsPageProps {
    params: {
        projectId: string
    }
}

export default async function ProjectDetailsPage({ params, searchParams }: { params: Promise<{ projectId: string }>, searchParams: Promise<{ tab?: string }> }) {
    const session = await auth()
    const user = session?.user as any

    if (!user) return redirect('/login')

    const { projectId } = await params
    const { tab } = await searchParams

    // Cast db to any to avoid TS error
    const projectData = await (db as any).project.findUnique({
        where: { id: projectId },
        include: {
            brand: true,
            client: true,
            engineers: true,
            tasks: {
                include: {
                    assignees: true
                },
                orderBy: { start: 'asc' }
            },
            milestones: true,
            designStages: {
                include: {
                    assignees: { select: { id: true, name: true } }
                },
                orderBy: { order: 'asc' }
            },
            drawings: {
                include: {
                    revisions: {
                        include: {
                            comments: { include: { user: true }, orderBy: { createdAt: 'desc' } }
                        }
                    }
                }
            },
            invoices: { orderBy: { date: 'desc' } },
            variationOrders: { orderBy: { createdAt: 'desc' } }
        }
    })

    if (!projectData) {
        return <div>Project not found</div>
    }

    const allEngineers = await (db as any).user.findMany({
        where: { role: { not: 'ADMIN' } }, // Assuming non-admins are engineers for now
        select: { id: true, name: true, role: true }
    })

    // Serialize to avoid Date object issues with Client Components
    const project = JSON.parse(JSON.stringify(projectData))
    const engineers = JSON.parse(JSON.stringify(allEngineers))

    const costReport = await getProjectCostReport(projectId)
    const plData = await getProjectPL(projectId)

    // Fetch sub-contracts with vendor + milestones for the Vendors panel
    const subContractsRaw = await (db as any).subContract.findMany({
        where: { projectId },
        include: {
            vendor: true,
            milestones: { orderBy: { createdAt: 'asc' } }
        },
        orderBy: { contractDate: 'desc' }
    })
    const subContracts = JSON.parse(JSON.stringify(subContractsRaw))

    // canApproveFinance: ADMIN/SUPER_ADMIN always can; others filtered by role list
    const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' || user.role === 'GLOBAL_SUPER_ADMIN'
    const canApproveFinance = isAdmin || ['ACCOUNTANT'].includes(user.role)

    return (
        <div className="space-y-6">
            <BackButton />

            <div className="flex justify-between items-start print:hidden">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <p className="text-muted-foreground">{project.code} • {project.client?.name || project.legacyClientName}</p>
                        <Badge variant="outline" className="border-primary/20 text-primary bg-primary/5">
                            {project.serviceType}
                        </Badge>
                        {project.driveLink && (
                            <a
                                href={project.driveLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-200 hover:bg-blue-100 transition-colors flex items-center gap-1"
                            >
                                View on Drive ↗
                            </a>
                        )}
                    </div>
                </div>
                <div className="flex gap-2">
                    <DriveSyncButton projectId={project.id} isLinked={!!project.driveFolderId && !project.driveFolderId.startsWith('mock_')} />
                    <PrintButton />
                    <EditProjectDialog project={project} allEngineers={engineers} />
                </div>
            </div>

            {/* Printable Report Header - Visible only in Print */}
            <div className="hidden print:block mb-8 border-b-2 border-primary pb-4">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-bold text-primary">{project.brand.nameEn}</h1>
                        <p className="text-gray-500 text-sm">Architectural & Engineering Consultancy</p>
                    </div>
                    <div className="text-right">
                        <h2 className="text-2xl font-bold">{project.name}</h2>
                        <p className="text-lg text-gray-600">{project.client?.name || project.legacyClientName}</p>
                        <p className="text-sm text-gray-500 font-mono">{project.code}</p>
                    </div>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Contract Value</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{Number(project.contractValue).toLocaleString()} SAR</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Brand</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{project.brand.nameEn}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Engineers</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-1">
                            {project.engineers.map((Eng: any) => (
                                <Badge key={Eng.id} variant="secondary">{Eng.name}</Badge>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue={tab || "overview"} className="w-full">
                <TabsList className="w-full justify-start h-12 bg-muted/50 p-1 rounded-2xl">
                    <TabsTrigger value="overview" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">Overview</TabsTrigger>

                    {(project.serviceType === 'DESIGN' || project.serviceType === 'BOTH') && (
                        <>
                            <TabsTrigger value="design" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">Design Stages</TabsTrigger>
                            <TabsTrigger value="documents" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">Drawings</TabsTrigger>
                        </>
                    )}

                    {(project.serviceType === 'SUPERVISION' || project.serviceType === 'BOTH') && (
                        <TabsTrigger value="supervision" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">Supervision</TabsTrigger>
                    )}

                    <TabsTrigger value="files" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">Files</TabsTrigger>

                    {['ADMIN', 'SUPER_ADMIN', 'GLOBAL_SUPER_ADMIN', 'ACCOUNTANT', 'CEO'].includes(user.role) && (
                        <TabsTrigger value="financials" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">Financials</TabsTrigger>
                    )}
                </TabsList>

                {/* OVERVIEW TAB */}
                <TabsContent value="overview" className="space-y-6 mt-6">
                    <div className="flex justify-between items-center">
                        <div className="space-x-2">
                            <h3 className="text-xl font-bold tracking-tight">Project Timeline</h3>
                            <p className="text-muted-foreground text-sm">Gantt Chart & Tasks</p>
                        </div>
                        <div className="flex gap-2 print:hidden">
                            <NewTaskDialog projectId={project.id} engineers={project.engineers} designStages={project.designStages || []} />
                        </div>
                    </div>

                    <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden">
                        <CardContent className="p-0">
                            <ProjectGanttChart tasks={project.tasks} project={project} stages={project.designStages} />
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-xl bg-white rounded-3xl">
                        <CardHeader>
                            <CardTitle>Task List</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <TaskList tasks={project.tasks} engineers={project.engineers} designStages={project.designStages || []} />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* DESIGN TAB */}
                {(project.serviceType === 'DESIGN' || project.serviceType === 'BOTH') && (
                    <>
                        <TabsContent value="design" className="mt-6">
                            <DesignStagesTab projectId={project.id} engineers={engineers} />
                        </TabsContent>
                        <TabsContent value="documents" className="mt-6">
                            <DocumentRegisterTab
                                projectId={project.id}
                                drawings={project.drawings || []}
                                isSuperAdmin={isAdmin}
                            />
                        </TabsContent>
                    </>
                )}

                {/* SUPERVISION TAB */}
                {(project.serviceType === 'SUPERVISION' || project.serviceType === 'BOTH') && (
                    <TabsContent value="supervision" className="mt-6">
                        <SupervisionWorkspace projectId={project.id} projectName={project.name} />
                    </TabsContent>
                )}

                {/* FILES TAB */}
                <TabsContent value="files" className="mt-6">
                    <ProjectFilesTab projectId={project.id} driveLink={project.driveLink} driveFolderId={project.driveFolderId} />
                </TabsContent>

                {/* FINANCIALS TAB */}
                {['ADMIN', 'SUPER_ADMIN', 'GLOBAL_SUPER_ADMIN', 'ACCOUNTANT', 'CEO'].includes(user.role) && (
                    <TabsContent value="financials" className="mt-6">
                        <FinancialsTab
                            project={project}
                            milestones={project.milestones || []}
                            invoices={project.invoices || []}
                            variationOrders={project.variationOrders || []}
                            subContracts={subContracts}
                            costReport={costReport}
                            plData={plData}
                            canEdit={['ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT'].includes(user.role)}
                            canApproveFinance={canApproveFinance}
                        />
                    </TabsContent>
                )}
            </Tabs>
        </div >
    )
}
