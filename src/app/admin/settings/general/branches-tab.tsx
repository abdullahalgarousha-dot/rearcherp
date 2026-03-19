"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Briefcase, Building, MapPin, BadgePercent, Coins, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { createBranch, updateBranch, deleteBranch } from "@/app/actions/branches"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export function BranchesTab({ branches }: { branches: any[] }) {
    const [loading, setLoading] = useState(false)
    const [isAddOpen, setIsAddOpen] = useState(false)
    const [editingBranch, setEditingBranch] = useState<any | null>(null)

    async function handleAdd(formData: FormData) {
        setLoading(true)
        await createBranch(formData)
        setLoading(false)
        setIsAddOpen(false)
    }

    async function handleEdit(formData: FormData) {
        if (!editingBranch) return
        setLoading(true)
        await updateBranch(editingBranch.id, formData)
        setLoading(false)
        setEditingBranch(null)
    }

    async function handleDelete(id: string) {
        if (confirm("Are you sure you want to delete this branch?")) {
            setLoading(true)
            await deleteBranch(id)
            setLoading(false)
        }
    }

    return (
        <Card className="border-none shadow-xl rounded-3xl">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Branches & Currencies</CardTitle>
                    <CardDescription>Manage your corporate locations and their base currencies</CardDescription>
                </div>
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild>
                        <Button className="rounded-xl gap-2 font-semibold">
                            <Building className="h-4 w-4" /> Add Branch
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <form action={handleAdd} className="space-y-6">
                            <DialogHeader>
                                <DialogTitle>New Branch</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Name (English)</Label>
                                        <Input name="nameEn" required placeholder="Jeddah HQ" />
                                    </div>
                                    <div className="space-y-2 text-right">
                                        <Label>Name (Arabic)</Label>
                                        <Input name="nameAr" required placeholder="المقر الرئيسي - جدة" dir="rtl" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Location / Address</Label>
                                    <Input name="location" placeholder="e.g. King Fahd Road, Tower B" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Base Currency</Label>
                                        <Select name="currencyCode" defaultValue="SAR">
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="SAR">Saudi Riyal (SAR)</SelectItem>
                                                <SelectItem value="EGP">Egyptian Pound (EGP)</SelectItem>
                                                <SelectItem value="USD">US Dollar (USD)</SelectItem>
                                                <SelectItem value="AED">UAE Dirham (AED)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Exchange Rate (to Base)</Label>
                                        <Input type="number" step="0.0001" name="exchangeRateToBase" defaultValue="1.0" required />
                                    </div>
                                </div>
                                <div className="flex items-center justify-between border rounded-xl p-4">
                                    <div className="space-y-0.5">
                                        <Label>Headquarters</Label>
                                        <p className="text-sm text-slate-500">Mark this as the primary HQ branch</p>
                                    </div>
                                    <Switch name="isMainBranch" value="true" />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={loading} className="w-full">
                                    {loading ? 'Saving...' : 'Create Branch'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                <div className="rounded-2xl border overflow-hidden">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead>Branch Name</TableHead>
                                <TableHead>Location</TableHead>
                                <TableHead>Currency</TableHead>
                                <TableHead>HQ Status</TableHead>
                                <TableHead className="w-[80px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {branches.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-12 text-slate-500">
                                        No branches created yet.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                branches.map((b) => (
                                    <TableRow key={b.id}>
                                        <TableCell>
                                            <div className="font-semibold text-slate-900">{b.nameEn}</div>
                                            <div className="text-xs text-slate-500">{b.nameAr}</div>
                                        </TableCell>
                                        <TableCell className="text-slate-500">
                                            {b.location || "—"}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="font-mono bg-slate-50">
                                                {b.currencyCode} (x{b.exchangeRateToBase})
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {b.isMainBranch ? (
                                                <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-none">Main HQ</Badge>
                                            ) : (
                                                <span className="text-slate-400 text-sm">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => setEditingBranch(b)}>
                                                        <Pencil className="mr-2 h-4 w-4" /> Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(b.id)}>
                                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>

            {/* Edit Dialog */}
            <Dialog open={!!editingBranch} onOpenChange={(open) => !open && setEditingBranch(null)}>
                <DialogContent className="sm:max-w-[500px]">
                    <form action={handleEdit} className="space-y-6">
                        <DialogHeader>
                            <DialogTitle>Edit Branch</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Name (English)</Label>
                                    <Input name="nameEn" required defaultValue={editingBranch?.nameEn} />
                                </div>
                                <div className="space-y-2 text-right">
                                    <Label>Name (Arabic)</Label>
                                    <Input name="nameAr" required defaultValue={editingBranch?.nameAr} dir="rtl" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Location / Address</Label>
                                <Input name="location" defaultValue={editingBranch?.location || ''} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Base Currency</Label>
                                    <Select name="currencyCode" defaultValue={editingBranch?.currencyCode || 'SAR'}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="SAR">Saudi Riyal (SAR)</SelectItem>
                                            <SelectItem value="EGP">Egyptian Pound (EGP)</SelectItem>
                                            <SelectItem value="USD">US Dollar (USD)</SelectItem>
                                            <SelectItem value="AED">UAE Dirham (AED)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Exchange Rate (to Base)</Label>
                                    <Input type="number" step="0.0001" name="exchangeRateToBase" defaultValue={editingBranch?.exchangeRateToBase || "1.0"} required />
                                </div>
                            </div>
                            <div className="flex items-center justify-between border rounded-xl p-4">
                                <div className="space-y-0.5">
                                    <Label>Headquarters</Label>
                                    <p className="text-sm text-slate-500">Mark this as the primary HQ branch</p>
                                </div>
                                <Switch name="isMainBranch" value="true" defaultChecked={editingBranch?.isMainBranch} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={loading} className="w-full">
                                {loading ? 'Saving...' : 'Update Branch'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </Card>
    )
}
