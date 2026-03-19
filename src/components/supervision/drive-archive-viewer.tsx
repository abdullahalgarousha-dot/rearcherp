"use client"

import { useState, useEffect } from "react"
import { listDriveFiles } from "@/lib/google-drive" // This will need a server component wrapper or action
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileIcon, ImageIcon, ExternalLink, Eye, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ActionExportButton } from "@/components/common/ActionExportButton"

export function DriveArchiveViewer({ folderId }: { folderId: string }) {
    const [files, setFiles] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedFile, setSelectedFile] = useState<string | null>(null)

    async function loadFiles() {
        setLoading(true)
        try {
            // Since this is client-side, we need a server action to call listDriveFiles
            const res = await fetch(`/api/drive/list?folderId=${folderId}`)
            const data = await res.json()
            setFiles(data.files || [])
        } catch (e) {
            console.error(e)
        }
        setLoading(false)
    }

    useEffect(() => {
        if (folderId) loadFiles()
    }, [folderId])

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="border-none shadow-xl bg-white rounded-[2rem] overflow-hidden">
                <CardHeader className="bg-slate-900 justify-between flex flex-row items-center text-white p-6">
                    <CardTitle className="text-sm font-bold flex items-center gap-3">
                        <FileIcon className="h-5 w-5 text-emerald-400" />
                        Project Archive | أرشيف المشروع
                    </CardTitle>
                    <Button variant="ghost" size="icon" onClick={loadFiles} className="text-white hover:bg-white/10">
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </CardHeader>
                <CardContent className="p-4 max-h-[600px] overflow-y-auto">
                    {loading ? (
                        <div className="py-20 text-center animate-pulse text-slate-300 font-bold italic uppercase">Loading Archive...</div>
                    ) : files.length === 0 ? (
                        <div className="py-20 text-center text-slate-300 font-bold italic uppercase">No files archived yet.</div>
                    ) : (
                        <div className="space-y-2">
                            {files.map(file => (
                                <div
                                    key={file.id}
                                    onClick={() => setSelectedFile(file.id)}
                                    className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all ${selectedFile === file.id ? 'bg-primary text-white' : 'bg-slate-50 hover:bg-slate-100 text-slate-700'}`}
                                >
                                    <div className="flex items-center gap-4">
                                        {file.mimeType.includes("image") ? <ImageIcon className="h-5 w-5 opacity-50" /> : <FileIcon className="h-5 w-5 opacity-50" />}
                                        <div className="flex flex-col">
                                            <span className="text-sm font-black truncate max-w-[200px]">{file.name}</span>
                                            <span className="text-[10px] opacity-70 uppercase font-bold">{new Date(file.createdTime).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Eye className="h-4 w-4" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="border-none shadow-2xl bg-white rounded-[2rem] overflow-hidden min-h-[650px] flex flex-col">
                <CardHeader className="bg-slate-100 p-6 border-b flex flex-row justify-between items-center">
                    <CardTitle className="text-sm font-bold text-slate-600 flex items-center gap-3">
                        <Eye className="h-5 w-5 text-primary" />
                        Preview | معاينة المستند
                    </CardTitle>
                    {selectedFile && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="rounded-xl font-bold"
                            onClick={() => window.open(`https://drive.google.com/file/d/${selectedFile}/view`, '_blank')}
                        >
                            <ExternalLink className="h-4 w-4 mr-2" /> Open in Drive
                        </Button>
                    )}
                </CardHeader>
                <CardContent className="flex-grow p-0 relative">
                    {selectedFile ? (
                        <iframe
                            src={`https://docs.google.com/viewer?srcid=${selectedFile}&pid=explorer&efp=true&a=v&chrome=false&embedded=true`}
                            className="absolute inset-0 w-full h-full border-none"
                            title="File Preview"
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-300 font-black uppercase italic p-10 text-center">
                            <Eye className="h-20 w-20 mb-4 opacity-10" />
                            Select a file to preview<br />اختر ملفاً للمعاينة
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
