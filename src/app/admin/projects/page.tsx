import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ProjectGrid } from "@/components/projects/project-grid"
import { Briefcase, Users, ArrowUpRight, ArrowRight, AlertTriangle, ClipboardCheck } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ brand?: string, tab?: string }> }) {
    const session = await auth()
    const user = session?.user as any

    // Basic access control
    if (!user) return redirect('/login')

    const tenantId = user.tenantId as string

    const { brand, tab } = await searchParams
    const currentTab = tab || 'active'

    const where: any = { tenantId }
    if (brand && brand !== 'all') {
        where.brandId = brand
    }

    // Filter by Status based on Tab
    if (currentTab === 'active') {
        where.status = 'ACTIVE'
    } else if (currentTab === 'on_hold') {
        where.status = 'ON_HOLD'
    } else if (currentTab === 'completed') {
        where.status = 'COMPLETED'
    }

    const [brands, projectsData, allProjectsCount, activeProjectsCount, totalContractValue, globalNCRCount, globalIRCount] = await Promise.all([
        db.brand.findMany({ where: { tenantId } }),
        (db as any).project.findMany({
            where,
            include: {
                brand: true,
                engineers: true,
                client: true,
                tasks: true
            },
            orderBy: { createdAt: 'desc' }
        }),
        db.project.count({ where: { tenantId } }),
        db.project.count({ where: { tenantId, status: 'ACTIVE' } }),
        (db as any).project.aggregate({
            where: { tenantId },
            _sum: { contractValue: true }
        }),
        db.nCR.count({ where: { tenantId } }),
        db.inspectionRequest.count({ where: { tenantId } })
    ])

    // Serializer for handling Prisma Decimal/Date types
    const serialize = (data: any) => JSON.parse(JSON.stringify(data))

    const projects = serialize(projectsData)
    const analytics = {
        total: allProjectsCount,
        active: activeProjectsCount,
        totalValue: totalContractValue._sum.contractValue || 0,
        ncrCount: globalNCRCount,
        irCount: globalIRCount
    }

    return (
        <div className="space-y-8 pb-20">
            {/* Premium High-Contrast Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-slate-200 pb-8">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-xl bg-slate-900 flex items-center justify-center shadow-lg">
                            <Briefcase className="h-6 w-6 text-white" />
                        </div>
                        <h1 className="text-4xl font-black tracking-tight text-slate-900">PROJECTS HUB</h1>
                    </div>
                    <p className="text-slate-500 font-medium text-lg leading-relaxed">
                        Operational Control Center for REARCH Engineering & Construction.
                    </p>
                </div>
                <Link href="/admin/projects/new">
                    <Button size="lg" className="h-14 px-10 rounded-xl bg-slate-900 text-white hover:bg-slate-800 font-black text-base shadow-xl transition-all hover:-translate-y-0.5 border-none">
                        + NEW PROJECT
                        <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                </Link>
            </div>

            {/* Sharp Contextual Analytics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="rounded-2xl border border-slate-200 shadow-sm bg-white overflow-hidden group">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4 mb-3">
                            <div className="h-10 w-10 rounded-lg bg-slate-50 text-slate-900 flex items-center justify-center border border-slate-100">
                                <Users className="h-5 w-5" />
                            </div>
                            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Resource Load</p>
                        </div>
                        <div className="flex items-baseline justify-between">
                            <h3 className="text-3xl font-black text-slate-900">{analytics.active}</h3>
                            <span className="text-xs font-bold text-slate-500 uppercase">Active Sites</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border border-slate-200 shadow-sm bg-white overflow-hidden group">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4 mb-3">
                            <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                                <ArrowUpRight className="h-5 w-5" />
                            </div>
                            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Financial Value</p>
                        </div>
                        <div className="flex items-baseline justify-between">
                            <h3 className="text-3xl font-black text-slate-900">{Number(analytics.totalValue).toLocaleString()}</h3>
                            <span className="text-xs font-bold text-slate-500 uppercase">SAR</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border border-slate-200 shadow-sm bg-white overflow-hidden group">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4 mb-3">
                            <div className="h-10 w-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center border border-red-100">
                                <AlertTriangle className="h-5 w-5" />
                            </div>
                            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">NCR Compliance</p>
                        </div>
                        <div className="flex items-baseline justify-between">
                            <h3 className="text-3xl font-black text-slate-900">{analytics.ncrCount}</h3>
                            <span className="text-xs font-bold text-slate-500 uppercase">Open Issues</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border border-slate-200 shadow-sm bg-white overflow-hidden group">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4 mb-3">
                            <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                                <ClipboardCheck className="h-5 w-5" />
                            </div>
                            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">IR Inspection</p>
                        </div>
                        <div className="flex items-baseline justify-between">
                            <h3 className="text-3xl font-black text-slate-900">{analytics.irCount}</h3>
                            <span className="text-xs font-bold text-slate-500 uppercase">Total IRs</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filter & Navigation Section */}
            <div className="sticky top-0 z-30 bg-white border-b border-slate-200 py-4 -mx-4 px-4 flex flex-col md:flex-row gap-6 justify-between items-center">
                <div className="flex items-center bg-slate-50 p-1 rounded-xl border border-slate-200 w-full md:w-auto">
                    <Link href={`/admin/projects?tab=active${brand ? `&brand=${brand}` : ''}`} className="flex-1 md:flex-none">
                        <Button variant={currentTab === 'active' ? 'default' : 'ghost'} size="sm" className="w-full rounded-lg px-8 font-black text-xs uppercase tracking-wider h-10 shadow-none">
                            Active
                        </Button>
                    </Link>
                    <Link href={`/admin/projects?tab=on_hold${brand ? `&brand=${brand}` : ''}`} className="flex-1 md:flex-none">
                        <Button variant={currentTab === 'on_hold' ? 'default' : 'ghost'} size="sm" className="w-full rounded-lg px-8 font-black text-xs uppercase tracking-wider h-10 shadow-none">
                            On Hold
                        </Button>
                    </Link>
                    <Link href={`/admin/projects?tab=completed${brand ? `&brand=${brand}` : ''}`} className="flex-1 md:flex-none">
                        <Button variant={currentTab === 'completed' ? 'default' : 'ghost'} size="sm" className="w-full rounded-lg px-8 font-black text-xs uppercase tracking-wider h-10 shadow-none">
                            Archive
                        </Button>
                    </Link>
                </div>

                <div className="flex gap-2 items-center w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                    <Link href={`/admin/projects?tab=${currentTab}`}>
                        <Button
                            variant={!brand || brand === 'all' ? "default" : "ghost"}
                            size="sm"
                            className="rounded-lg font-black text-xs uppercase h-10"
                        >
                            Global
                        </Button>
                    </Link>
                    <div className="h-4 w-px bg-slate-200 mx-1" />
                    {brands.map((b: any) => (
                        <Link key={b.id} href={`/admin/projects?brand=${b.id}&tab=${currentTab}`}>
                            <Button
                                variant={brand === b.id ? "default" : "ghost"}
                                size="sm"
                                className="rounded-lg font-black text-xs uppercase h-10 whitespace-nowrap"
                            >
                                {b.nameEn}
                            </Button>
                        </Link>
                    ))}
                </div>
            </div>

            <ProjectGrid projects={projects} />
        </div>
    )
}
