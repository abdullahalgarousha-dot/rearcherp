'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { addContractorToProject, removeContractorFromProject } from "@/app/admin/projects/actions"
import { format } from 'date-fns'
import { Trash2, Plus, Calendar, Coins, Clock } from 'lucide-react'
import { toast } from "sonner"

interface ContractorManagerProps {
    projectId: string
    projectContractors: any[]
    allContractors: any[]
}

export function ContractorManager({ projectId, projectContractors, allContractors }: ContractorManagerProps) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    // Form State
    const [selectedContractorId, setSelectedContractorId] = useState('')
    const [contractValue, setContractValue] = useState('')
    const [durationDays, setDurationDays] = useState('')
    const [startDate, setStartDate] = useState('')

    const handleAdd = async () => {
        if (!selectedContractorId) return

        setLoading(true)
        const formData = new FormData()
        formData.append('contractorId', selectedContractorId)
        formData.append('contractValue', contractValue)
        formData.append('durationDays', durationDays)
        formData.append('startDate', startDate)

        const res = await addContractorToProject(projectId, formData)

        if (res.error) {
            toast.error(res.error)
        } else {
            toast.success("Contractor assigned successfully")
            setOpen(false)
            // Reset form
            setSelectedContractorId('')
            setContractValue('')
            setDurationDays('')
            setStartDate('')
            router.refresh()
        }
        setLoading(false)
    }

    const handleRemove = async (contractorId: string) => {
        if (!confirm("Are you sure you want to remove this contractor from the project?")) return

        const res = await removeContractorFromProject(projectId, contractorId)
        if (res.error) {
            toast.error(res.error)
        } else {
            toast.success("Contractor removed")
            router.refresh()
        }
    }

    return (
        <Card className="border-none shadow-xl bg-white/60 backdrop-blur-xl mt-8">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                    <CardTitle className="text-xl font-bold text-primary">Assigned Contractors</CardTitle>
                    <CardDescription>Manage contractors linked to this project.</CardDescription>
                </div>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button className="rounded-xl shadow-lg shadow-primary/20">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Contractor
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px] rounded-xl">
                        <DialogHeader>
                            <DialogTitle>Assign Contractor</DialogTitle>
                            <DialogDescription>
                                Link a contractor to this project with contract details.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="contractor">Contractor *</Label>
                                <Select onValueChange={setSelectedContractorId} value={selectedContractorId}>
                                    <SelectTrigger className="rounded-lg">
                                        <SelectValue placeholder="Select contractor..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {allContractors.map(c => (
                                            <SelectItem key={c.id} value={c.id} disabled={projectContractors.some(pc => pc.contractorId === c.id)}>
                                                {c.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="value">Value (SAR)</Label>
                                    <Input id="value" type="number" step="0.01" value={contractValue} onChange={e => setContractValue(e.target.value)} className="rounded-lg" />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="duration">Duration (Days)</Label>
                                    <Input id="duration" type="number" value={durationDays} onChange={e => setDurationDays(e.target.value)} className="rounded-lg" />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="start">Start Date</Label>
                                <Input id="start" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="rounded-lg" />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setOpen(false)} className="rounded-lg">Cancel</Button>
                            <Button onClick={handleAdd} disabled={loading || !selectedContractorId} className="rounded-lg">
                                {loading ? "Adding..." : "Assign Contractor"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {projectContractors.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground italic border-2 border-dashed rounded-xl border-slate-200">
                            No contractors assigned yet.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {projectContractors.map((pc) => (
                                <div key={pc.contractorId} className="group relative bg-white border border-slate-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
                                    <div className="flex justify-between items-start mb-3">
                                        <h4 className="font-bold text-slate-800 line-clamp-1">{pc.contractor.name}</h4>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleRemove(pc.contractorId)}
                                            className="h-6 w-6 text-slate-400 hover:text-red-500 -mt-1 -mr-1"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                    <div className="space-y-2 text-xs text-slate-500">
                                        <div className="flex items-center gap-2">
                                            <Coins className="w-3 h-3 text-emerald-500" />
                                            <span className="font-mono text-slate-700">{pc.contractValue?.toLocaleString() || 0} SAR</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-3 h-3 text-amber-500" />
                                            <span>{pc.durationDays} Days</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-3 h-3 text-indigo-500" />
                                            <span>{pc.startDate ? format(new Date(pc.startDate), 'dd MMM yyyy') : 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
