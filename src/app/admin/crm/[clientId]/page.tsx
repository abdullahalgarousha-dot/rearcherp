import { auth } from "@/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { BackButton } from "@/components/ui/back-button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Building2, Receipt, Phone, Mail, MapPin, Briefcase, FileText, Wallet } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ClientStatementTab } from "@/components/crm/client-statement-tab"
import { ClientDialog } from "@/components/crm/client-dialog"

export default async function ClientProfilePage({ params }: { params: Promise<{ clientId: string }> }) {
    const session = await auth()
    const user = session?.user as any
    if (!user) return redirect('/login')

    const { clientId } = await params

    const clientData = await (db as any).client.findUnique({
        where: { id: clientId },
        include: {
            projects: {
                include: {
                    invoices: true,
                    brand: true
                },
                orderBy: { createdAt: 'desc' }
            }
        }
    })

    if (!clientData) {
        return <div>Client not found</div>
    }

    const { projects, ...client } = clientData

    // RBAC check: If not admin/accountant, check if user is involved in ANY of these projects
    const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT'].includes(user.role)
    if (!isAdmin) {
        // We need a secondary query to see if the user is in the engineers relation for any of these project IDs
        const userProjects = await db.project.count({
            where: {
                id: { in: projects.map((p: any) => p.id) },
                engineers: { some: { id: user.id } }
            }
        })
        if (userProjects === 0) {
            return <div className="p-8 text-center text-red-500 font-bold">Unauthorized. You are not assigned to any projects for this client.</div>
        }
    }

    // Consolidated Financials
    const totalContractValue = projects.reduce((sum: number, p: any) => sum + parseFloat(p.contractValue?.toString() || '0'), 0)

    // Sum all PAID invoices across all projects (using totalAmount = base + VAT)
    const totalPaid = projects.reduce((sum: number, p: any) => {
        const paidForProject = p.invoices
            .filter((inv: any) => inv.status === 'PAID')
            .reduce((invSum: number, inv: any) => invSum + parseFloat(inv.totalAmount?.toString() || '0'), 0)
        return sum + paidForProject
    }, 0)

    const totalOutstanding = totalContractValue - totalPaid

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-20">
            <BackButton />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8 mt-2">
                <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white text-2xl font-bold">
                        {client.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                                {client.name}
                            </h1>
                            <Badge variant="outline" className="font-mono text-sm uppercase px-2 py-0.5 mt-1 border-blue-200 text-blue-700 bg-blue-50">
                                {client.clientCode}
                            </Badge>
                            {isAdmin && <ClientDialog client={client as any} />}
                        </div>
                        <div className="text-slate-500 font-medium flex gap-4 mt-2 h-4 shrink-0 flex-wrap">
                            {client.taxNumber && <span className="flex items-center gap-1"><Receipt className="w-3.5 h-3.5" /> {client.taxNumber}</span>}
                            {client.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {client.phone}</span>}
                            {client.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {client.email}</span>}
                        </div>
                    </div>
                </div>
            </div>

            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-none shadow-md shadow-slate-200/50 bg-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full translate-x-10 -translate-y-10" />
                    <CardHeader className="pb-2 relative z-10">
                        <CardTitle className="text-sm font-bold text-slate-500 flex items-center justify-between">
                            Total Contracted Value
                            <div className="p-2 bg-slate-100 rounded-lg"><Briefcase className="w-4 h-4 text-slate-600" /></div>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="relative z-10">
                        <div className="text-3xl font-black font-mono text-slate-800">
                            {totalContractValue.toLocaleString()} <span className="text-lg text-slate-400">SAR</span>
                        </div>
                        <p className="text-xs font-semibold text-slate-400 mt-2">Across {projects.length} connected projects</p>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-md shadow-emerald-200/50 bg-emerald-50 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100/50 rounded-full translate-x-10 -translate-y-10" />
                    <CardHeader className="pb-2 relative z-10">
                        <CardTitle className="text-sm font-bold text-emerald-800 flex items-center justify-between">
                            Total Paid
                            <div className="p-2 bg-emerald-100 rounded-lg"><Wallet className="w-4 h-4 text-emerald-700" /></div>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="relative z-10">
                        <div className="text-3xl font-black font-mono text-emerald-700">
                            {totalPaid.toLocaleString()} <span className="text-lg text-emerald-500/50">SAR</span>
                        </div>
                        <div className="w-full bg-emerald-200/50 h-1.5 mt-3 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${totalContractValue ? (totalPaid / totalContractValue) * 100 : 0}%` }} />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-md shadow-rose-200/50 bg-rose-50 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-rose-100/50 rounded-full translate-x-10 -translate-y-10" />
                    <CardHeader className="pb-2 relative z-10">
                        <CardTitle className="text-sm font-bold text-rose-800 flex items-center justify-between">
                            Outstanding Balance
                            <div className="p-2 bg-rose-100 rounded-lg"><FileText className="w-4 h-4 text-rose-700" /></div>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="relative z-10">
                        <div className="text-3xl font-black font-mono text-rose-700">
                            {totalOutstanding.toLocaleString()} <span className="text-lg text-rose-500/50">SAR</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="projects" className="w-full mt-6 space-y-6">
                <TabsList className="bg-slate-100/50 p-1 border">
                    <TabsTrigger value="projects" className="px-6 rounded-md">Projects Portfolio</TabsTrigger>
                    <TabsTrigger value="statement" className="px-6 rounded-md">Statement of Account</TabsTrigger>
                </TabsList>

                <TabsContent value="projects" className="space-y-6 mt-0">
                    <Card className="border-none shadow-sm overflow-hidden bg-white">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b">
                                    <tr>
                                        <th className="px-6 py-4 font-semibold rounded-tl-xl whitespace-nowrap">Project Details</th>
                                        <th className="px-6 py-4 font-semibold whitespace-nowrap">Brand</th>
                                        <th className="px-6 py-4 font-semibold whitespace-nowrap">Status</th>
                                        <th className="px-6 py-4 font-semibold text-right whitespace-nowrap">Contract Value</th>
                                        <th className="px-6 py-4 font-semibold text-right rounded-tr-xl whitespace-nowrap">Paid Value</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {projects.map((project: any) => {
                                        const projPaid = project.invoices
                                            .filter((i: any) => i.status === 'PAID')
                                            .reduce((sum: number, i: any) => sum + parseFloat(i.totalAmount?.toString() || '0'), 0)

                                        return (
                                            <tr key={project.id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-slate-800 group-hover:text-primary transition-colors">{project.name}</div>
                                                    <div className="text-xs font-mono text-slate-500">{project.code}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Badge variant="secondary" className="bg-slate-100">
                                                        {project.brand?.nameEn || 'N/A'}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Badge variant={project.status === 'ACTIVE' ? 'default' : 'outline'} className={project.status === 'ACTIVE' ? 'bg-emerald-500' : ''}>
                                                        {project.status}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4 text-right font-mono font-medium text-slate-700">
                                                    {parseFloat(project.contractValue?.toString() || '0').toLocaleString()} SAR
                                                </td>
                                                <td className="px-6 py-4 text-right font-mono font-medium text-emerald-600">
                                                    {projPaid.toLocaleString()} SAR
                                                </td>
                                            </tr>
                                        )
                                    })}
                                    {projects.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-10 text-center text-slate-400">
                                                No linked projects found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </TabsContent>

                <TabsContent value="statement" className="mt-0">
                    <ClientStatementTab clientId={client.id} />
                </TabsContent>
            </Tabs>
        </div>
    )
}
