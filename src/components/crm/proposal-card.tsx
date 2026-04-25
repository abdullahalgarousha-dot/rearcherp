"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
import { ExternalLink, Plus, CheckCircle2, Paperclip, X } from "lucide-react"
import { addProposalRevision, updateProposalStatus, convertToProject } from "@/app/admin/crm/leads/actions"

const STATUS_COLORS: Record<string, string> = {
    DRAFT: 'bg-slate-100 text-slate-600',
    SENT: 'bg-blue-100 text-blue-700',
    REVISION: 'bg-amber-100 text-amber-700',
    ACCEPTED: 'bg-emerald-100 text-emerald-700',
    REJECTED: 'bg-red-100 text-red-600',
}

const STATUSES = ['DRAFT', 'SENT', 'REVISION', 'ACCEPTED', 'REJECTED']

function AddRevisionDialog({ proposalId, leadId }: { proposalId: string; leadId: string }) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const router = useRouter()

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        setSelectedFile(e.target.files?.[0] ?? null)
    }

    function clearFile() {
        setSelectedFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setError(null)
        const fd = new FormData(e.currentTarget)
        fd.set('proposalId', proposalId)
        fd.set('leadId', leadId)
        if (selectedFile) {
            fd.set('pdfFile', selectedFile)
        }
        setLoading(true)
        const res = await addProposalRevision(fd)
        setLoading(false)
        if (res.error) { setError(res.error); return }
        setOpen(false)
        setSelectedFile(null)
        router.refresh()
    }

    function handleOpenChange(v: boolean) {
        setOpen(v)
        if (!v) { setError(null); setSelectedFile(null) }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="rounded-lg text-xs h-7 px-2">
                    <Plus className="w-3 h-3 mr-1" /> Add Revision
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
                <DialogHeader><DialogTitle>Upload New Revision</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                        <Label>Total Amount (SAR) *</Label>
                        <Input name="totalAmount" type="number" min={0} required placeholder="150000" className="rounded-xl" />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Revision PDF</Label>
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="rounded-xl h-9 px-3 text-xs flex-1 justify-start font-normal text-muted-foreground truncate"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Paperclip className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                                <span className="truncate">
                                    {selectedFile ? selectedFile.name : 'Choose PDF…'}
                                </span>
                            </Button>
                            {selectedFile && (
                                <button type="button" onClick={clearFile} className="text-muted-foreground hover:text-destructive">
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="application/pdf"
                            className="hidden"
                            onChange={handleFileChange}
                        />
                        {selectedFile && (
                            <p className="text-xs text-muted-foreground truncate">
                                {(selectedFile.size / 1024).toFixed(0)} KB
                            </p>
                        )}
                    </div>
                    <div className="space-y-1.5">
                        <Label>Change Notes</Label>
                        <Textarea name="notes" placeholder="What changed in this revision?" className="rounded-xl" rows={2} />
                    </div>
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    <DialogFooter>
                        <Button type="submit" disabled={loading} className="rounded-xl w-full font-bold">
                            {loading ? 'Uploading…' : 'Upload Revision'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

export function ProposalCard({
    proposal, leadId, canEdit
}: {
    proposal: any
    leadId: string
    canEdit: boolean
}) {
    const [loading, setLoading] = useState(false)
    const [convertLoading, setConvertLoading] = useState(false)
    const router = useRouter()
    const latestRev = proposal.revisions[proposal.revisions.length - 1]

    async function handleStatusChange(status: string) {
        setLoading(true)
        await updateProposalStatus(proposal.id, status)
        setLoading(false)
        router.refresh()
    }

    async function handleConvert() {
        if (!confirm('Convert this proposal to a live project? This will create a Client and Project record.')) return
        setConvertLoading(true)
        const res = await convertToProject(proposal.id)
        setConvertLoading(false)
        if (res.error) { alert(res.error); return }
        alert(`Project created: ${res.projectCode}`)
        router.push(`/admin/projects`)
    }

    return (
        <Card className="border-none shadow-sm bg-white">
            <CardHeader className="pb-3">
                <div className="flex justify-between items-start gap-2">
                    <div className="space-y-0.5 flex-1">
                        <p className="font-semibold text-slate-800">{proposal.title}</p>
                        <p className="text-xs text-muted-foreground">
                            {new Date(proposal.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                            {' · '}{proposal.revisions.length} revision{proposal.revisions.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {canEdit ? (
                            <Select
                                value={proposal.currentStatus}
                                onValueChange={handleStatusChange}
                                disabled={loading}
                            >
                                <SelectTrigger className={`h-7 text-xs font-semibold rounded-full border-0 w-28 ${STATUS_COLORS[proposal.currentStatus]}`}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {STATUSES.map(s => (
                                        <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <Badge className={`text-xs ${STATUS_COLORS[proposal.currentStatus]}`}>
                                {proposal.currentStatus}
                            </Badge>
                        )}
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Latest Amount */}
                {latestRev && (
                    <div className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-2.5">
                        <span className="text-sm text-muted-foreground">Current Value</span>
                        <span className="font-bold text-lg text-slate-800">
                            {Number(latestRev.totalAmount).toLocaleString()} SAR
                        </span>
                    </div>
                )}

                {/* Revision Timeline */}
                {proposal.revisions.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Revision History</p>
                        <div className="space-y-1.5">
                            {proposal.revisions.map((rev: any) => (
                                <div
                                    key={rev.id}
                                    className="flex items-center justify-between text-sm bg-muted/40 rounded-xl px-3 py-2"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-xs font-bold bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">
                                            Rev {rev.revNumber}
                                        </span>
                                        {rev.notes && (
                                            <span className="text-muted-foreground text-xs truncate max-w-[160px]">{rev.notes}</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="font-semibold text-slate-700">
                                            {Number(rev.totalAmount).toLocaleString()} SAR
                                        </span>
                                        {rev.fileUrl && (
                                            <a
                                                href={rev.fileUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:text-blue-700"
                                            >
                                                <ExternalLink className="w-3.5 h-3.5" />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Actions */}
                {canEdit && (
                    <div className="flex gap-2 pt-1">
                        <AddRevisionDialog proposalId={proposal.id} leadId={leadId} />
                        {proposal.currentStatus === 'ACCEPTED' && (
                            <Button
                                size="sm"
                                onClick={handleConvert}
                                disabled={convertLoading}
                                className="rounded-lg text-xs h-7 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                            >
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                {convertLoading ? 'Converting…' : 'Convert to Project'}
                            </Button>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
