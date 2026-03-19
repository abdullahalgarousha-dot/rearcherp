'use client'

import { useState, useTransition } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Trash2, RefreshCw, Save, Plus } from "lucide-react"
import { toast } from "sonner"
import { saveRoleMappings, syncUserRoles } from "@/app/admin/settings/actions"

const SYSTEM_ROLES = [
    'ADMIN',
    'HR',
    'FINANCE',
    'MANAGER',
    'SITE_ENGINEER',
    'DESIGN_ENGINEER',
    'ACCOUNTANT',
    'PM'
]

export function RoleMapping({ initialMappings }: { initialMappings: any[] }) {
    const [mappings, setMappings] = useState<{ jobTitle: string, role: string }[]>(initialMappings)
    const [isPending, startTransition] = useTransition()

    const addRow = () => {
        setMappings([...mappings, { jobTitle: "", role: "SITE_ENGINEER" }])
    }

    const removeRow = (index: number) => {
        const newMappings = [...mappings]
        newMappings.splice(index, 1)
        setMappings(newMappings)
    }

    const updateRow = (index: number, field: 'jobTitle' | 'role', value: string) => {
        const newMappings = [...mappings]
        newMappings[index] = { ...newMappings[index], [field]: value }
        setMappings(newMappings)
    }

    const handleSave = () => {
        startTransition(async () => {
            const res = await saveRoleMappings(mappings)
            if (res.success) toast.success("Mappings Saved")
            else toast.error("Failed to save")
        })
    }

    const handleSync = () => {
        startTransition(async () => {
            const res = await syncUserRoles()
            if (res.success) toast.success(`Synced ${res.updated} users`)
            else toast.error(res.error || "Sync failed")
        })
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Role Mapping (RBAC)</CardTitle>
                <CardDescription>Map Job Titles to System Roles. Click Sync to apply changes to existing users.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Job Title (Expected in Profile)</TableHead>
                                <TableHead>System Role</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {mappings.map((m, i) => (
                                <TableRow key={i}>
                                    <TableCell>
                                        <Input
                                            value={m.jobTitle}
                                            onChange={(e) => updateRow(i, 'jobTitle', e.target.value)}
                                            placeholder="e.g. Senior Accountant"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Select value={m.role} onValueChange={(v) => updateRow(i, 'role', v)}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {SYSTEM_ROLES.map(role => (
                                                    <SelectItem key={role} value={role}>{role}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        <Button size="icon" variant="ghost" className="text-red-500" onClick={() => removeRow(i)}>
                                            <Trash2 size={16} />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                <div className="flex gap-2">
                    <Button variant="outline" onClick={addRow} disabled={isPending}>
                        <Plus size={16} className="mr-2" /> Add Row
                    </Button>
                    <div className="flex-1" />
                    <Button variant="secondary" onClick={handleSync} disabled={isPending}>
                        <RefreshCw size={16} className={`mr-2 ${isPending ? 'animate-spin' : ''}`} />
                        Sync Users
                    </Button>
                    <Button onClick={handleSave} disabled={isPending}>
                        <Save size={16} className="mr-2" /> Save Mappings
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
