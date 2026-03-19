import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertTriangle, FileText, Calendar, Clock, CheckCircle2, Eye, ArrowUpRight, Plus, Truck, HardHat, Camera, FolderOpen } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { NewNCRDialog } from "@/components/supervision/new-ncr-dialog"
import { NewIRDialog } from "@/components/supervision/new-ir-dialog"
import { getProjectSupervisionData } from "@/app/admin/projects/[projectId]/supervision-utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DriveArchiveViewer } from "@/components/supervision/drive-archive-viewer"
import { ActionExportButton } from "@/components/common/ActionExportButton"
import { Separator } from "@/components/ui/separator"
import { AssignContractorDialog } from "./supervision/AssignContractorDialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { auth } from "@/auth"
import { DSRApproveButton } from "@/components/supervision/dsr-approve-button"

export async function SupervisionWorkspace({ projectId, projectName }: { projectId: string, projectName: string }) {
    const session = await auth()
    const userRole = (session?.user as any)?.role
    const { ncrs, reports, contractors, driveFolderId, siteVisits, irs } = await getProjectSupervisionData(projectId)

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h3 className="text-2xl font-bold tracking-tight">Supervision Workspace</h3>
                    <p className="text-muted-foreground">Manage site visits, reports, contractors, and field documentation.</p>
                </div>
                <div className="flex gap-2 print:hidden flex-wrap">
                    <NewNCRDialog
                        projects={[{ id: projectId, name: projectName }]}
                        contractors={contractors}
                        defaultProjectId={projectId}
                    />
                    <NewIRDialog projects={[{ id: projectId, name: projectName }]} contractors={contractors} />
                    <Button asChild className="rounded-xl shadow-lg shadow-primary/20 bg-primary text-white hover:bg-primary/90">
                        <Link href={`/admin/supervision/dsr/${projectId}/new`}>
                            <Plus className="mr-2 h-4 w-4" />
                            New Daily Report
                        </Link>
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="bg-muted/50 p-1 rounded-2xl w-full justify-start overflow-x-auto">
                    <TabsTrigger value="overview" className="rounded-xl gap-2"><LayoutDashboardIcon className="w-4 h-4" /> Overview</TabsTrigger>
                    <TabsTrigger value="visits" className="rounded-xl gap-2"><HardHat className="w-4 h-4" /> Site Visits</TabsTrigger>
                    <TabsTrigger value="reports" className="rounded-xl gap-2"><FileText className="w-4 h-4" /> Site Reports</TabsTrigger>
                    <TabsTrigger value="contractors" className="rounded-xl gap-2"><Truck className="w-4 h-4" /> Contractors</TabsTrigger>
                    <TabsTrigger value="media" className="rounded-xl gap-2"><Camera className="w-4 h-4" /> Media & Archive</TabsTrigger>
                </TabsList>

                {/* OVERVIEW TAB - Unified View */}
                <TabsContent value="overview" className="space-y-6 mt-6">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <StatusCard title="Open NCRs" count={ncrs.filter((n: any) => n.status === 'OPEN').length} icon={AlertTriangle} color="text-red-500" />
                        <StatusCard title="Pending Reports" count={reports.filter((r: any) => r.status === 'DRAFT').length} icon={FileText} color="text-amber-500" />
                        <StatusCard title="Pending IRs" count={(irs || []).filter((i: any) => i.status === 'PENDING').length} icon={FileText} color="text-blue-500" />
                        <StatusCard title="Contractors" count={contractors.length} icon={Truck} color="text-emerald-500" />
                    </div>

                    <div className="grid gap-6 mt-6">
                        <Tabs defaultValue="ncrs" className="w-full">
                            <TabsList className="bg-slate-100 p-1 rounded-2xl w-full justify-start overflow-x-auto shadow-sm">
                                <TabsTrigger value="ncrs" className="rounded-xl px-6">NCRs ({ncrs.length})</TabsTrigger>
                                <TabsTrigger value="irs" className="rounded-xl px-6">IRs ({(irs || []).length})</TabsTrigger>
                                <TabsTrigger value="dsr" className="rounded-xl px-6">التقارير اليومية ({reports.length})</TabsTrigger>
                            </TabsList>

                            {/* NCRs Table */}
                            <TabsContent value="ncrs">
                                <Card className="border-white/20 shadow-sm bg-white/60 backdrop-blur-xl p-1 mt-4">
                                    <div className="rounded-xl border border-slate-100 bg-white/50 overflow-x-auto">
                                        <Table>
                                            <TableHeader className="bg-slate-50/80">
                                                <TableRow className="hover:bg-slate-50/80 border-b border-slate-100">
                                                    <TableHead className="w-[120px] text-right font-black text-slate-700">Ref Code</TableHead>
                                                    <TableHead className="text-right font-bold text-slate-600">Contractor</TableHead>
                                                    <TableHead className="text-right font-bold text-slate-600">Subject</TableHead>
                                                    <TableHead className="text-center font-bold text-slate-600">Rev</TableHead>
                                                    <TableHead className="text-center font-bold text-slate-600">Severity</TableHead>
                                                    <TableHead className="text-center font-bold text-slate-600">Status</TableHead>
                                                    <TableHead className="text-center font-bold text-slate-600">Date</TableHead>
                                                    <TableHead className="text-left font-bold text-slate-600">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {ncrs.map((ncr: any) => (
                                                    <TableRow key={ncr.id} className="hover:bg-blue-50/30 border-b border-slate-50 transition-colors">
                                                        <TableCell className="font-bold text-slate-800 font-mono tracking-tight">{ncr.officeRef || ncr.id.slice(0, 8)}</TableCell>
                                                        <TableCell className="font-medium text-slate-600">{ncr.contractor?.name || ncr.contractor?.companyName || '-'}</TableCell>
                                                        <TableCell className="max-w-[250px] truncate text-slate-600" title={ncr.description}>{ncr.description}</TableCell>
                                                        <TableCell className="text-center font-mono font-bold text-slate-700">{ncr.revision || 0}</TableCell>
                                                        <TableCell className="text-center">
                                                            <Badge variant="outline" className={`
                                                                ${ncr.severity === 'CRITICAL' ? 'border-red-200 text-red-700 bg-red-50' :
                                                                    ncr.severity === 'HIGH' ? 'border-orange-200 text-orange-700 bg-orange-50' : 'border-slate-200 text-slate-600 bg-slate-50'}
                                                            `}>
                                                                {ncr.severity}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <Badge className={`border-0
                                                                ${ncr.status === 'PENDING' || ncr.status === 'OPEN' ? 'bg-orange-100 text-orange-700' :
                                                                    ncr.status === 'APPROVED' || ncr.status === 'CLOSED' ? 'bg-emerald-100 text-emerald-700' :
                                                                        'bg-red-100 text-red-700'}
                                                            `}>
                                                                {ncr.status === 'CLOSED' ? 'APPROVED' : ncr.status}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-center text-xs font-medium text-slate-500">{format(new Date(ncr.createdAt), 'dd/MM/yyyy')}</TableCell>
                                                        <TableCell className="text-left">
                                                            <Button asChild variant="ghost" size="sm" className="h-8 rounded-lg text-primary hover:bg-primary hover:text-white">
                                                                <Link href={`/admin/supervision/ncr/${ncr.id}`}>
                                                                    التفاصيل <ArrowUpRight className="ml-2 h-3 w-3" />
                                                                </Link>
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                                {ncrs.length === 0 && (
                                                    <TableRow>
                                                        <TableCell colSpan={8} className="h-32 text-center text-slate-400">No NCRs found.</TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </Card>
                            </TabsContent>

                            {/* IRs Table */}
                            <TabsContent value="irs">
                                <Card className="border-white/20 shadow-sm bg-white/60 backdrop-blur-xl p-1 mt-4">
                                    <div className="rounded-xl border border-slate-100 bg-white/50 overflow-x-auto">
                                        <Table>
                                            <TableHeader className="bg-slate-50/80">
                                                <TableRow className="hover:bg-slate-50/80 border-b border-slate-100">
                                                    <TableHead className="w-[120px] text-right font-black text-slate-700">Ref Code</TableHead>
                                                    <TableHead className="text-right font-bold text-slate-600">Type</TableHead>
                                                    <TableHead className="text-right font-bold text-slate-600">Subject</TableHead>
                                                    <TableHead className="text-center font-bold text-slate-600">Rev</TableHead>
                                                    <TableHead className="text-center font-bold text-slate-600">Status</TableHead>
                                                    <TableHead className="text-center font-bold text-slate-600">Date</TableHead>
                                                    <TableHead className="text-left font-bold text-slate-600">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {(irs || []).map((ir: any) => (
                                                    <TableRow key={ir.id} className="hover:bg-blue-50/30 border-b border-slate-50 transition-colors">
                                                        <TableCell className="font-bold text-slate-800 font-mono tracking-tight">{ir.officeRef || '-'}</TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className="bg-white border-slate-200 text-slate-600">{ir.type}</Badge>
                                                        </TableCell>
                                                        <TableCell className="max-w-[250px] truncate text-slate-600" title={ir.description}>{ir.description}</TableCell>
                                                        <TableCell className="text-center font-mono font-bold text-slate-700">{ir.revision || 0}</TableCell>
                                                        <TableCell className="text-center">
                                                            <Badge className={`border-0
                                                                ${ir.status === 'PENDING' ? 'bg-orange-100 text-orange-700' :
                                                                    ir.status === 'APPROVED' || ir.status === 'APPROVED_WITH_COMMENTS' ? 'bg-emerald-100 text-emerald-700' :
                                                                        'bg-red-100 text-red-700'}
                                                            `}>
                                                                {ir.status}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-center text-xs font-medium text-slate-500">{format(new Date(ir.date), 'dd/MM/yyyy')}</TableCell>
                                                        <TableCell className="text-left">
                                                            <Button asChild variant="ghost" size="sm" className="h-8 rounded-lg text-primary hover:bg-primary hover:text-white">
                                                                <Link href={`/admin/supervision/ir/${ir.id}`}>
                                                                    التفاصيل <ArrowUpRight className="ml-2 h-3 w-3" />
                                                                </Link>
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                                {(irs || []).length === 0 && (
                                                    <TableRow>
                                                        <TableCell colSpan={7} className="h-32 text-center text-slate-400">No IRs found.</TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </Card>
                            </TabsContent>

                            {/* DSR Table */}
                            <TabsContent value="dsr">
                                <Card className="border-white/20 shadow-sm bg-white/60 backdrop-blur-xl p-1 mt-4">
                                    <div className="rounded-xl border border-slate-100 bg-white/50 overflow-x-auto">
                                        <Table>
                                            <TableHeader className="bg-slate-50/80">
                                                <TableRow className="hover:bg-slate-50/80 border-b border-slate-100">
                                                    <TableHead className="w-[120px] text-right font-black text-slate-700">Date</TableHead>
                                                    <TableHead className="text-right font-bold text-slate-600">Weather</TableHead>
                                                    <TableHead className="text-center font-bold text-slate-600">Staff</TableHead>
                                                    <TableHead className="text-center font-bold text-slate-600">Status</TableHead>
                                                    <TableHead className="text-center font-bold text-slate-600">Created By</TableHead>
                                                    <TableHead className="text-left font-bold text-slate-600">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {reports.map((report: any) => (
                                                    <TableRow key={report.id} className="hover:bg-blue-50/30 border-b border-slate-50 transition-colors">
                                                        <TableCell className="font-bold text-slate-800">{format(new Date(report.date), 'dd MMM yyyy')}</TableCell>
                                                        <TableCell className="text-xs text-slate-500">{report.weather}</TableCell>
                                                        <TableCell className="text-center font-mono font-bold text-slate-700">{report.totalManpower || report.totalStaff || '-'}</TableCell>
                                                        <TableCell className="text-center">
                                                            <Badge className={`border-0
                                                                ${report.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}
                                                            `}>
                                                                {report.status}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-center text-xs font-medium text-slate-500">{report.createdBy?.name || '-'}</TableCell>
                                                        <TableCell className="text-left flex items-center justify-end gap-2">
                                                            <Button asChild variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-slate-100 text-slate-500">
                                                                <Link href={`/admin/supervision/dsr/${report.projectId}/${report.id}`}>
                                                                    <Eye className="h-4 w-4" />
                                                                </Link>
                                                            </Button>

                                                            {/* Approve Button for Admin/PM */}
                                                            <DSRApproveButton
                                                                reportId={report.id}
                                                                userRole={userRole}
                                                                status={report.status}
                                                            />
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                                {reports.length === 0 && (
                                                    <TableRow>
                                                        <TableCell colSpan={6} className="h-32 text-center text-slate-400">No reports found.</TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </div>
                </TabsContent>

                {/* SITE VISITS TAB */}
                <TabsContent value="visits" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Engineer Site Visits</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {siteVisits.map((visit: any) => (
                                    <div key={visit.id} className="flex items-start justify-between p-4 border rounded-xl hover:bg-slate-50 transition-colors">
                                        <div className="flex gap-4">
                                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                                {visit.user.name?.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-bold">{visit.user.name}</p>
                                                <p className="text-sm text-muted-foreground">{visit.description}</p>
                                                <div className="flex gap-2 mt-2">
                                                    <Badge variant="secondary" className="text-xs">{format(new Date(visit.date), 'PPP')}</Badge>
                                                    <Badge variant="outline" className="text-xs">{visit.hours} Hours</Badge>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {siteVisits.length === 0 && <EmptyState message="No site visits logged yet." />}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* REPORTS TAB */}
                <TabsContent value="reports" className="mt-6">
                    <Card>
                        <CardHeader className="flex flex-row justify-between">
                            <CardTitle>Daily Site Reports</CardTitle>
                            <Button asChild size="sm">
                                <Link href={`/admin/supervision/dsr/${projectId}/new`}>Create New Report</Link>
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {reports.map((report: any) => (
                                    <div key={report.id} className="flex items-center justify-between p-4 border rounded-xl">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
                                                <FileText className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <Link href={`/admin/supervision/dsr/${projectId}/${report.id}`} className="font-bold hover:underline">
                                                    Report #{report.reportNumber || 'N/A'} - {format(new Date(report.date), 'dd/MM/yyyy')}
                                                </Link>
                                                <p className="text-xs text-muted-foreground">Created by {report.createdBy.name}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant={report.status === 'APPROVED' ? 'default' : 'secondary'}>{report.status}</Badge>
                                            <Button variant="ghost" size="sm" asChild>
                                                <Link href={`/admin/supervision/dsr/${projectId}/${report.id}/edit`}>Edit</Link>
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                                {reports.length === 0 && <EmptyState message="No reports found." />}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* CONTRACTORS TAB */}
                <TabsContent value="contractors" className="mt-6">
                    <div className="flex justify-end mb-4">
                        <AssignContractorDialog projectId={projectId} />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {contractors.map((contractor: any) => (
                            <Card key={contractor.id}>
                                <CardHeader className="flex flex-row items-center gap-4">
                                    <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
                                        <Truck className="h-6 w-6 text-slate-500" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-base">{contractor.companyName || contractor.name}</CardTitle>
                                        <p className="text-xs text-muted-foreground">{contractor.specialty || "General Contractor"}</p>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Contact:</span>
                                            <span>{contractor.contactPerson || 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Phone:</span>
                                            <span>{contractor.phone || contractor.contactInfo || 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Email:</span>
                                            <span>{contractor.email || 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">CR No:</span>
                                            <span>{contractor.crNumber || 'N/A'}</span>
                                        </div>
                                        {contractor.joinedAt && (
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Joined:</span>
                                                <span>{format(new Date(contractor.joinedAt), 'dd/MM/yyyy')}</span>
                                            </div>
                                        )}
                                    </div>
                                    <Separator className="my-4" />
                                    <Button variant="outline" className="w-full">View Details</Button>
                                </CardContent>
                            </Card>
                        ))}
                        {contractors.length === 0 && (
                            <div className="col-span-full">
                                <EmptyState message="No contractors assigned to this project." />
                            </div>
                        )}
                    </div>
                </TabsContent>

                {/* MEDIA & ARCHIVE TAB */}
                <TabsContent value="media" className="mt-6">
                    {driveFolderId ? (
                        <DriveArchiveViewer folderId={driveFolderId} />
                    ) : (
                        <div className="py-20 text-center bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
                            <FolderOpen className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                            <p className="text-slate-400 font-bold italic uppercase">Google Drive folder not configured.</p>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    )
}

function StatusCard({ title, count, icon: Icon, color }: any) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className={`h-4 w-4 ${color}`} />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{count}</div>
            </CardContent>
        </Card>
    )
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="text-center py-8 text-muted-foreground bg-slate-50 rounded-lg border border-dashed">
            <p>{message}</p>
        </div>
    )
}

function LayoutDashboardIcon({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <rect width="7" height="9" x="3" y="3" rx="1" />
            <rect width="7" height="5" x="14" y="3" rx="1" />
            <rect width="7" height="9" x="14" y="12" rx="1" />
            <rect width="7" height="5" x="3" y="16" rx="1" />
        </svg>
    )
}
