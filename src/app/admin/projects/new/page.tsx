import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { ProjectForm } from "./project-form"
import { getSystemSettings, getSystemLookups } from "@/app/actions/settings"
import { getBranches } from "@/app/actions/branches"
import { getAllClients } from "@/app/admin/crm/actions"

export default async function NewProjectPage() {
    const session = await auth()
    const user = session?.user as any

    if (!user) return redirect('/login')

    const brands = await db.brand.findMany()
    const engineers = await db.user.findMany({
        where: {
            role: {
                in: ['PM', 'DESIGN_ENGINEER', 'SITE_ENGINEER']
            }
        }
    })

    // Fallback if no specific engineers found (for dev/demo)
    const allUsers = engineers.length > 0 ? engineers : await db.user.findMany()

    const settings = await getSystemSettings()
    const projectTypes = await getSystemLookups('PROJECT_TYPE')
    const disciplines = await getSystemLookups('ENGINEERING_DISCIPLINE')
    const branches = await getBranches()
    const clients = await getAllClients()

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
