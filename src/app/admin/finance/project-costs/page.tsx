import { getProjectCosts } from "./actions"
import { ProjectCostsClient } from "./client-page"
import { auth } from "@/auth"
import { checkPermission, hasPermission } from "@/lib/rbac"
import { redirect } from "next/navigation"

export default async function ProjectCostsPage() {
    const session = await auth()
    const canReadFinance = await hasPermission('finance', 'masterVisible')

    if (!session || !canReadFinance) {
        redirect('/')
    }

    const projectsWithCosts = await getProjectCosts()

    return <ProjectCostsClient initialData={projectsWithCosts} />
}
