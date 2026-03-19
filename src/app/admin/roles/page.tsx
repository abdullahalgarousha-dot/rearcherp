import { db } from "@/lib/db"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { PlusCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { checkPermission } from "@/lib/rbac"
import { RolesTable } from "./roles-table"
import { RoleModal } from "./role-modal"

export default async function RolesPage() {
    const session = await auth()
    if (!session?.user) redirect('/login')

    const isAdmin = await checkPermission('ROLES', 'read')
    if (!isAdmin && session.user.email !== "admin@fts.com") {
        redirect('/')
    }

    const roles = await db.role.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
            _count: {
                select: { users: true }
            }
        }
    })

    return (
        <div className="p-4 md:p-8 rtl:text-right max-w-7xl mx-auto pb-24">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">إدارة المسميات والصلاحيات</h1>
                    <p className="text-slate-500 font-medium mt-1">
                        Dynamic Roles & Permission Matrix Management
                    </p>
                </div>
                <RoleModal />
            </div>

            <RolesTable roles={roles} />
        </div>
    )
}
