"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw, Cloud } from "lucide-react"
import { generateDriveLinkForProject } from "@/app/admin/projects/actions"

export function DriveSyncButton({
    projectId,
    isLinked
}: {
    projectId: string
    isLinked: boolean
}) {
    const [isGenerating, setIsGenerating] = useState(false)

    if (isLinked) return null; // Don't show if already linked

    const handleGenerateDrive = async () => {
        setIsGenerating(true)
        const res = await generateDriveLinkForProject(projectId)
        if (res.error) {
            alert("خطأ: " + res.error)
        } else {
            alert("تم إنشاء وربط مجلد Google Drive بنجاح!")
            window.location.reload()
        }
        setIsGenerating(false)
    }

    return (
        <Button
            onClick={handleGenerateDrive}
            disabled={isGenerating}
            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-md animate-pulse"
        >
            <RefreshCw className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
            {isGenerating ? "جاري الإنشاء..." : "إنشاء مجلد Google Drive"}
        </Button>
    )
}
