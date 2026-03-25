import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { ProjectForm } from "./project-form"
import { getSystemSettings, getSystemLookups } from "@/app/actions/settings"
import { getBranches } from "@/app/actions/branches"
import { getAllClients } from "@/app/admin/crm/actions"
import Link from "next/link"
import { AlertTriangle } from "lucide-react"

export default async function NewProjectPage() {
    const session = await auth()
    const user = session?.user as any

    if (!user) return redirect('/login')

    const tenantId = user.tenantId as string

    const brands = await db.brand.findMany({ where: { tenantId } })
    const engineers = await db.user.findMany({
        where: {
            tenantId,
            role: {
                in: ['PM', 'DESIGN_ENGINEER', 'SITE_ENGINEER', 'ADMIN']
            }
        }
    })

    // Fallback if no specific engineers found
    const allUsers = engineers.length > 0 ? engineers : await db.user.findMany({ where: { tenantId } })

    const settings = await getSystemSettings()
    const projectTypes = await getSystemLookups('PROJECT_TYPE')
    const disciplines = await getSystemLookups('ENGINEERING_DISCIPLINE')
    const branches = await getBranches()
    const clients = await getAllClients()

    if (brands.length === 0) {
        return (
            <div className="max-w-2xl mx-auto py-20 text-center space-y-4">
                <div className="h-16 w-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto">
                    <AlertTriangle className="h-8 w-8 text-amber-500" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">No Entities / Brands Found</h2>
                <p className="text-slate-500 max-w-sm mx-auto">
                    Every project must belong to an Entity (Brand). Please create at least one Entity before creating a project.
                </p>
                <Link href="/admin/brands" className="inline-flex items-center gap-2 bg-slate-900 text-white font-semibold px-6 py-3 rounded-xl hover:bg-slate-800 transition-colors">
                    Go to Entities / Brands →
                </Link>
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold tracking-tight mb-6">Create New Project</h2>
            <ProjectForm
                brands={brands}
                engineers={allUsers}
                systemVat={settings?.vatPercentage || 15}
                projectTypes={projectTypes}
                disciplines={disciplines}
                branches={branches}
                clients={clients}
            />
        </div>
    )
}
