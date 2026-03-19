"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Upload, FileType2 } from "lucide-react"
import { finalizeDirectUpload } from "@/app/admin/projects/[projectId]/document-actions"
import { toast } from "sonner"

export function UploadRevisionDialog({ projectId }: { projectId: string }) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [progress, setProgress] = useState(0)
    const [file, setFile] = useState<File | null>(null)
    const [fileCategory, setFileCategory] = useState("CAD")

    // Map Categories to Accept headers for the Dropzone
    const getAcceptTypes = () => {
        switch (fileCategory) {
            case "REVIT": return ".rvt,.rfa"
            case "CAD": return ".dwg,.dxf"
            case "PRESENTATION": return ".pdf,.ppt,.pptx"
            case "RENDER": return ".jpg,.jpeg,.png,.mp4"
            default: return "*"
        }
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (!file) return toast.error("Please select a file to upload")

        setLoading(true)
        setProgress(10)
        const formData = new FormData(e.currentTarget)
        const drawingCode = formData.get("drawingCode") as string
        const title = formData.get("title") as string
        const discipline = formData.get("discipline") as string
        const changeReason = formData.get("changeReason") as string

        try {
            // 1. Get Resumable URI from our NextJS Backend
            const initRes = await fetch("/api/drive/upload", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    projectId,
                    fileName: file.name,
                    mimeType: file.type || "application/octet-stream"
                })
            })
            const initData = await initRes.json()
            if (!initRes.ok) throw new Error(initData.error || "Failed to initialize upload session")

            const { uploadUrl } = initData
            setProgress(30)

            // 2. Direct-to-Drive Upload (Bypassing NextJS Payload Limits)
            // Note: For truly massive files, XMLHttpRequest can be used for byte-level progress.
            // Here we use fetch for simplicity on the PUT request.
            const uploadRes = await fetch(uploadUrl, {
                method: "PUT",
                body: file,
                headers: {
                    "Content-Type": file.type || "application/octet-stream"
                }
            })

            setProgress(80)

            if (!uploadRes.ok) throw new Error("Google Drive refused the file stream")
            const driveData = await uploadRes.json()
            if (!driveData.id) throw new Error("Upload succeeded but no Drive File ID was returned")

            // 3. Finalize in Database via Server Action
            setProgress(90)
            const finalizeRes = await finalizeDirectUpload(projectId, {
                drawingCode,
                title,
                discipline,
                googleDriveFileId: driveData.id,
                changeReason
            })

            if (finalizeRes.error) throw new Error(finalizeRes.error)

            setProgress(100)
            toast.success("Massive Document uploaded and routed successfully")
            setOpen(false)
            setFile(null)
            setProgress(0)
        } catch (err: any) {
            toast.error(err.message || "Upload failed")
            setProgress(0)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-slate-900 text-white hover:bg-slate-800">
                    <Upload className="mr-2 h-4 w-4" /> Upload Document
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Upload Heavy File / Revision</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Drawing Code</Label>
                            <Input name="drawingCode" placeholder="e.g. A-101" required />
                        </div>
                        <div className="space-y-2">
                            <Label>Discipline</Label>
                            <Select name="discipline" defaultValue="ARCH">
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ARCH">Architecture (ARCH)</SelectItem>
                                    <SelectItem value="STR">Structural (STR)</SelectItem>
                                    <SelectItem value="MEP">MEP</SelectItem>
                                    <SelectItem value="INFRA">Infrastructure</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Drawing Title</Label>
                        <Input name="title" placeholder="e.g. Ground Floor Plan" required />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>File Category</Label>
                            <Select value={fileCategory} onValueChange={setFileCategory}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="REVIT">Revit (.RVT)</SelectItem>
                                    <SelectItem value="CAD">AutoCAD (.DWG)</SelectItem>
                                    <SelectItem value="PRESENTATION">Presentation (PDF)</SelectItem>
                                    <SelectItem value="RENDER">Render (IMG/MP4)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>File Dropzone</Label>
                            <div className="relative">
                                <Input
                                    type="file"
                                    accept={getAcceptTypes()}
                                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                                    required
                                    className="pt-2 text-slate-500 cursor-pointer"
                                />
                            </div>
                        </div>
                    </div>

                    {file && (
                        <div className="text-xs font-mono bg-slate-50 p-2 rounded text-slate-600 truncate border">
                            <FileType2 className="inline h-3 w-3 mr-1" />
                            {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>Change Reason / Notes</Label>
                        <Textarea name="changeReason" placeholder="Describe the revision changes or state 'Initial Issue'" required />
                        <p className="text-xs text-slate-500 font-medium">
                            Direct-to-Drive uploading enabled. No file size limits.
                        </p>
                    </div>

                    <Button type="submit" className="w-full bg-primary" disabled={loading || !file}>
                        {loading ? (
                            <span className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Uploading to Cloud... {progress}%
                            </span>
                        ) : "Submit for Approval"}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    )
}
