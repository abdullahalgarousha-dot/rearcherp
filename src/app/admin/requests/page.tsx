import { auth } from "@/auth"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import {
    Users,
    Building2,
    Filter,
    Search,
    Wallet,
    FileText
} from "lucide-react"
import { InboxActions } from "@/app/admin/requests/inbox-actions"
import { Prisma, User, LoanRequest, DocumentRequest } from "@prisma/client"

type RequestItem = (LoanRequest | DocumentRequest) & {
    user: User
    reqType: 'LOAN' | 'DOCUMENT'
    amount?: number
    installments?: number
    type?: string
    details?: string | null
}

export default async function RequestInboxPage() {
    const session = await auth()
    const userRole = (session?.user as any)?.role
    const userId = (session?.user as any)?.id

    if (!userId) return <div>Unauthorized</div>

    // 1. Fetch Team Requests (where user is direct manager)
    const teamProfiles = await db.employeeProfile.findMany({
        where: { directManagerId: userId },
        include: {
            user: true,
            loans: {
                where: { status: 'PENDING_MANAGER' }
            },
            documentRequests: {
                where: { status: 'PENDING_MANAGER' }
            }
        }
    })

    const flattenedTeamRequests: RequestItem[] = teamProfiles.flatMap((p) => [
        ...p.loans.map(l => ({ ...l, user: p.user, reqType: 'LOAN' as const })),
        ...p.documentRequests.map(d => ({ ...d, user: p.user, reqType: 'DOCUMENT' as const }))
    ]).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    // 2. Fetch Company Requests (For HR/Finance/Admin)
    // HR sees PENDING_HR, Finance sees PENDING_FINANCE
    let companyRequests: RequestItem[] = []
    if (userRole === 'ADMIN' || userRole === 'HR' || userRole === 'ACCOUNTANT') {
        const statuses = []
        if (userRole === 'ADMIN') statuses.push('PENDING_HR', 'PENDING_FINANCE', 'PENDING_MANAGER')
        if (userRole === 'HR') statuses.push('PENDING_HR')
        if (userRole === 'ACCOUNTANT') statuses.push('PENDING_FINANCE')

        const loans = await db.loanRequest.findMany({
            where: { status: { in: statuses } },
            include: { profile: { include: { user: true } } }
        })
        const docs = await db.documentRequest.findMany({
            where: { status: { in: statuses } },
            include: { profile: { include: { user: true } } }
        })
        companyRequests = [
            ...loans.map(l => ({ ...l, user: l.profile.user, reqType: 'LOAN' as const })),
            ...docs.map(d => ({ ...d, user: d.profile.user, reqType: 'DOCUMENT' as const }))
        ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black tracking-tight">Request Inbox</h2>
                    <p className="text-muted-foreground font-medium">Process and manage employee workflow requests.</p>
                </div>
                <div className="flex gap-2 no-print">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input placeholder="Search employee..." className="pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 w-[250px]" />
                    </div>
                </div>
            </div>

            <Tabs defaultValue={flattenedTeamRequests.length > 0 ? "team" : "company"} className="w-full">
                <TabsList className="bg-slate-100 p-1 rounded-2xl mb-6">
                    <TabsTrigger value="team" className="rounded-xl px-8 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm flex gap-2">
                        <Users size={16} /> Team Requests
                        {flattenedTeamRequests.length > 0 && <Badge className="ml-1 bg-primary text-white text-[10px]">{flattenedTeamRequests.length}</Badge>}
                    </TabsTrigger>
                    {(userRole === 'ADMIN' || userRole === 'HR' || userRole === 'ACCOUNTANT') && (
                        <TabsTrigger value="company" className="rounded-xl px-8 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm flex gap-2">
                            <Building2 size={16} /> All Company
                            {companyRequests.length > 0 && <Badge className="ml-1 bg-slate-400 text-white text-[10px]">{companyRequests.length}</Badge>}
                        </TabsTrigger>
                    )}
                </TabsList>

                <TabsContent value="team" className="space-y-4">
                    <RequestTable requests={flattenedTeamRequests} role="MANAGER" />
                </TabsContent>

                <TabsContent value="company" className="space-y-4">
                    <RequestTable requests={companyRequests} role={userRole} />
                </TabsContent>
            </Tabs>
        </div>
    )
}

function RequestTable({ requests, role }: { requests: RequestItem[], role: string }) {
    if (requests.length === 0) {
        return (
            <Card className="border-dashed border-2 border-slate-100 bg-slate-50/30">
                <CardContent className="py-20 text-center">
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                        <Filter className="text-slate-300" />
                    </div>
                    <p className="text-slate-400 font-bold">No pending requests found in this category.</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden">
            <CardContent className="p-0">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-slate-50/80 text-[10px] font-black uppercase text-slate-400">
                            <th className="text-left px-6 py-4">Employee</th>
                            <th className="text-left px-6 py-4">Type</th>
                            <th className="text-left px-6 py-4">Details</th>
                            <th className="text-left px-6 py-4">Submitted</th>
                            <th className="text-right px-6 py-4">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {requests.map((req) => (
                            <tr key={req.id} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="font-black text-slate-900">{req.user.name}</span>
                                        <span className="text-[10px] text-slate-400 font-bold uppercase">{req.user.role}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${req.reqType === 'LOAN' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                                            {req.reqType === 'LOAN' ? <Wallet size={14} /> : <FileText size={14} />}
                                        </div>
                                        <Badge className="font-bold bg-slate-100 text-slate-600 hover:bg-slate-100">
                                            {req.reqType === 'LOAN' ? 'Loan' : req.type}
                                        </Badge>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col max-w-[200px]">
                                        <span className="font-bold text-slate-700 truncate">
                                            {req.reqType === 'LOAN' ? `SAR ${req.amount}` : (req.details || 'Document Request')}
                                        </span>
                                        {req.reqType === 'LOAN' && <span className="text-[10px] text-slate-400">Installments: {req.installments} Mo.</span>}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-slate-500 font-medium">
                                    {format(new Date(req.createdAt), "dd MMM yyyy")}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <InboxActions request={req} role={role} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </CardContent>
        </Card>
    )
}
