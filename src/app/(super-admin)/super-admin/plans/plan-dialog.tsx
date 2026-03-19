"use client"

import { useState } from "react"
import { upsertPlan, deletePlan } from "../actions"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "react-hot-toast"
import { Loader2, Trash2, CheckCircle2 } from "lucide-react"

const MODULES = ['HR', 'FINANCE', 'GANTT', 'ZATCA', 'PROJECTS', 'CRM', 'FILE_UPLOAD']

export function PlanDialog({ children, plan }: { children: React.ReactNode, plan?: any }) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [name, setName] = useState(plan?.name || "")
    const [description, setDescription] = useState(plan?.description || "")
    const [price, setPrice] = useState(plan?.price || 0)
    const [currency, setCurrency] = useState(plan?.currency || "SAR")
    const [allowedModules, setAllowedModules] = useState<string[]>(plan?.allowedModules || [])

    const toggleModule = (mod: string) => {
        setAllowedModules(prev =>
            prev.includes(mod) ? prev.filter(m => m !== mod) : [...prev, mod]
        )
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const res = await upsertPlan({
                id: plan?.id,
                name,
                description,
                price: Number(price),
                currency,
                allowedModules
            })
            if (res.success) {
                toast.success(plan ? "Plan updated!" : "Plan created!")
                setOpen(false)
            } else {
                toast.error(res.error || "Failed to save plan")
            }
        } catch (err) {
            toast.error("Operation failed")
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this plan? This will fail if tenants are assigned.")) return
        setLoading(true)
        try {
            const res = await deletePlan(plan.id)
            if (res.success) {
                toast.success("Plan deleted")
                setOpen(false)
            } else {
                toast.error(res.error)
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{plan ? "Edit Subscription Plan" : "Create New Plan"}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Plan Name</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g., Enterprise"
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="desc">Description</Label>
                            <Input
                                id="desc"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Marketing blurb..."
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="price">Price</Label>
                                <Input
                                    id="price"
                                    type="number"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="currency">Currency</Label>
                                <Input
                                    id="currency"
                                    value={currency}
                                    onChange={(e) => setCurrency(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label>Enabled Modules</Label>
                            <div className="grid grid-cols-2 gap-2 p-3 border rounded-lg bg-muted/30">
                                {MODULES.map((mod) => (
                                    <div key={mod} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`mod-${mod}`}
                                            checked={allowedModules.includes(mod)}
                                            onCheckedChange={() => toggleModule(mod)}
                                        />
                                        <label
                                            htmlFor={`mod-${mod}`}
                                            className="text-xs font-medium leading-none cursor-pointer select-none"
                                        >
                                            {mod}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="flex justify-between items-center sm:justify-between w-full">
                        {plan && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:bg-destructive/10"
                                onClick={handleDelete}
                                disabled={loading}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        )}
                        <div className="flex gap-2 ml-auto">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={loading}>
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                                {plan ? "Update Plan" : "Create Plan"}
                            </Button>
                        </div>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
