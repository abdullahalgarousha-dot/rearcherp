"use client"

import { useState, useEffect } from "react"
import { Activity, Database, Cpu, HardDrive, Users, Zap } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

export default function HealthPage() {
    const [stats, setStats] = useState({
        cpu: 12,
        memory: 45,
        db: 8,
        latency: 24,
        activeSessions: 1
    })

    // Simulate real-time monitoring
    useEffect(() => {
        const interval = setInterval(() => {
            setStats(prev => ({
                cpu: Math.min(100, Math.max(5, prev.cpu + (Math.random() * 10 - 5))),
                memory: Math.min(100, Math.max(20, prev.memory + (Math.random() * 2 - 1))),
                db: Math.min(100, Math.max(2, prev.db + (Math.random() * 4 - 2))),
                latency: Math.min(500, Math.max(10, prev.latency + (Math.random() * 10 - 5))),
                activeSessions: prev.activeSessions
            }))
        }, 3000)
        return () => clearInterval(interval)
    }, [])

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-white mb-2">System Health</h1>
                <p className="text-slate-400">Real-time platform performance and resource monitoring.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                    title="Active Sessions"
                    value={stats.activeSessions.toString()}
                    icon={<Users className="h-5 w-5" />}
                    status="OPTIMAL"
                    color="text-blue-400"
                />
                <MetricCard
                    title="Avg Latency"
                    value={`${Math.round(stats.latency)}ms`}
                    icon={<Zap className="h-5 w-5" />}
                    status="EXCELLENT"
                    color="text-emerald-400"
                />
                <MetricCard
                    title="Database Load"
                    value={`${Math.round(stats.db)}%`}
                    icon={<Database className="h-5 w-5" />}
                    status="NORMAL"
                    color="text-purple-400"
                />
                <MetricCard
                    title="Storage Used"
                    value="1.2 GB"
                    icon={<HardDrive className="h-5 w-5" />}
                    status="32% CAP"
                    color="text-amber-400"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-lg text-white flex items-center gap-2">
                            <Cpu className="h-5 w-5 text-emerald-400" />
                            CPU Utilization
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">App Compute</span>
                                <span className="text-emerald-400 font-bold">{Math.round(stats.cpu)}%</span>
                            </div>
                            <Progress value={stats.cpu} className="h-2 bg-slate-800" indicatorClassName="bg-emerald-500" />
                        </div>
                        <div className="pt-4 border-t border-slate-800 grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Cores</p>
                                <p className="text-lg font-bold text-white">8 Virtual</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Architecture</p>
                                <p className="text-lg font-bold text-white">x64 Node.js</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-lg text-white flex items-center gap-2">
                            <Activity className="h-5 w-5 text-blue-400" />
                            Memory Usage
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">Heap Used</span>
                                <span className="text-blue-400 font-bold">{Math.round(stats.memory)}%</span>
                            </div>
                            <Progress value={stats.memory} className="h-2 bg-slate-800" indicatorClassName="bg-blue-500" />
                        </div>
                        <div className="pt-4 border-t border-slate-800 grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Allocated</p>
                                <p className="text-lg font-bold text-white">4.0 GB</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">RSS</p>
                                <p className="text-lg font-bold text-white">1.8 GB</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

function MetricCard({ title, value, icon, status, color }: any) {
    return (
        <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-colors">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-2 rounded-lg bg-slate-800 ${color}`}>
                    {icon}
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                    {status}
                </span>
            </div>
            <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{title}</p>
                <h3 className="text-2xl font-black text-white mt-1">{value}</h3>
            </div>
        </div>
    )
}
