import { auth } from "@/auth"
import { db } from "@/lib/db"
import { redirect, notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { RoleAssignment } from "../role-assignment"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, Trash2 } from "lucide-react"
import { DeleteUserButton } from "../delete-user-button"

import { checkPermission } from "@/lib/rbac"
import { getAvailableRoles } from "@/lib/roles"

export default async function UserDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await auth()
    const canView = await checkPermission('USERS', 'read')
    if (!canView) {
        redirect("/admin")
    }

    const { id } = await params

    const user = await (db as any).user.findUnique({
        where: { id },
        // We don't strictly need userRole anymore, but keeping it doesn't hurt.
        // We rely on 'role' string field now.
    })

    if (!user) {
        notFound()
    }

    // Unify Role List
    const allRoles = await getAvailableRoles()

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/admin/users">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{user.name}</h1>
                    <p className="text-muted-foreground">{user.email}</p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Role Management Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>Role Management</CardTitle>
                        <CardDescription>
                            Assign a Granular Role to this user.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                            <div>
                                <p className="font-medium">Current Role</p>
                                <p className="text-sm text-muted-foreground">
                                    {user.role || "No Role Assigned"}
                                </p>
                            </div>
                            <RoleAssignment user={{ ...user, role: user.role, roleId: user.roleId }} roles={allRoles} />
                        </div>
                    </CardContent>
                </Card>

                {/* Account Actions Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>Account Actions</CardTitle>
                        <CardDescription className="text-destructive">
                            Danger Zone
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between p-4 border border-destructive/20 bg-destructive/5 rounded-lg">
                            <div>
                                <p className="font-medium text-destructive">Delete User</p>
                                <p className="text-sm text-destructive/80">
                                    Permanently remove this user and their access.
                                </p>
                            </div>
                            <DeleteUserButton userId={user.id} userName={user.name || user.email} />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
