"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select"
import { Plus } from "lucide-react"
import { createLead } from "@/app/admin/crm/leads/actions"

export function NewLeadDialog({ brands }: { brands: { id: string; nameEn: string }[] }) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setError(null)
        const fd = new FormData(e.currentTarget)
        setLoading(true)
        const res = await createLead({
            name: fd.get('name') as string,
            company: fd.get('company') as string,
            email: fd.get('email') as string,
            phone: fd.get('phone') as string,
            brandId: fd.get('brandId') as string,
            notes: fd.get('notes') as string,
        })
        setLoading(false)
        if (res.error) { setError(res.error); return }
        setOpen(false)
        router.refresh()
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="rounded-xl font-bold">
                    <Plus className="w-4 h-4 mr-2" /> New Lead
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>New Sales Lead</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="brandId">Brand *</Label>
                        <Select name="brandId" required>
                            <SelectTrigger className="rounded-xl">
                                <SelectValue placeholder="Select brand…" />
                            </SelectTrigger>
                            <SelectContent>
                                {brands.map(b => (
                                    <SelectItem key={b.id} value={b.id}>{b.nameEn}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="name">Contact Name *</Label>
                        <Input id="name" name="name" placeholder="Ahmad Al-Rashidi" required className="rounded-xl" />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="company">Company</Label>
                        <Input id="company" name="company" placeholder="Al-Rashidi Group" className="rounded-xl" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="phone">Phone</Label>
                            <Input id="phone" name="phone" placeholder="+966 5x xxx xxxx" className="rounded-xl" />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" name="email" type="email" placeholder="ahmad@…" className="rounded-xl" />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea id="notes" name="notes" placeholder="Source, context…" className="rounded-xl" rows={2} />
                    </div>
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    <DialogFooter>
                        <Button type="submit" disabled={loading} className="rounded-xl w-full font-bold">
                            {loading ? 'Creating…' : 'Create Lead'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
