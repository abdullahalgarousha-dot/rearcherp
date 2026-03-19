import { auth } from "@/auth"
import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import { BackButton } from "@/components/ui/back-button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ApprovalCard } from "./approval-card"
import { ResubmitDialog } from "./resubmit-dialog"
import { format } from "date-fns"
import { FileText, Download, History } from "lucide-react"
import { Button } from "@/components/ui/button"

export default async function IRDetailsPage({ params }: { params: Promise<{ projectId: string, irId: string }> }) {
    const { projectId, irId } = await params
    const session = await auth()

    const ir = await (db as any).inspectionRequest.findUnique({
        where: { id: irId },
        include: {
            task: true,
            approvedBy: true,
            revisions: {
                orderBy: { revisionNo: 'desc' },
                include: { reviewer: true }
            }
        }
    })

    if (!ir) notFound()

    return (
        <div className="space-y-8 rtl:text-right pb-20">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                    <BackButton />
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
                            {ir.officeRef || 'Generating Ref...'}
                            <Badge variant="outline" className="text-lg py-1 px-3 bg-slate-100 border-slate-200 text-slate-600">
                                Rev {ir.revision}
                            </Badge>
                        </h1>
                        <p className="text-slate-500 font-medium mt-1">Contractor Ref: {ir.contractorRef}</p>
                    </div>
                </div>
                <div className="text-right">
                    <Badge className={`text-base py-1 px-4 ${ir.status === 'APPROVED' ? 'bg-emerald-500 hover:bg-emerald-600' :
                        ir.status === 'REJECTED' ? 'bg-red-500 hover:bg-red-600' :
                            'bg-amber-500 hover:bg-amber-600'
                        }`}>
                        {ir.status}
                    </Badge>
                    <p className="text-xs text-slate-400 mt-2">
                        Created {format(new Date(ir.date), 'dd MMM yyyy')}
                    </p>
                </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-12">
                {/* Main Content */}
                <div className="lg:col-span-8 space-y-6">
                    {/* Information */}
                    <Card className="bg-white/70 backdrop-blur-md shadow-sm border-none">
                        <CardHeader>
                            <CardTitle>Request Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase">Type</label>
                                    <p className="font-bold text-slate-800">{ir.type}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase">Related Task</label>
                                    <p className="font-bold text-slate-800">{ir.task?.name || 'General'}</p>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase">Description</label>
                                <p className="text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-100 mt-1">
                                    {ir.description}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Contractor Report */}
                    <Card className="overflow-hidden border-none shadow-sm">
                        <CardHeader className="bg-slate-50 border-b border-slate-100">
                            <CardTitle className="text-base flex items-center justify-between">
                                <span className="flex items-center gap-2"><FileText className="h-4 w-4" /> Contractor Report</span>
                                {ir.contractorReport && (
                                    <a href={ir.contractorReport} target="_blank" rel="noopener noreferrer">
                                        <Button size="sm" variant="ghost" className="h-8"><Download className="h-4 w-4 mr-2" /> Download</Button>
                                    </a>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 bg-slate-100 min-h-[500px] flex items-center justify-center">
                            {ir.contractorReport ? (
                                <iframe
                                    src={ir.contractorReport.replace('/view', '/preview')}
                                    className="w-full h-[500px]"
                                    title="Contractor Report"
                                />
                            ) : (
                                <p className="text-slate-400">No document attached.</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Final Document (If Approved) */}
                    {ir.finalDocument && (
                        <Card className="overflow-hidden border-2 border-emerald-100 shadow-md">
                            <CardHeader className="bg-emerald-50 border-b border-emerald-100">
                                <CardTitle className="text-base text-emerald-800 flex items-center justify-between">
                                    <span className="flex items-center gap-2"><FileText className="h-4 w-4" /> Final Approved Document</span>
                                    <a href={ir.finalDocument} target="_blank" rel="noopener noreferrer">
                                        <Button size="sm" variant="outline" className="h-8 border-emerald-200 text-emerald-700 bg-white"><Download className="h-4 w-4 mr-2" /> Download Signed Copy</Button>
                                    </a>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0 bg-slate-100 min-h-[500px]">
                                <iframe
                                    src={ir.finalDocument.replace('/view', '/preview')}
                                    className="w-full h-[500px]"
                                    title="Final Document"
                                />
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Sidebar */}
                <div className="lg:col-span-4 space-y-6">
                    {/* Action Cards */}
                    <ApprovalCard irId={irId} projectId={projectId} status={ir.status} />
                    <ResubmitDialog irId={irId} projectId={projectId} isRejected={ir.status === 'REJECTED'} />

                    {/* Rejection/Comments */}
                    {ir.comments && (
                        <Card className="bg-amber-50 border-amber-200">
                            <CardHeader>
                                <CardTitle className="text-amber-800 text-sm">Reviewer Comments</CardTitle>
                            </CardHeader>
                            <CardContent className="text-amber-900 text-sm">
                                {ir.comments}
                            </CardContent>
                        </Card>
                    )}

                    {/* History */}
                    <Card className="border-none shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <History className="h-4 w-4 text-slate-400" />
                                Revision History
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {ir.revisions.length === 0 && <p className="text-sm text-slate-400">No previous revisions.</p>}
                            {ir.revisions.map((rev: any) => (
                                <div key={rev.id} className="text-sm border-l-2 border-slate-200 pl-3 py-1 space-y-1">
                                    <div className="flex justify-between">
                                        <span className="font-bold text-slate-700">Rev {rev.revisionNo}</span>
                                        <Badge variant="outline" className="text-xs">{rev.status}</Badge>
                                    </div>
                                    <p className="text-slate-500 text-xs">{format(new Date(rev.createdAt), 'dd MMM yyyy HH:mm')}</p>
                                    {rev.comments && <p className="text-red-500 text-xs italic">"{rev.comments}"</p>}
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
