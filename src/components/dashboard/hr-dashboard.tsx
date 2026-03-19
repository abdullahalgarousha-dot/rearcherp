"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { AlertCircle, FileStack, Users, Fingerprint, CalendarDays } from "lucide-react"

type HRDashboardProps = {
    employees: any[]
    recentRequests: any[]
    user: any
}

export function HRDashboard({ employees, recentRequests, user }: HRDashboardProps) {

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const activeEmployees = employees.filter(e => e); // Basic filter

    const expiringIDs = employees.filter(e => e.idExpiry && new Date(e.idExpiry) < thirtyDaysFromNow).sort((a, b) => new Date(a.idExpiry).getTime() - new Date(b.idExpiry).getTime());
    const expiringPassports = employees.filter(e => e.passportExpiry && new Date(e.passportExpiry) < thirtyDaysFromNow).sort((a, b) => new Date(a.passportExpiry).getTime() - new Date(b.passportExpiry).getTime());

    // Fallback Drive Folder ID if setting is missed. Ideally loaded from a SystemSetting,
    // assuming a standard master HR directory for Drive.
    const hrDriveFolderId = 'root' // Provide direct search later

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-gradient-to-br from-indigo-50 to-white border-indigo-100 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-bold text-indigo-800">Total Staff</CardTitle>
                        <Users className="h-4 w-4 text-indigo-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-indigo-900">{activeEmployees.length}</div>
                        <p className="text-xs text-indigo-600 mt-1 font-medium">Registered profiles</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-rose-50 to-white border-rose-100 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-bold text-rose-800">Expiring IDs</CardTitle>
                        <Fingerprint className="h-4 w-4 text-rose-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-rose-900">{expiringIDs.length}</div>
                        <p className="text-xs text-rose-600 mt-1 font-medium">Within 30 days or expired</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-orange-50 to-white border-orange-100 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-bold text-orange-800">Expiring Passports</CardTitle>
                        <FileStack className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-orange-900">{expiringPassports.length}</div>
                        <p className="text-xs text-orange-600 mt-1 font-medium">Within 30 days or expired</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-cyan-50 to-white border-cyan-100 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-bold text-cyan-800">Pending Requests</CardTitle>
                        <CalendarDays className="h-4 w-4 text-cyan-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-cyan-900">{recentRequests.filter(r => r.status === 'PENDING').length}</div>
                        <p className="text-xs text-cyan-600 mt-1 font-medium">Leaves & Loans awaiting action</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="shadow-lg border-rose-200">
                    <CardHeader className="bg-rose-50 border-b border-rose-100 rounded-t-xl flex flex-row items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-lg text-rose-800">
                            <AlertCircle className="h-5 w-5" />
                            Document Expiry Tracker
                        </CardTitle>
                        <Button variant="outline" size="sm" className="h-8 border-rose-200 text-rose-700 hover:bg-rose-100" asChild>
                            <a href={`https://drive.google.com/drive/search?q=type:folder`} target="_blank" rel="noopener noreferrer">
                                Open Official Drive Folder ↗
                            </a>
                        </Button>
                    </CardHeader>
                    <CardContent className="p-0">
                        {expiringIDs.length === 0 && expiringPassports.length === 0 ? (
                            <div className="p-8 text-center text-rose-500 font-medium">No documents expiring soon. All clear!</div>
                        ) : (
                            <div className="divide-y divide-rose-100 max-h-[400px] overflow-y-auto">
                                {/* IDs */}
                                {expiringIDs.map((emp) => {
                                    const isExpired = new Date(emp.idExpiry) < now;
                                    return (
                                        <div key={`id-${emp.id}`} className="p-4 hover:bg-rose-50/50 transition-colors flex justify-between items-center">
                                            <div>
                                                <h4 className="font-bold text-slate-900">{emp.user?.name || 'Unknown'}</h4>
                                                <p className="text-xs text-slate-500 mt-1">ID: {emp.idNumber || 'N/A'}</p>
                                            </div>
                                            <div className="text-right flex flex-col items-end gap-1">
                                                <Badge variant="destructive" className={isExpired ? "animate-pulse" : "bg-rose-500"}>
                                                    {isExpired ? 'ID EXPIRED' : 'ID Expiring'}
                                                </Badge>
                                                <span className="text-[10px] uppercase font-bold text-rose-600">
                                                    {new Date(emp.idExpiry).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                    )
                                })}

                                {/* Passports */}
                                {expiringPassports.map((emp) => {
                                    const isExpired = new Date(emp.passportExpiry) < now;
                                    return (
                                        <div key={`pass-${emp.id}`} className="p-4 hover:bg-orange-50/50 transition-colors flex justify-between items-center bg-orange-50/30">
                                            <div>
                                                <h4 className="font-bold text-slate-900">{emp.user?.name || 'Unknown'}</h4>
                                                <p className="text-xs text-slate-500 mt-1">Passport: {emp.passportNum || 'N/A'}</p>
                                            </div>
                                            <div className="text-right flex flex-col items-end gap-1">
                                                <Badge variant="outline" className="text-orange-600 border-orange-200 bg-white">
                                                    {isExpired ? 'PASSPORT EXPIRED' : 'Passport Expiring'}
                                                </Badge>
                                                <span className="text-[10px] uppercase font-bold text-orange-600">
                                                    {new Date(emp.passportExpiry).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="shadow-lg border-slate-200">
                    <CardHeader className="bg-slate-50 border-b border-slate-100 rounded-t-xl">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <CalendarDays className="h-5 w-5 text-slate-500" />
                            Recent HR Inbox Activity
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {recentRequests.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 font-medium">No recent requests.</div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {recentRequests.slice(0, 6).map((req) => (
                                    <div key={req.id} className="p-4 hover:bg-slate-50 transition-colors flex justify-between items-center group">
                                        <div>
                                            <h4 className="font-bold text-slate-900">{req.user?.name}</h4>
                                            <p className="text-xs text-slate-500 mt-1 uppercase font-bold tracking-wider">{req.type || 'Leave Request'}</p>
                                        </div>
                                        <div className="text-right flex gap-3 items-center">
                                            <Badge variant={req.status === 'APPROVED' ? 'default' : req.status === 'REJECTED' ? 'destructive' : 'secondary'}>
                                                {req.status}
                                            </Badge>
                                            <Link href="/admin/hr/requests">
                                                <Button variant="outline" size="sm" className="h-7 text-xs font-bold border-slate-200 rounded-lg">View</Button>
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
