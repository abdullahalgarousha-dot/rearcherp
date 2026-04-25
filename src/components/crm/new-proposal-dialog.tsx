"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Paperclip, X } from "lucide-react"
import { createProposal } from "@/app/admin/crm/leads/actions"

export function NewProposalDialog({
    leadId, brandId, brandName
}: {
    leadId: string
    brandId: string
    brandName: string
}) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const router = useRouter()

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0] ?? null
        setSelectedFile(file)
    }

    function clearFile() {
        setSelectedFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setError(null)
        const fd = new FormData(e.currentTarget)
        // Inject hidden fields not in the native form fields
        fd.set('leadId', leadId)
        fd.set('brandId', brandId)
        if (selectedFile) {
            fd.set('pdfFile', selectedFile)
        }
        setLoading(true)
        const res = await createProposal(fd)
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
                <Button variant="outline" className="rounded-xl font-bold">
                    <Plus className="w-4 h-4 mr-2" /> New Proposal
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>New Proposal — {brandName}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="title">Proposal Title *</Label>
                        <Input id="title" name="title" placeholder="Architectural Design Services" required className="rounded-xl" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="initialAmount">Initial Amount (SAR)</Label>
                            <Input id="initialAmount" name="initialAmount" type="number" min={0} placeholder="0" className="rounded-xl" />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Proposal PDF</Label>
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
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea id="notes" name="notes" placeholder="Scope, terms…" className="rounded-xl" rows={2} />
                    </div>
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    <DialogFooter>
                        <Button type="submit" disabled={loading} className="rounded-xl w-full font-bold">
                            {loading ? 'Creating…' : 'Create Proposal'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
