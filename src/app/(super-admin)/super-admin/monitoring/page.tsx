import { db } from "@/lib/db"
import { Activity, Clock, Database, Globe, Layers, Users } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

async function getHealthData() {
    try {
        const startTime = Date.now()
        await (db as any).$queryRaw`SELECT 1`
        const latency = Date.now() - startTime

        const [tenants, users, activeSessions] = await Promise.all([
            (db as any).tenant.count(),
            (db as any).user.count(),
            (db as any).tenant.count({ where: { status: 'ACTIVE' } })
        ])

        const recentLogs = await (db as any).systemLog?.findMany({
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: { user: true }
        }) || []

        return {
            status: "Healthy",
            latency: `${latency}ms`,
            metrics: {
                tenants,
                activeTenants: activeSessions,
                totalUsers: users
            },
            recentLogs
        }
    } catch (e) {
        return { status: "Critical", latency: "N/A", metrics: {}, recentLogs: [] }
    }
}

export default async function MonitoringPage() {
    const data = await getHealthData()

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight text-slate-100 font-sans">System Health & Pulse</h1>
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${data.status === 'Healthy' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                    System {data.status}
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-slate-900 border-slate-800 shadow-xl">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-slate-400">DB Latency</CardTitle>
                        <Database className="h-4 w-4 text-emerald-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-100">{data.latency}</div>
                        <p className="text-xs text-slate-500 mt-1">Direct query response</p>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900 border-slate-800 shadow-xl">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-slate-400">Total Tenants</CardTitle>
                        <Globe className="h-4 w-4 text-blue-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-100">{data.metrics.tenants}</div>
                        <p className="text-xs text-slate-500 mt-1">{data.metrics.activeTenants} active currently</p>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900 border-slate-800 shadow-xl">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-slate-400">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-purple-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-100">{data.metrics.totalUsers}</div>
                        <p className="text-xs text-slate-500 mt-1">Across all instances</p>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900 border-slate-800 shadow-xl">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-slate-400">Uptime</CardTitle>
                        <Clock className="h-4 w-4 text-amber-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-100">99.9%</div>
                        <p className="text-xs text-slate-500 mt-1">Last 30 days avg</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="bg-slate-900 border-slate-800">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Activity className="h-5 w-5 text-accent" />
                            <CardTitle className="text-lg text-slate-100">Live Activity Feed</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {data.recentLogs.length > 0 ? (
                                data.recentLogs.map((log: any) => (
                                    <div key={log.id} className="flex items-start gap-3 border-l-2 border-slate-800 pl-3 py-1">
                                        <div className="flex-1">
                                            <p className="text-sm text-slate-200">
                                                <span className="font-semibold">{log.user?.name}</span> {log.action}
                                            </p>
                                            <p className="text-xs text-slate-500">{new Date(log.createdAt).toLocaleTimeString()}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-slate-500 italic">No recent activity logged.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900 border-slate-800">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Layers className="h-5 w-5 text-blue-400" />
                            <CardTitle className="text-lg text-slate-100">Resource Usage</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Database Storage</span>
                                    <span className="text-slate-200">12%</span>
                                </div>
                                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500 w-[12%]" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Media Assets</span>
                                    <span className="text-slate-200">45%</span>
                                </div>
                                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-purple-500 w-[45%]" />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
