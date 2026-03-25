"use client"

import { useState } from "react"
import { MoreVertical, Shield, Power, Trash2, Crown, ExternalLink, Globe } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { toggleTenantStatus, deleteTenant, logImpersonation } from "./actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { CustomDomainDialog } from "./custom-domain-dialog"
import { EditTenantDialog } from "./edit-tenant-dialog"
import { buildTenantUrl } from "@/lib/tenant-url"

interface TenantActionsProps {
    tenant: {
        id: string
        name: string
        slug: string
        status: string
        subscriptionTier: string
        planId?: string | null
        customDomain?: string | null
    }
    plans: any[]
}

export function TenantActions({ tenant, plans }: TenantActionsProps) {
    const [loading, setLoading] = useState(false)
    const [domainDialogOpen, setDomainDialogOpen] = useState(false)
    const router = useRouter()

    async function handleStatusToggle() {
        setLoading(true)
        const result = await toggleTenantStatus(tenant.id, tenant.status)
        if (result.success) {
            toast.success("Status updated successfully")
        } else {
            toast.error(result.error || "Failed to update status")
        }
        setLoading(false)
    }


    async function handleDelete() {
        if (!confirm(`Are you sure you want to delete ${tenant.slug}? This is permanent.`)) return

        setLoading(true)
        const result = await deleteTenant(tenant.id)
        if (result.success) {
            toast.success("Tenant deleted")
        } else {
            toast.error(result.error || "Failed to delete tenant")
        }
        setLoading(false)
    }

    const handleImpersonate = async () => {
        setLoading(true)
        await logImpersonation(tenant.id, tenant.slug)
        window.open(buildTenantUrl(tenant.slug, "/dashboard"), "_blank")
        setLoading(false)
    }

    return (
        <div className="flex items-center gap-2">
            <Button
                variant="ghost"
                size="sm"
                onClick={handleImpersonate}
                className="opacity-0 group-hover:opacity-100 transition-opacity bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950"
            >
                <ExternalLink className="h-3 w-3 mr-2" />
                Login as Tenant
            </Button>

            <EditTenantDialog tenant={tenant} plans={plans} />

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-slate-500 hover:text-white hover:bg-slate-800" disabled={loading}>
                        <MoreVertical className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-slate-950 border-slate-800 text-slate-200 w-56">
                    <DropdownMenuLabel>Actions for {tenant.slug}</DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-slate-800" />

                    <DropdownMenuItem onClick={handleStatusToggle} className="cursor-pointer focus:bg-slate-900">
                        <Power className={`mr-2 h-4 w-4 ${tenant.status === 'ACTIVE' ? 'text-red-400' : 'text-emerald-400'}`} />
                        {tenant.status === 'ACTIVE' ? 'Suspend Tenant' : 'Activate Tenant'}
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={() => setDomainDialogOpen(true)} className="cursor-pointer focus:bg-slate-900">
                        <Globe className="mr-2 h-4 w-4 text-emerald-400" />
                        Manage Custom Domain
                    </DropdownMenuItem>

                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger className="cursor-pointer focus:bg-slate-900">
                            <Crown className="mr-2 h-4 w-4 text-amber-400" />
                            Change Plan
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="bg-slate-950 border-slate-800 text-slate-200 font-sans">
                            {plans.map(plan => (
                                <DropdownMenuItem
                                    key={plan.id}
                                    onClick={async () => {
                                        setLoading(true)
                                        const res = await (import('./actions').then(m => m.changeTenantPlan(tenant.id, plan.id)))
                                        if (res.success) toast.success(`Switched to ${plan.name}`)
                                        else toast.error(res.error)
                                        setLoading(false)
                                    }}
                                    className="cursor-pointer"
                                >
                                    {plan.name}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuSubContent>
                    </DropdownMenuSub>

                    <DropdownMenuSeparator className="bg-slate-800" />

                    <DropdownMenuItem
                        onClick={handleDelete}
                        className="cursor-pointer focus:bg-red-500/10 text-red-400"
                        disabled={tenant.slug === 'fts'}
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Tenant
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <CustomDomainDialog
                tenant={tenant}
                open={domainDialogOpen}
                onOpenChange={setDomainDialogOpen}
            />
        </div>
    )
}
