"use client"

import { useState } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { savePermissionsMatrix } from "./actions"
import { toast } from "sonner"
import { ModuleName } from "@/lib/rbac"
import { Loader2, Save } from "lucide-react"

interface RolePermissionsTableProps {
    roles: string[]
    initialPermissions: any[]
}

const MODULES: ModuleName[] = ['HR', 'FINANCE', 'PROJECTS', 'SUPERVISION', 'USERS', 'ROLES']

export function RolePermissionsTable({ roles, initialPermissions }: RolePermissionsTableProps) {
    const [permissions, setPermissions] = useState(initialPermissions)
    const [loading, setLoading] = useState(false)
    const [isDirty, setIsDirty] = useState(false)

    const handleToggle = (roleName: string, module: string, field: 'canRead' | 'canWrite' | 'canApprove') => {
        setPermissions(prev => {
            const existingIndex = prev.findIndex(p => p.roleName === roleName && p.module === module)
            let newPermissions = [...prev]

            if (existingIndex >= 0) {
                newPermissions[existingIndex] = {
                    ...newPermissions[existingIndex],
                    [field]: !newPermissions[existingIndex][field]
                }
            } else {
                newPermissions.push({
                    roleName,
                    module,
                    canRead: field === 'canRead',
                    canWrite: field === 'canWrite',
                    canApprove: field === 'canApprove'
                })
            }
            return newPermissions
        })
        setIsDirty(true)
    }

    const handleSave = async () => {
        setLoading(true)
        try {
            const result = await savePermissionsMatrix(permissions)
            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success("Permissions saved successfully")
                setIsDirty(false)
            }
        } catch (error) {
            toast.error("An error occurred while saving")
        } finally {
            setLoading(false)
        }
    }

    const getPermission = (roleName: string, module: string) => {
        return permissions.find(p => p.roleName === roleName && p.module === module) || { canRead: false, canWrite: false, canApprove: false }
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-end sticky top-0 z-10 bg-background/95 backdrop-blur py-2">
                <Button onClick={handleSave} disabled={!isDirty || loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Configuration
                </Button>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[200px]">Role</TableHead>
                            {MODULES.map(module => (
                                <TableHead key={module} className="text-center border-l bg-muted/50">
                                    {module}
                                    <div className="flex justify-center gap-4 text-xs font-semibold text-muted-foreground mt-1">
                                        <span title="Read">Read</span>
                                        <span title="Write">Write</span>
                                        <span title="Approve">Approve</span>
                                    </div>
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {roles.map(role => (
                            <TableRow key={role}>
                                <TableCell className="font-medium">{role}</TableCell>
                                {MODULES.map(module => {
                                    const perm = getPermission(role, module)
                                    return (
                                        <TableCell key={`${role}-${module}`} className="border-l text-center p-2">
                                            <div className="flex justify-center gap-4">
                                                <Checkbox
                                                    checked={perm.canRead}
                                                    onCheckedChange={() => handleToggle(role, module, 'canRead')}
                                                    aria-label={`Read ${module} for ${role}`}
                                                />
                                                <Checkbox
                                                    checked={perm.canWrite}
                                                    onCheckedChange={() => handleToggle(role, module, 'canWrite')}
                                                    aria-label={`Write ${module} for ${role}`}
                                                />
                                                <Checkbox
                                                    checked={perm.canApprove}
                                                    onCheckedChange={() => handleToggle(role, module, 'canApprove')}
                                                    aria-label={`Approve ${module} for ${role}`}
                                                />
                                            </div>
                                        </TableCell>
                                    )
                                })}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
