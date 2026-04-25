import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BackButton } from "@/components/ui/back-button"
import { NewProposalDialog } from "@/components/crm/new-proposal-dialog"
import { ProposalCard } from "@/components/crm/proposal-card"
import { ArchiveLeadButton } from "@/components/crm/archive-lead-button"
import { Building2, Mail, Phone, Calendar, FolderOpen } from "lucide-react"

const STATUS_COLORS: Record<string, string> = {
    ACTIVE: 'bg-blue-100 text-blue-700 border-blue-200',
    CONVERTED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    ARCHIVED: 'bg-slate-100 text-slate-500 border-slate-200',
}

export default async function LeadDetailPage({
    params,
}: {
    params: Promise<{ leadId: string }>
}) {
    const session = await auth()
    const user = session?.user as any
    if (!user) return redirect('/login')

    const { leadId } = await params
    const tenantId = user.tenantId as string

    const leadRaw = await (db as any).lead.findUnique({
        where: { id: leadId, tenantId },
        include: {
            brand: { select: { id: true, nameEn: true, shortName: true } },
            proposals: {
                orderBy: { createdAt: 'desc' },
                include: {
                    brand: { select: { id: true, nameEn: true } },
                    revisions: { orderBy: { revNumber: 'asc' } }
                }
            }
        }
    })

    if (!leadRaw) return notFound()

    const lead = JSON.parse(JSON.stringify(leadRaw))
    const canEdit = ['ADMIN', 'SUPER_ADMIN', 'GLOBAL_SUPER_ADMIN', 'ACCOUNTANT', 'CEO'].includes(user.role)

    return (
        <div className="space-y-6">
            <BackButton />

            {/* Lead Header */}
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold tracking-tight">{lead.name}</h1>
                        <Badge className={`text-xs font-semibold border ${STATUS_COLORS[lead.status] || ''}`}>
                            {lead.status}
                        </Badge>
                    </div>
                    {lead.company && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Building2 className="w-4 h-4" />
                            <span>{lead.company}</span>
                        </div>
                    )}
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        {lead.email && (
                            <div className="flex items-center gap-1.5">
                                <Mail className="w-3.5 h-3.5" />
                                <span>{lead.email}</span>
                            </div>
                        )}
                        {lead.phone && (
                            <div className="flex items-center gap-1.5">
                                <Phone className="w-3.5 h-3.5" />
                                <span>{lead.phone}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Added {new Date(lead.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="font-medium text-foreground">{lead.brand?.nameEn}</span>
                        </div>
                        {lead.driveFolderId && (
                            <a
                                href={`https://drive.google.com/drive/folders/${lead.driveFolderId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-blue-600 hover:underline"
                            >
                                <FolderOpen className="w-3.5 h-3.5" />
                                <span>Drive Folder</span>
                            </a>
                        )}
                    </div>
                    {lead.notes && (
                        <p className="text-sm text-muted-foreground bg-muted/50 rounded-xl px-3 py-2 max-w-xl">{lead.notes}</p>
                    )}
                </div>

                {canEdit && lead.status === 'ACTIVE' && (
                    <div className="flex gap-2 shrink-0">
                        <ArchiveLeadButton leadId={lead.id} />
                    </div>
                )}
            </div>

            {/* Proposals Section */}
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold">
                        Proposals
                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                            ({lead.proposals.length})
                        </span>
                    </h2>
                    {canEdit && lead.status !== 'ARCHIVED' && (
                        <NewProposalDialog leadId={lead.id} brandId={lead.brandId} brandName={lead.brand?.nameEn} />
                    )}
                </div>

                {lead.proposals.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-3xl border border-dashed text-muted-foreground">
                        <p className="font-medium">No proposals yet.</p>
                        <p className="text-sm mt-1">Create a proposal for this lead to start tracking versions.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {lead.proposals.map((proposal: any) => (
                            <ProposalCard
                                key={proposal.id}
                                proposal={proposal}
                                leadId={lead.id}
                                canEdit={canEdit && lead.status !== 'ARCHIVED'}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
