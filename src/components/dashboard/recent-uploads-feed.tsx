"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { UploadCloud, FileText, CheckCircle, Clock } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"

export function RecentUploadsFeed({ uploads = [] }: { uploads: any[] }) {
    return (
        <Card className="shadow-lg border-slate-200">
            <CardHeader className="bg-slate-50 border-b border-slate-100 rounded-t-xl py-4">
                <CardTitle className="flex items-center gap-2 text-md">
                    <UploadCloud className="h-5 w-5 text-indigo-500" />
                    Recent Document Uploads
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-y-auto max-h-[400px]">
                {uploads.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 font-medium">
                        No recent uploads found.
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {uploads.map((rev) => {
                            const isApproved = rev.status === 'APPROVED'
                            const drawing = rev.drawing
                            if (!drawing) return null

                            return (
                                <Link key={rev.id} href={`/admin/projects/${drawing.projectId}?tab=documents`}>
                                    <div className="p-4 hover:bg-slate-50 transition-colors flex items-start gap-4">
                                        <div className={`p-2 rounded-lg shrink-0 mt-1 ${isApproved ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                                            <FileText className="h-5 w-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-1">
                                                <h4 className="font-bold text-slate-900 text-sm truncate pr-4">
                                                    {drawing.drawingCode} - {drawing.title}
                                                </h4>
                                                <span className="text-[10px] font-bold text-slate-400 shrink-0 uppercase">
                                                    V{rev.versionNumber}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 line-clamp-1 mb-2">
                                                {drawing.project?.name || "Unknown Project"}
                                            </p>
                                            <div className="flex items-center gap-3 text-[10px] font-medium text-slate-400">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {formatDistanceToNow(new Date(rev.createdAt), { addSuffix: true })}
                                                </span>
                                                <span>•</span>
                                                <span className="truncate max-w-[100px]">By {rev.uploadedBy?.name || "Unknown"}</span>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            )
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
