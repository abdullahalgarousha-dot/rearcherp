import { auth } from "@/auth"
import { db } from "@/lib/db"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { BackButton } from "@/components/ui/back-button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"

export default async function IRListPage({ params }: { params: Promise<{ projectId: string }> }) {
    const { projectId } = await params
    const session = await auth()

    // Fetch IRs
    const irs = await (db as any).inspectionRequest.findMany({
        where: { projectId },
        orderBy: { serial: 'desc' },
        include: { task: true }
    })

    return (
        <div className="space-y-6 rtl:text-right pb-20">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <BackButton />
                    <h1 className="text-2xl font-bold text-slate-900">Inspection Requests (IR)</h1>
                </div>
                <Link href={`/admin/projects/${projectId}/supervision/ir/new`}>
                    <Button className="shadow-lg shadow-primary/20">
                        <Plus className="mr-2 h-4 w-4" />
                        New IR
                    </Button>
                </Link>
            </div>

            <div className="grid gap-4">
                {irs.map((ir: any) => (
                    <Link href={`/admin/projects/${projectId}/supervision/ir/${ir.id}`} key={ir.id}>
                        <Card className="hover:shadow-md transition-all group">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-slate-900">{ir.officeRef || 'Pending Ref'}</h3>
                                        <Badge variant="outline" className="font-mono bg-slate-50 text-slate-500">
                                            Rev {ir.revision}
                                        </Badge>
                                        <StatusBadge status={ir.status} />
                                    </div>
                                    <p className="text-sm text-slate-500 font-medium truncate max-w-md">
                                        {ir.type} - {ir.description}
                                    </p>
                                    <div className="flex items-center gap-4 text-xs text-slate-400">
                                        <span>Contractor Ref: {ir.contractorRef}</span>
                                        <span>Date: {format(new Date(ir.date), 'dd/MM/yyyy')}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    {ir.task && (
                                        <Badge variant="secondary" className="mb-2">
                                            {ir.task.name}
                                        </Badge>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                ))}

                {irs.length === 0 && (
                    <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <p className="text-slate-400 font-medium">No Inspection Requests found.</p>
                    </div>
                )}
            </div>
        </div>
    )
}

function StatusBadge({ status }: { status: string }) {
    const styles: any = {
        PENDING: "bg-amber-100 text-amber-700 hover:bg-amber-100",
        APPROVED: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
        APPROVED_WITH_COMMENTS: "bg-emerald-50 text-emerald-600 hover:bg-emerald-50 border-emerald-200",
        REJECTED: "bg-red-100 text-red-700 hover:bg-red-100"
    }

    const labels: any = {
        PENDING: "Pending",
        APPROVED: "Approved",
        APPROVED_WITH_COMMENTS: "Approved w/ Notes",
        REJECTED: "Rejected"
    }

    return (
        <Badge className={styles[status] || "bg-slate-100 text-slate-700"}>
            {labels[status] || status}
        </Badge>
    )
}
