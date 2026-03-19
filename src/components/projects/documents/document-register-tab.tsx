"use client"

import React, { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { UploadRevisionDialog } from "./upload-revision-dialog"
import { ChevronDown, ChevronRight, Check, X, Eye, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { approveDrawingRevision, rejectDrawingRevision } from "@/app/admin/projects/[projectId]/document-actions"
import { DocumentCommentsDrawer } from "./document-comments-drawer"
import { toast } from "sonner"

type Drawing = any
type DrawingRevision = any

export function DocumentRegisterTab({ projectId, drawings, isSuperAdmin }: { projectId: string, drawings: Drawing[], isSuperAdmin: boolean }) {
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
    const [loadingAction, setLoadingAction] = useState<string | null>(null)

    const toggleRow = (id: string) => {
        const newSet = new Set(expandedRows)
        if (newSet.has(id)) newSet.delete(id)
        else newSet.add(id)
        setExpandedRows(newSet)
    }

    const handleApprove = async (revisionId: string) => {
        setLoadingAction(`approve-${revisionId}`)
        try {
            const res = await approveDrawingRevision(projectId, revisionId)
            if (res.error) throw new Error(res.error)
            toast.success("Revision approved and moved to active records")
        } catch (e: any) {
            toast.error(e.message)
        } finally {
            setLoadingAction(null)
        }
    }

    const handleReject = async (revisionId: string) => {
        const notes = prompt("Enter rejection reason:")
        if (!notes) return

        setLoadingAction(`reject-${revisionId}`)
        try {
            const res = await rejectDrawingRevision(projectId, revisionId, notes)
            if (res.error) throw new Error(res.error)
            toast.success("Revision rejected")
        } catch (e: any) {
            toast.error(e.message)
        } finally {
            setLoadingAction(null)
        }
    }

    const StatusBadge = ({ status }: { status: string }) => {
        switch (status) {
            case 'APPROVED': return <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100">Approved</Badge>
            case 'PENDING': return <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">Pending Review</Badge>
            case 'REJECTED': return <Badge variant="secondary" className="bg-red-100 text-red-700 hover:bg-red-100">Rejected</Badge>
            case 'ARCHIVED': return <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-100">Archived (Old)</Badge>
        }
        return <Badge variant="outline">{status}</Badge>
    }

    if (!drawings || drawings.length === 0) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold">Document Register</h3>
                    <UploadRevisionDialog projectId={projectId} />
                </div>
                <div className="text-center p-12 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200">
                    <FileText className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                    <p className="font-bold text-slate-400">No documents found. Upload the first drawing.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                <div>
                    <h3 className="text-xl font-black text-slate-900">Document Register</h3>
                    <p className="text-sm text-slate-500 font-medium mt-1">Version Control and Approval Workflow</p>
                </div>
                <UploadRevisionDialog projectId={projectId} />
            </div>

            <Card className="rounded-2xl shadow-sm border-slate-200 overflow-hidden bg-white">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50/80 border-b">
                            <tr>
                                <th className="px-4 py-3 w-10"></th>
                                <th className="px-4 py-3 font-bold">Code</th>
                                <th className="px-4 py-3 font-bold">Title</th>
                                <th className="px-4 py-3 font-bold">Discipline</th>
                                <th className="px-4 py-3 font-bold">Rev</th>
                                <th className="px-4 py-3 font-bold">Status</th>
                                <th className="px-4 py-3 font-bold">Last Update</th>
                                <th className="px-4 py-3 font-bold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {drawings.map((drawing) => {
                                const revisions = drawing.revisions || []
                                // Find active/latest approved or latest pending if none approved
                                const sortedRev = [...revisions].sort((a, b) => b.versionNumber - a.versionNumber)
                                const activeRev = sortedRev.find(r => r.status === 'APPROVED') || sortedRev[0]
                                const isExpanded = expandedRows.has(drawing.id)

                                return (
                                    <React.Fragment key={drawing.id}>
                                        <tr className={`hover:bg-slate-50/50 transition-colors ${isExpanded ? 'bg-slate-50' : ''}`}>
                                            <td className="px-4 py-3">
                                                <button onClick={() => toggleRow(drawing.id)} className="text-slate-400 hover:text-slate-900 p-1 rounded-md hover:bg-slate-200 transition-colors">
                                                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                                </button>
                                            </td>
                                            <td className="px-4 py-3 font-mono font-bold text-slate-900">{drawing.drawingCode}</td>
                                            <td className="px-4 py-3 font-bold text-slate-700">{drawing.title}</td>
                                            <td className="px-4 py-3">
                                                <Badge variant="outline" className="font-bold rounded-lg">{drawing.discipline}</Badge>
                                            </td>
                                            <td className="px-4 py-3 font-mono font-bold text-slate-900">V{activeRev?.versionNumber || 0}</td>
                                            <td className="px-4 py-3">
                                                {activeRev ? <StatusBadge status={activeRev.status} /> : <span className="text-slate-400">N/A</span>}
                                            </td>
                                            <td className="px-4 py-3 font-medium text-slate-500">
                                                {activeRev ? format(new Date(activeRev.updatedAt), 'MMM dd, yyyy') : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex justify-end gap-2">
                                                    {activeRev?.fileUrl && (
                                                        <Button variant="outline" size="sm" asChild className="h-8 shadow-sm">
                                                            <a href={`/api/files/download?fileId=${activeRev.googleDriveFileId}&type=DRAWING&entityId=${drawing.id}`} target="_blank" rel="noopener noreferrer">
                                                                <Eye className="h-3 w-3 mr-1.5" /> View
                                                            </a>
                                                        </Button>
                                                    )}
                                                    {activeRev && (
                                                        <DocumentCommentsDrawer
                                                            projectId={projectId}
                                                            revisionId={activeRev.id}
                                                            comments={activeRev.comments || []}
                                                        />
                                                    )}
                                                    {activeRev?.status === 'PENDING' && isSuperAdmin && (
                                                        <>
                                                            <Button
                                                                variant="default"
                                                                size="sm"
                                                                className="h-8 bg-green-600 hover:bg-green-700 shadow-sm"
                                                                disabled={loadingAction === `approve-${activeRev.id}`}
                                                                onClick={() => handleApprove(activeRev.id)}
                                                            >
                                                                <Check className="h-3 w-3" />
                                                            </Button>
                                                            <Button
                                                                variant="destructive"
                                                                size="sm"
                                                                className="h-8 shadow-sm"
                                                                disabled={loadingAction === `reject-${activeRev.id}`}
                                                                onClick={() => handleReject(activeRev.id)}
                                                            >
                                                                <X className="h-3 w-3" />
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>

                                        {/* EXPANDED HISTORY VIEW */}
                                        {isExpanded && (
                                            <tr>
                                                <td colSpan={8} className="p-0 border-b bg-slate-50/50">
                                                    <div className="px-14 py-4 space-y-3">
                                                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Revision History</h4>
                                                        <div className="space-y-2">
                                                            {sortedRev.map((rev) => (
                                                                <div key={rev.id} className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-sm text-sm">
                                                                    <div className="flex items-center gap-6">
                                                                        <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded">V{rev.versionNumber}</span>
                                                                        <div className="min-w-32"><StatusBadge status={rev.status} /></div>
                                                                        <div className="text-slate-500 min-w-32">{format(new Date(rev.createdAt), 'MMM dd, yyyy HH:mm')}</div>
                                                                        <div className="max-w-md truncate text-slate-600">
                                                                            <span className="font-semibold text-slate-400 mr-2">Notes:</span>
                                                                            {rev.changeReason || "Initial Upload"}
                                                                            {rev.approvalNotes && <span className="text-red-500 ml-2">({rev.approvalNotes})</span>}
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex gap-2">
                                                                        <DocumentCommentsDrawer
                                                                            projectId={projectId}
                                                                            revisionId={rev.id}
                                                                            comments={rev.comments || []}
                                                                        />
                                                                        {rev.googleDriveFileId && (
                                                                            <Button variant="ghost" size="sm" asChild className="h-8 text-xs font-bold text-slate-500 hover:text-slate-900 border border-slate-200 bg-slate-50">
                                                                                <a href={`/api/files/download?fileId=${rev.googleDriveFileId}&type=DRAWING&entityId=${drawing.id}`} target="_blank" rel="noopener noreferrer">
                                                                                    Preview
                                                                                </a>
                                                                            </Button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    )
}
