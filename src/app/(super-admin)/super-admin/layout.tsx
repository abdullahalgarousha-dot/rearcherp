export const dynamic = 'force-dynamic';

import { redirect } from "next/navigation"
import { auth } from "@/auth"
import Link from "next/link"
import { Building2, Activity, Settings, Users, LogOut, Package } from "lucide-react"

export default async function SuperAdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await auth()

    // In our new RBAC, only GLOBAL_SUPER_ADMIN can access this layout
    if (!session?.user || (session.user as any).role !== 'GLOBAL_SUPER_ADMIN') {
        redirect("/super-login?access=secure")
    }

    return (
        <div className="flex min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-emerald-500/30">
            {/* Sidebar Command Pit */}
            <aside className="w-64 border-r border-slate-800 bg-slate-900/50 backdrop-blur-xl flex flex-col">
                <div className="p-6 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-emerald-500 flex items-center justify-center font-black text-slate-950">
                            R
                        </div>
                        <div>
                            <h1 className="font-bold tracking-tight text-white leading-tight">REARCH</h1>
                            <p className="text-[10px] font-medium text-emerald-400 uppercase tracking-widest">Command Pit</p>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    <Link href="/super-admin/dashboard" className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 font-medium">
                        <Building2 className="h-4 w-4" />
                        Tenants
                    </Link>
                    <Link href="/super-admin/monitoring" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-slate-50 hover:bg-slate-800/50 transition-colors">
                        <Activity className="h-4 w-4" />
                        System Monitoring
                    </Link>
                    <Link href="/super-admin/plans" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-slate-50 hover:bg-slate-800/50 transition-colors">
                        <Package className="h-4 w-4" />
                        Subscription Plans
                    </Link>
                    <Link href="/super-admin/users" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-slate-50 hover:bg-slate-800/50 transition-colors">
                        <Users className="h-4 w-4" />
                        Global Admins
                    </Link>
                    <Link href="/super-admin/settings" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-slate-50 hover:bg-slate-800/50 transition-colors">
                        <Settings className="h-4 w-4" />
                        Platform Settings
                    </Link>
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors">
                        <LogOut className="h-4 w-4" />
                        Exit to ERP
                    </Link>
                    <div className="mt-4 px-3 flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold">
                            SA
                        </div>
                        <div>
                            <p className="text-xs font-medium text-white">Super Admin</p>
                            <p className="text-[10px] text-slate-500">{session.user.email}</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto w-full relative">
                {/* Background glow effect */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-64 bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />

                <div className="p-8 relative z-10 w-full">
                    {children}
                </div>
            </main>
        </div>
    )
}
