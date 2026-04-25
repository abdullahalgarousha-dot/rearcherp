import { auth } from "@/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { hasPermission } from "@/lib/rbac"
import { KanbanBoard } from "./kanban-board"
import { FolderKanban } from "lucide-react"
import { Suspense } from "react"

export default async function TaskBoardPage() {
    const session = await auth()
    const user = session?.user as any

    const projectViewScope = await hasPermission('projects', 'view')
    if (projectViewScope === 'NONE') redirect('/dashboard')

    const tenantId = user?.tenantId as string
    const userRole = user?.role as string
    const userId = user?.id as string
    const isGlobalSuperAdmin = userRole === 'GLOBAL_SUPER_ADMIN'

    const tenantFilter: any = isGlobalSuperAdmin ? {} : { tenantId }

    const taskWhere: any =
        projectViewScope === 'ALL'
            ? tenantFilter
            : { ...tenantFilter, assignees: { some: { id: userId } } }

    const [tasks, projects, users] = await Promise.all([
        (db as any).task.findMany({
            where: taskWhere,
            orderBy: { createdAt: 'desc' },
            include: {
                project: { select: { id: true, name: true } },
                assignees: { select: { id: true, name: true } }
            }
        }),
        (db as any).project.findMany({
            where: projectViewScope === 'ALL'
                ? tenantFilter
                : { ...tenantFilter, OR: [{ engineers: { some: { id: userId } } }, { leadEngineerId: userId }] },
            orderBy: { name: 'asc' },
            select: { id: true, name: true }
        }),
        // Staff for assignee selector — scoped to tenant, active users only
        isGlobalSuperAdmin
            ? (db as any).user.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true }, take: 100 })
            : (db as any).user.findMany({
                where: { tenantId },
                orderBy: { name: 'asc' },
                select: { id: true, name: true },
                take: 100
            })
    ])

    return (
        <div className="space-y-8 pb-20">
            <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                    <FolderKanban className="h-8 w-8 text-primary" />
                    Task Board
                </h1>
                <p className="text-slate-500 font-medium mt-1">
                    Production workflow — manage task states across all projects.
                </p>
            </div>

            <Suspense fallback={null}>
                <KanbanBoard
                    tasks={tasks}
                    projects={projects}
                    users={users}
                    userRole={userRole}
                    userId={userId}
                />
            </Suspense>
        </div>
    )
}
