import { db } from "@/lib/db"
import { Building2, Shield, Search, MoreVertical } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { OnboardTenantDialog } from "../onboard-tenant-dialog"
import { getAllPlans } from "../actions"
import { ResetDemoButton } from "../reset-demo-button"
import { TenantActions } from "../tenant-actions"
import { auth } from "@/auth"
import { redirect } from "next/navigation"

export default async function TenantsPage() {
    const session = await auth()
    if ((session?.user as any)?.role !== 'GLOBAL_SUPER_ADMIN') {
        redirect('/super-login?access=secure')
    }

    const tenants = await (db as any).tenant.findMany({
        include: {
            _count: {
                select: {
                    users: true,
                    projects: true
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    })

    const plans = await getAllPlans()

    const totalUsers = tenants.reduce((acc: number, t: any) => acc + t._count.users, 0)

    return (
        <div className="space-y-8 w-full">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Tenant Management</h1>
                    <p className="text-slate-400">Manage all registered engineering firms on the REARCH platform.</p>
                </div>
                <div className="flex gap-3">
                    <ResetDemoButton />
                    <OnboardTenantDialog plans={plans} />
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-slate-400">Total Tenants</p>
                            <h3 className="text-4xl font-black text-white mt-2">{tenants.length}</h3>
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-blue-400" />
                        </div>
                    </div>
                </div>
                <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-slate-400">Total Users</p>
                            <h3 className="text-4xl font-black text-white mt-2">{totalUsers}</h3>
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                            <Shield className="h-5 w-5 text-purple-400" />
                        </div>
                    </div>
                </div>
                <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-slate-400">Platform Health</p>
                            <h3 className="text-4xl font-black text-white mt-2">100%</h3>
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                            <span className="font-bold text-emerald-400">OK</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tenants List */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden w-full">
                <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900">
                    <div className="relative w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search tenants by name or slug..."
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                        />
                    </div>
                </div>

                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-slate-800 bg-slate-900/30 text-xs font-semibold uppercase tracking-wider text-slate-500">
                            <th className="px-6 py-4">Company</th>
                            <th className="px-6 py-4">Slug</th>
                            <th className="px-6 py-4">Tier</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Usage</th>
                            <th className="px-6 py-4 text-center">Licence</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                        {tenants.map((tenant: any) => (
                            <tr key={tenant.id} className="hover:bg-slate-800/20 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="font-bold text-slate-200">{tenant.name}</div>
                                    <div className="text-xs text-slate-500 mt-1">{tenant.id}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="font-mono text-sm px-2 py-1 rounded bg-slate-950 border border-slate-800 text-slate-400">
                                        {tenant.slug}.rearch.sa
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <Badge variant="outline" className={`
                                        bg-transparent border ${tenant.subscriptionTier === 'ENTERPRISE' ? 'border-purple-500/30 text-purple-400' :
                                            tenant.subscriptionTier === 'PROFESSIONAL' ? 'border-blue-500/30 text-blue-400' :
                                                'border-slate-700 text-slate-400'
                                        }
                                    `}>
                                        {tenant.subscriptionTier}
                                    </Badge>
                                </td>
                                <td className="px-6 py-4">
                                    <Badge className={`
                                        border-0 ${tenant.status === 'ACTIVE'
                                            ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                                            : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                                        }
                                    `}>
                                        {tenant.status}
                                    </Badge>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="text-sm text-slate-300"><span className="font-bold">{tenant._count.users}</span> users</div>
                                    <div className="text-xs text-slate-500 mt-0.5"><span className="font-medium">{tenant._count.projects}</span> projects</div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className="text-xs text-slate-300">
                                        {tenant.subscriptionStart ? new Date(tenant.subscriptionStart).toLocaleDateString() : 'N/A'}
                                    </div>
                                    <div className={`text-[10px] mt-1 ${tenant.subscriptionEnd && new Date(tenant.subscriptionEnd) < new Date()
                                        ? 'text-red-400'
                                        : 'text-slate-500'
                                        }`}>
                                        Ends: {tenant.subscriptionEnd ? new Date(tenant.subscriptionEnd).toLocaleDateString() : 'Lifetime'}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <TenantActions tenant={tenant} plans={plans} />
                                </td>
                            </tr>
                        ))}
                        {tenants.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-6 py-12 text-center text-slate-500 italic">
                                    No tenants found. Onboard your first tenant to get started.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
