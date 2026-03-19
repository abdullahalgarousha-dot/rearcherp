"use client"

import { useState } from "react"
import { MoreHorizontal, ShieldAlert, Trash2, Edit, Users, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { RoleModal } from "./role-modal"
import { deleteRole } from "./actions"

export function RolesTable({ roles }: { roles: any[] }) {
    const [loadingId, setLoadingId] = useState<string | null>(null)
    const [editingRole, setEditingRole] = useState<any>(null)
    const [duplicatePresetName, setDuplicatePresetName] = useState<string | undefined>(undefined)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)

    async function handleDelete(id: string) {
        if (!confirm("Are you sure you want to delete this Role?")) return
        setLoadingId(id)
        const res = await deleteRole(id)
        if (!res.success) {
            alert(res.error)
        }
        setLoadingId(null)
    }

    const openEditModal = (role: any, isDuplicate: boolean = false) => {
        setEditingRole(role)
        setDuplicatePresetName(isDuplicate ? `${role.name}_COPY` : undefined)
        setIsEditModalOpen(true)
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden font-sans">
            <div className="overflow-x-auto">
                <table className="w-full text-right">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                        <tr>
                            <th className="p-4 uppercase tracking-wider text-xs w-1/4">المسمى الوظيفي (Role)</th>
                            <th className="p-4 uppercase tracking-wider text-xs">الوصف (Description)</th>
                            <th className="p-4 uppercase tracking-wider text-xs w-24 text-center">الموظفين</th>
                            <th className="p-4 uppercase tracking-wider text-xs w-24 text-center">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {roles.map((role) => (
                            <tr key={role.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                            {role.name === 'SUPER_ADMIN' || role.name === 'ADMIN' ? (
                                                <ShieldAlert className="h-5 w-5" />
                                            ) : (
                                                <Users className="h-5 w-5" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800">{role.name}</p>
                                            {role.name === 'SUPER_ADMIN' && <Badge variant="destructive" className="mt-1 text-[10px]">نظام أساسي</Badge>}
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4 text-sm text-slate-600">
                                    {role.description || <span className="text-slate-400 italic">لا يوجد وصف</span>}
                                </td>
                                <td className="p-4 text-center">
                                    <Badge variant="outline" className="font-bold cursor-default">
                                        {role._count.users}
                                    </Badge>
                                </td>
                                <td className="p-4 text-center">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-48 font-bold rtl:text-right">
                                            <DropdownMenuLabel>إجراءات المسمى</DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onClick={() => openEditModal(role)} className="cursor-pointer text-blue-600">
                                                <Edit className="mr-2 h-4 w-4" /> العرض / التعديل
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => openEditModal(role, true)} className="cursor-pointer text-emerald-600">
                                                <Copy className="mr-2 h-4 w-4" /> نسخ لمسمى جديد
                                            </DropdownMenuItem>
                                            {(role.name !== 'SUPER_ADMIN' && role.name !== 'ADMIN') && (
                                                <DropdownMenuItem
                                                    onClick={() => handleDelete(role.id)}
                                                    disabled={loadingId === role.id || role._count.users > 0}
                                                    className="cursor-pointer text-red-600 focus:bg-red-50"
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    {loadingId === role.id ? "جاري الحذف..." : "حذف المسمى"}
                                                </DropdownMenuItem>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </td>
                            </tr>
                        ))}
                        {roles.length === 0 && (
                            <tr>
                                <td colSpan={4} className="p-8 text-center text-slate-400 font-medium">
                                    لا توجد مسميات وظيفية. انقر على "إضافة مسمى" للبدء.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Render the Edit/Duplicate Modal imperatively if open */}
            {isEditModalOpen && (
                <RoleModal
                    existingRole={editingRole}
                    presetName={duplicatePresetName}
                    open={isEditModalOpen}
                    setOpen={setIsEditModalOpen}
                />
            )}
        </div>
    )
}
