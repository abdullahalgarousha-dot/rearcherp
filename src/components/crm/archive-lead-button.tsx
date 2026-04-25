"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Archive } from "lucide-react"
import { updateLeadStatus } from "@/app/admin/crm/leads/actions"

export function ArchiveLeadButton({ leadId }: { leadId: string }) {
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    async function handleArchive() {
        if (!confirm('Archive this lead? Their proposal history will be preserved.')) return
        setLoading(true)
        await updateLeadStatus(leadId, 'ARCHIVED')
        setLoading(false)
        router.refresh()
    }

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={handleArchive}
            disabled={loading}
            className="rounded-xl text-muted-foreground hover:text-destructive hover:border-destructive"
        >
            <Archive className="w-4 h-4 mr-2" />
            {loading ? 'Archiving…' : 'Archive Lead'}
        </Button>
    )
}
