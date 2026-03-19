"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Save, Loader2, RefreshCcw } from "lucide-react"
import { updatePermissions } from "../actions"
import { useRouter } from "next/navigation"

interface PermissionMatrixProps {
    roleId: string
    initialPermissions: any
    modules: string[]
    actions: string[]
    moduleLabels: any
    actionLabels: any
    canEdit: boolean
}

export function PermissionMatrix({
    roleId,
    initialPermissions,
    modules,
    actions,
    moduleLabels,
    actionLabels,
    canEdit
}: PermissionMatrixProps) {
    const [permissions, setPermissions] = useState(initialPermissions)
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleToggle = (module: string, action: string) => {
        if (!canEdit) return

        setPermissions((prev: any) => ({
            ...prev,
            [module]: {
                ...prev[module],
                [action]: !prev[module]?.[action]
            }
        }))
    }

    const handleSave = async () => {
        setLoading(true)
        const res = await updatePermissions(roleId, permissions)
        setLoading(false)
        if (res.success) {
            router.refresh()
            // Optional toast here
        } else {
            alert("Failed to save permissions")
        }
    }

    return (
        <Card className="border-none shadow-sm bg-white overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Permission Matrix</CardTitle>
                    <CardDescription>Grant or revoke specific capabilities per module.</CardDescription>
                </div>
                {canEdit && (
                    <Button onClick={handleSave} disabled={loading} className="gap-2">
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save Changes
                    </Button>
                )}
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {modules.map((module) => (
                        <div key={module} className="bg-slate-50/50 rounded-xl border border-slate-100 overflow-hidden">
                            <div className="bg-slate-100/50 p-3 border-b border-slate-100 flex items-center justify-between">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    <Badge variant="outline" className="bg-white text-xs">{module}</Badge>
                                    {moduleLabels[module]}
                                </h3>
                            </div>
                            <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                                {actions.map((action) => {
                                    const isEnabled = permissions[module]?.[action] || false
                                    return (
                                        <div
                                            key={`${module}-${action}`}
                                            className={`
                                                flex flex-col gap-2 p-3 rounded-lg border transition-all
                                                ${isEnabled ? 'bg-indigo-50 border-indigo-100' : 'bg-white border-slate-100 grayscale opacity-60 hover:opacity-100 hover:grayscale-0'}
                                            `}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className={`text-xs font-bold ${isEnabled ? 'text-indigo-700' : 'text-slate-500'}`}>
                                                    {actionLabels[action]}
                                                </span>
                                                <Switch
                                                    checked={isEnabled}
                                                    onCheckedChange={() => handleToggle(module, action)}
                                                    disabled={!canEdit}
                                                />
                                            </div>
                                            <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden mt-1">
                                                <div className={`h-full transition-all duration-300 ${isEnabled ? 'bg-indigo-500 w-full' : 'w-0'}`} />
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
