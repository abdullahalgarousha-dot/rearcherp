"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, Cloud, RefreshCw, ExternalLink, ShieldAlert } from "lucide-react"
import { getProjectFinancialDocuments } from "@/app/admin/projects/actions"

export function FinancialDocumentsTab({ projectId }: { projectId: string }) {
    const [files, setFiles] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    async function loadFiles() {
        setLoading(true)
        setError(null)
        const res = await getProjectFinancialDocuments(projectId)
        if (res.error) {
            setError(res.error)
        } else {
            setFiles(res.files || [])
        }
        setLoading(false)
    }

    useEffect(() => {
        loadFiles()
    }, [projectId])

    if (error === "Unauthorized") {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-red-50/50 rounded-2xl border border-red-100">
                <ShieldAlert className="h-12 w-12 text-red-300 mb-4" />
                <p className="text-red-600 font-bold">غير مصرح لك بالوصول إلى الوثائق المالية</p>
            </div>
        )
    }

    return (
        <Card className="border-none shadow-lg bg-white/60 backdrop-blur-xl">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                    <Cloud className="h-5 w-5 text-primary" />
                    أرشيف الوثائق المالية (Google Drive)
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={loadFiles} disabled={loading} className="gap-2">
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    تحديث
                </Button>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex justify-center items-center py-12">
                        <RefreshCw className="h-8 w-8 animate-spin text-primary/20" />
                    </div>
                ) : files.length > 0 ? (
                    <div className="space-y-2">
                        {files.map((file) => (
                            <div key={file.id} className="flex items-center justify-between p-4 rounded-xl bg-white/50 border border-white/20 hover:bg-white/80 transition-all group">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                                        <FileText className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm text-gray-800">{file.name}</p>
                                        <p className="text-[10px] text-muted-foreground">
                                            {new Date(file.createdTime).toLocaleDateString()} • {(parseInt(file.size) / 1024 / 1024).toFixed(2)} MB
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button asChild variant="ghost" size="sm" className="h-8 text-primary">
                                        <a href={`/api/files/download?fileId=${file.id}&type=FINANCE`} target="_blank" rel="noopener noreferrer">
                                            <ExternalLink className="h-4 w-4 mr-1" />
                                            فتح
                                        </a>
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                        <Cloud className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                        <p className="text-muted-foreground text-sm">لا توجد وثائق مالية مؤرشفة حتى الآن.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
