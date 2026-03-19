"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, FolderOpen, ExternalLink, Cloud, RefreshCw } from "lucide-react"
import { useState, useEffect } from "react"
import { generateDriveLinkForProject, getProjectLiveFiles } from "@/app/admin/projects/actions"

export function ProjectFilesTab({ projectId, driveLink, driveFolderId }: { projectId: string, driveLink?: string | null, driveFolderId?: string | null }) {
    const [isGenerating, setIsGenerating] = useState(false)

    const handleGenerateDrive = async () => {
        setIsGenerating(true)
        const res = await generateDriveLinkForProject(projectId)
        if (res.error) {
            alert("خطأ: " + res.error)
        } else {
            alert("تم إنشاء وربط مجلد Google Drive بنجاح!")
            // Optionally, page can be reloaded to reflect new state:
            // window.location.reload()
        }
        setIsGenerating(false)
    }

    const [files, setFiles] = useState<any[]>([])
    const [isLoadingFiles, setIsLoadingFiles] = useState(false)

    useEffect(() => {
        if (!driveLink || driveFolderId?.startsWith('mock_')) return;

        setIsLoadingFiles(true)
        getProjectLiveFiles(projectId).then(res => {
            if (res.success && res.files) {
                setFiles(res.files)
            }
        }).finally(() => {
            setIsLoadingFiles(false)
        })
    }, [projectId, driveLink, driveFolderId])

    return (
        <Card className="border-none shadow-lg bg-white/60 backdrop-blur-xl">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                    <FolderOpen className="h-5 w-5 text-primary" />
                    ملفات المشروع
                </CardTitle>
                {(!driveLink || driveFolderId?.startsWith('mock_')) && (
                    <Button onClick={handleGenerateDrive} disabled={isGenerating} size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg">
                        <RefreshCw className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
                        {isGenerating ? "جاري الإنشاء..." : "إنشاء وربط مجلد قوقل درايف"}
                    </Button>
                )}
            </CardHeader>
            <CardContent>
                <div className="space-y-1">
                    {isLoadingFiles ? (
                        <div className="text-center py-6 text-slate-400 animate-pulse">جاري جلب الملفات من قوقل درايف...</div>
                    ) : (
                        files.map((file, idx) => (
                            <div key={file.id || idx} className="flex items-center justify-between p-3 rounded-xl bg-white/50 hover:bg-white/80 transition-colors border border-transparent hover:border-primary/10 group">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                                        <FileText className="h-5 w-5" />
                                    </div>
                                    <div className="flex flex-col">
                                        <a href={file.link} target="_blank" rel="noopener noreferrer" className="font-bold text-sm text-gray-800 hover:text-primary transition-colors">
                                            {file.name}
                                        </a>
                                        <p className="text-[10px] text-muted-foreground">{file.size} • {file.date} • {file.type}</p>
                                    </div>
                                </div>
                                <Button asChild variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <a href={file.link} target="_blank" rel="noopener noreferrer">
                                        Open
                                    </a>
                                </Button>
                            </div>
                        ))
                    )}

                    {!isLoadingFiles && files.length === 0 && driveLink && !driveFolderId?.startsWith('mock_') && (
                        <div className="text-center py-6 text-slate-400">لا توجد ملفات حديثة في المجلد الجذري لهذا المشروع.</div>
                    )}
                </div>

                {(!driveLink || driveFolderId?.startsWith('mock_')) && (
                    <div className="mt-8 text-center p-8 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                        <Cloud className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                        <p className="text-muted-foreground text-sm font-bold">هذا المشروع غير مربوط بمجلد حقيقي على قوقل درايف.</p>
                        <p className="text-xs text-gray-400 mt-1">اضغط على زر "إنشاء وربط" بالأعلى لتوليد مسار المشروع السحابي.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
