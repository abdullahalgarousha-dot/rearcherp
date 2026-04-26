"use client"

import { useState } from "react"
import { Globe, Loader2 } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateTenantDomain } from "./actions"
import { toast } from "sonner"

interface CustomDomainDialogProps {
    tenant: {
        id: string
        slug: string
        customDomain?: string | null
    }
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function CustomDomainDialog({ tenant, open, onOpenChange }: CustomDomainDialogProps) {
    const [loading, setLoading] = useState(false)
    const [domain, setDomain] = useState(tenant.customDomain || "")

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)

        const result = await updateTenantDomain(tenant.id, domain || null)

        if (result.success) {
            toast.success("Custom domain updated successfully")
            onOpenChange(false)
        } else {
            toast.error(result.error || "Failed to update domain")
        }
        setLoading(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] bg-slate-950 border-slate-800 text-slate-200">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Globe className="h-5 w-5 text-emerald-400" />
                            Map Custom Domain
                        </DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Connect a personal domain for <strong>{tenant.slug}.topo-eng.sa</strong>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-6">
                        <div className="grid gap-2">
                            <Label htmlFor="domain" className="text-slate-300">Custom Domain</Label>
                            <Input
                                id="domain"
                                value={domain}
                                onChange={(e) => setDomain(e.target.value)}
                                placeholder="e.g. engineer.com"
                                className="bg-slate-900 border-slate-700 text-white"
                            />
                            <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                                To complete the link, the client must point their DNS <strong>A Record</strong> to your server's IP address.
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-slate-400">
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-500">
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Update Domain
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
