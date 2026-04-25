import { Suspense } from "react"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { NewLeadDialog } from "@/components/crm/new-lead-dialog"
import {
    TrendingUp, Users, CheckCircle2, Archive, ArrowRight,
    Building2, Phone, Mail, FileText
} from "lucide-react"

const STATUS_COLORS: Record<string, string> = {
    ACTIVE: 'bg-blue-100 text-blue-700',
    CONVERTED: 'bg-emerald-100 text-emerald-700',
    ARCHIVED: 'bg-slate-100 text-slate-500',
}

const PROPOSAL_COLORS: Record<string, string> = {
    DRAFT: 'bg-slate-100 text-slate-600',
    SENT: 'bg-blue-100 text-blue-700',
    REVISION: 'bg-amber-100 text-amber-700',
    ACCEPTED: 'bg-emerald-100 text-emerald-700',
    REJECTED: 'bg-red-100 text-red-600',
}

export default async function SalesLeadsPage() {
    const session = await auth()
    const user = session?.user as any
    if (!user) return redirect('/login')

    const tenantId = user.tenantId as string
    const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'GLOBAL_SUPER_ADMIN', 'ACCOUNTANT', 'CEO'].includes(user.role)

    const [leads, brands] = await Promise.all([
        (db as any).lead.findMany({
            where: { tenantId },
            orderBy: { createdAt: 'desc' },
            include: {
                brand: { select: { id: true, nameEn: true, shortName: true } },
                proposals: {
                    include: { revisions: { orderBy: { revNumber: 'desc' }, take: 1 } }
                }
            }
        }),
        (db as any).brand.findMany({
            where: { tenantId },
            select: { id: true, nameEn: true, shortName: true }
        })
    ])

    const serializedLeads = JSON.parse(JSON.stringify(leads))
    const serializedBrands = JSON.parse(JSON.stringify(brands))

    // ── KPIs ──────────────────────────────────────────────────────────────
    const totalLeads = serializedLeads.length
    const activeLeads = serializedLeads.filter((l: any) => l.status === 'ACTIVE').length
    const convertedLeads = serializedLeads.filter((l: any) => l.status === 'CONVERTED').length
    const archivedLeads = serializedLeads.filter((l: any) => l.status === 'ARCHIVED').length

    // ── Funnel: all proposals across all leads ─────────────────────────────
    const allProposals = serializedLeads.flatMap((l: any) => l.proposals)
    const funnel = {
        DRAFT: allProposals.filter((p: any) => p.currentStatus === 'DRAFT').length,
        SENT: allProposals.filter((p: any) => p.currentStatus === 'SENT').length,
        REVISION: allProposals.filter((p: any) => p.currentStatus === 'REVISION').length,
        ACCEPTED: allProposals.filter((p: any) => p.currentStatus === 'ACCEPTED').length,
        REJECTED: allProposals.filter((p: any) => p.currentStatus === 'REJECTED').length,
    }

    // ── Brand Analytics ───────────────────────────────────────────────────
    const brandStats = serializedBrands.map((brand: any) => {
        const brandLeads = serializedLeads.filter((l: any) => l.brandId === brand.id)
        const brandProposals = brandLeads.flatMap((l: any) => l.proposals)
        const accepted = brandProposals.filter((p: any) => p.currentStatus === 'ACCEPTED')
        const rejected = brandProposals.filter((p: any) => p.currentStatus === 'REJECTED')
        const pipeline = brandProposals
            .filter((p: any) => ['SENT', 'REVISION', 'ACCEPTED'].includes(p.currentStatus))
            .reduce((sum: number, p: any) => sum + (p.revisions[0]?.totalAmount || 0), 0)
        const winRate = (accepted.length + rejected.length) > 0
            ? Math.round((accepted.length / (accepted.length + rejected.length)) * 100)
            : null
        return {
            ...brand,
            activeLeads: brandLeads.filter((l: any) => l.status === 'ACTIVE').length,
            totalProposals: brandProposals.length,
            pipeline,
            winRate,
        }
    }).filter((b: any) => b.totalProposals > 0 || b.activeLeads > 0)

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-4xl font-bold tracking-tight text-primary">Sales & Leads</h2>
                    <p className="text-muted-foreground mt-1">Track proposals, manage leads, and monitor brand performance</p>
                </div>
                <NewLeadDialog brands={serializedBrands} />
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Leads', value: totalLeads, icon: Users, color: 'text-blue-600 bg-blue-50' },
                    { label: 'Active', value: activeLeads, icon: TrendingUp, color: 'text-indigo-600 bg-indigo-50' },
                    { label: 'Converted', value: convertedLeads, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
                    { label: 'Archived', value: archivedLeads, icon: Archive, color: 'text-slate-500 bg-slate-50' },
                ].map(kpi => (
                    <Card key={kpi.label} className="border-none shadow-sm">
                        <CardContent className="p-5 flex items-center gap-4">
                            <div className={`p-3 rounded-2xl ${kpi.color}`}>
                                <kpi.icon className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{kpi.value}</p>
                                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Sales Funnel */}
                <Card className="border-none shadow-sm lg:col-span-1">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-semibold">Proposal Funnel</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {[
                            { key: 'DRAFT', label: 'Draft', color: 'bg-slate-200' },
                            { key: 'SENT', label: 'Sent', color: 'bg-blue-400' },
                            { key: 'REVISION', label: 'Revision', color: 'bg-amber-400' },
                            { key: 'ACCEPTED', label: 'Accepted', color: 'bg-emerald-500' },
                            { key: 'REJECTED', label: 'Rejected', color: 'bg-red-400' },
                        ].map(stage => {
                            const count = funnel[stage.key as keyof typeof funnel]
                            const max = Math.max(...Object.values(funnel), 1)
                            const pct = Math.round((count / max) * 100)
                            return (
                                <div key={stage.key} className="space-y-1">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">{stage.label}</span>
                                        <span className="font-bold">{count}</span>
                                    </div>
                                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                                        <div className={`h-full ${stage.color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                                    </div>
                                </div>
                            )
                        })}
                    </CardContent>
                </Card>

                {/* Brand Analytics */}
                {brandStats.length > 0 && (
                    <Card className="border-none shadow-sm lg:col-span-2">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-semibold">Brand Performance</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-muted-foreground text-xs uppercase tracking-wider border-b">
                                            <th className="text-left pb-2">Brand</th>
                                            <th className="text-center pb-2">Active Leads</th>
                                            <th className="text-center pb-2">Proposals</th>
                                            <th className="text-right pb-2">Pipeline (SAR)</th>
                                            <th className="text-right pb-2">Win Rate</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {brandStats.map((b: any) => (
                                            <tr key={b.id} className="hover:bg-muted/30 transition-colors">
                                                <td className="py-2.5 font-semibold">{b.nameEn}</td>
                                                <td className="py-2.5 text-center">{b.activeLeads}</td>
                                                <td className="py-2.5 text-center">{b.totalProposals}</td>
                                                <td className="py-2.5 text-right font-mono">
                                                    {b.pipeline.toLocaleString()}
                                                </td>
                                                <td className="py-2.5 text-right">
                                                    {b.winRate !== null ? (
                                                        <span className={`font-bold ${b.winRate >= 50 ? 'text-emerald-600' : 'text-red-500'}`}>
                                                            {b.winRate}%
                                                        </span>
                                                    ) : <span className="text-muted-foreground">—</span>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Leads List */}
            <div className="space-y-3">
                <h3 className="text-lg font-semibold">All Leads</h3>
                {serializedLeads.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed text-muted-foreground">
                        <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p className="font-medium">No leads yet.</p>
                        <p className="text-sm mt-1">Create your first lead to get started.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {serializedLeads.map((lead: any) => {
                            const latestProposal = lead.proposals.sort((a: any, b: any) =>
                                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                            )[0]
                            const latestAmount = latestProposal?.revisions[0]?.totalAmount

                            return (
                                <Link href={`/admin/crm/leads/${lead.id}`} key={lead.id} className="group">
                                    <Card className="h-full hover:shadow-lg transition-all duration-200 border-none bg-white shadow-sm hover:-translate-y-0.5 relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-violet-500 to-indigo-600" />
                                        <CardContent className="p-4 space-y-3">
                                            <div className="flex justify-between items-start">
                                                <Badge className={`text-xs font-semibold ${STATUS_COLORS[lead.status] || 'bg-slate-100'}`}>
                                                    {lead.status}
                                                </Badge>
                                                <span className="text-xs text-muted-foreground">{lead.brand?.nameEn}</span>
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800 group-hover:text-primary transition-colors">{lead.name}</p>
                                                {lead.company && <p className="text-sm text-muted-foreground">{lead.company}</p>}
                                            </div>
                                            <div className="text-xs text-muted-foreground space-y-1">
                                                {lead.phone && <div className="flex items-center gap-1.5"><Phone className="w-3 h-3" />{lead.phone}</div>}
                                                {lead.email && <div className="flex items-center gap-1.5"><Mail className="w-3 h-3" />{lead.email}</div>}
                                            </div>
                                            <div className="flex justify-between items-center pt-1 border-t border-slate-50">
                                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                    <FileText className="w-3 h-3" />
                                                    {lead.proposals.length} proposal{lead.proposals.length !== 1 ? 's' : ''}
                                                </div>
                                                {latestAmount > 0 && (
                                                    <span className="text-xs font-bold text-slate-700">
                                                        {Number(latestAmount).toLocaleString()} SAR
                                                    </span>
                                                )}
                                                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-primary transition-colors" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
