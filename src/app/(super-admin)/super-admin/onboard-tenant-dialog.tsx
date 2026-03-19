"use client"

import { useState, useTransition } from "react"
import { Plus, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { onboardTenant } from "./actions"
import { toast } from "sonner"

export function OnboardTenantDialog({ plans }: { plans: any[] }) {
    const [open, setOpen] = useState(false)
    const [onboardedData, setOnboardedData] = useState<any>(null)
    const [isPending, startTransition] = useTransition()

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        const data = {
            name: formData.get("name") as string,
            slug: formData.get("slug") as string,
            adminEmail: formData.get("adminEmail") as string,
            adminName: formData.get("adminName") as string,
            adminPassword: formData.get("adminPassword") as string,
            planId: formData.get("planId") as string,
            subscriptionTier:
                plans.find((p) => p.id === formData.get("planId"))?.name || "STANDARD",
            subscriptionStart: formData.get("subscriptionStart")
                ? new Date(formData.get("subscriptionStart") as string)
                : undefined,
            subscriptionEnd: formData.get("subscriptionEnd")
                ? new Date(formData.get("subscriptionEnd") as string)
                : undefined,
        }

        startTransition(async () => {
            const result = await onboardTenant(data)
            if (result.success) {
                const port = window.location.port ? `:${window.location.port}` : ""
                setOnboardedData({
                    ...data,
                    password: result.tempPassword,
                    url: `http://${data.slug}.localhost${port}/login`,
                })
                toast.success("Tenant onboarded successfully!")
            } else {
                toast.error(result.error || "Failed to onboard tenant")
            }
        })
    }

    const resetAndClose = () => {
        setOpen(false)
        setOnboardedData(null)
    }

    return (
        <Dialog open={open} onOpenChange={(val) => { if (!val) resetAndClose(); else setOpen(true) }}>
            <DialogTrigger asChild>
                <Button
                    type="button"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-900/20"
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Onboard New Tenant
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-[425px] bg-slate-950 border-slate-800 text-slate-200">
                {onboardedData ? (
                    <div className="space-y-6 py-4">
                        <DialogHeader>
                            <DialogTitle className="text-emerald-400">Creation Successful!</DialogTitle>
                            <DialogDescription className="text-slate-400">
                                Share these credentials with the new tenant administrator.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 bg-slate-900/50 p-4 rounded-lg border border-slate-800">
                            <div>
                                <Label className="text-[10px] uppercase text-slate-500">Login URL</Label>
                                <p className="text-sm font-mono text-emerald-400 break-all">{onboardedData.url}</p>
                            </div>
                            <div>
                                <Label className="text-[10px] uppercase text-slate-500">Administrator Email</Label>
                                <p className="text-sm font-bold">{onboardedData.adminEmail}</p>
                            </div>
                            <div>
                                <Label className="text-[10px] uppercase text-slate-500">Temporary Password</Label>
                                <p className="text-sm font-mono bg-slate-800 px-2 py-1 rounded border border-slate-700">
                                    {onboardedData.password}
                                </p>
                            </div>
                        </div>
                        <Button type="button" onClick={resetAndClose} className="w-full bg-slate-800 hover:bg-slate-700">
                            Done
                        </Button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <DialogHeader>
                            <DialogTitle>Onboard New Tenant</DialogTitle>
                            <DialogDescription className="text-slate-400">
                                Create a new company account and its first administrator.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Company Name</Label>
                                <Input
                                    id="name" name="name"
                                    placeholder="Acme Engineering"
                                    required
                                    className="bg-slate-900 border-slate-700"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="slug">Subdomain Slug</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="slug" name="slug"
                                        placeholder="acme"
                                        required
                                        className="bg-slate-900 border-slate-700 font-mono"
                                    />
                                    <span className="text-slate-500 text-sm">.rearch.sa</span>
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="planId">Subscription Plan</Label>
                                <Select name="planId" required>
                                    <SelectTrigger className="bg-slate-900 border-slate-700">
                                        <SelectValue placeholder="Select a plan" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-slate-700 text-slate-200 font-sans">
                                        {plans.map((plan) => (
                                            <SelectItem key={plan.id} value={plan.id}>
                                                {plan.name} ({plan.price} {plan.currency})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="subscriptionStart" className="text-slate-400 text-[10px] uppercase">
                                        Licence Start
                                    </Label>
                                    <Input
                                        id="subscriptionStart" name="subscriptionStart"
                                        type="date"
                                        className="bg-slate-900 border-slate-700 h-9"
                                        defaultValue={new Date().toISOString().split("T")[0]}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="subscriptionEnd" className="text-slate-400 text-[10px] uppercase">
                                        Licence End
                                    </Label>
                                    <Input
                                        id="subscriptionEnd" name="subscriptionEnd"
                                        type="date"
                                        className="bg-slate-900 border-slate-700 h-9"
                                    />
                                </div>
                            </div>
                            <div className="border-t border-slate-800 my-2 pt-4">
                                <h4 className="text-sm font-semibold mb-4 text-emerald-400">First Admin User</h4>
                                <div className="grid gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="adminName">Full Name</Label>
                                        <Input
                                            id="adminName" name="adminName"
                                            placeholder="John Doe"
                                            required
                                            className="bg-slate-900 border-slate-700"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="adminEmail">Email Address</Label>
                                        <Input
                                            id="adminEmail" name="adminEmail"
                                            type="email"
                                            placeholder="admin@acme.com"
                                            required
                                            className="bg-slate-900 border-slate-700"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="adminPassword">Admin Password (Optional)</Label>
                                        <Input
                                            id="adminPassword" name="adminPassword"
                                            type="password"
                                            placeholder="Leave blank to auto-generate"
                                            className="bg-slate-900 border-slate-700"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setOpen(false)}
                                className="text-slate-400"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isPending}
                                className="bg-emerald-600 hover:bg-emerald-500"
                            >
                                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Create Tenant
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    )
}
