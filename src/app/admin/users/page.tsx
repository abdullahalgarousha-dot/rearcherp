import { auth } from "@/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Edit, Trash2 } from "lucide-react"

import { checkPermission } from "@/lib/rbac"

export default async function UsersPage() {
    const session = await auth()
    const canView = await checkPermission('USERS', 'read')
    if (!canView) {
        redirect("/admin")
    }

    const users = await (db as any).user.findMany({
        orderBy: { name: 'asc' },
        include: {
            userRole: true // current granular role
        }
    })

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">System Users</h1>
                <p className="text-muted-foreground">Manage user accounts and assign roles.</p>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Branch</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.map((user: any) => (
                            <TableRow key={user.id}>
                                <TableCell className="font-medium">{user.name}</TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>
                                    {user.userRole ? (
                                        <Badge variant="outline">{user.userRole.name}</Badge>
                                    ) : (
                                        <Badge variant="secondary">No Role</Badge>
                                    )}
                                </TableCell>
                                <TableCell>{user.branch || "-"}</TableCell>
                                <TableCell className="text-right">
                                    <Link href={`/admin/users/${user.id}`}>
                                        <Button variant="ghost" size="icon">
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                    </Link>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
