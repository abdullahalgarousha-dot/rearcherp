import { Settings, Shield, CreditCard, Building2, Users, Receipt } from "lucide-react"
import Link from "next/link"

export default function SettingsLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const navItems = [
        { label: "General Settings", href: "/admin/settings/general", icon: Settings },
        { label: "Role Management", href: "/admin/roles", icon: Shield },
        { label: "User Management", href: "/admin/users", icon: Users },
    ]

    return (
        <div className="flex flex-col h-full bg-slate-50/50">
            <div className="flex-1 flex overflow-hidden">
                {/* Main Content Area */}
                <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:ml-64 relative">
                    <div className="max-w-7xl mx-auto space-y-6">
                        {children}
                    </div>
                </main>

                {/* Persistent Right Sidebar (RTL) */}
                <aside className="hidden lg:flex w-64 flex-col border-r border-slate-200 bg-white/50 backdrop-blur-xl h-full fixed left-0 top-0 pt-20 z-10 shadow-sm">
                    <div className="px-6 py-6">
                        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">System Configuration</h2>
                        <nav className="space-y-2">
                            {navItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:text-primary hover:bg-primary/5 transition-all group font-medium"
                                >
                                    <div className="h-8 w-8 rounded-full bg-slate-50 group-hover:bg-primary/10 flex items-center justify-center transition-colors text-slate-400 group-hover:text-primary">
                                        <item.icon className="h-4 w-4" />
                                    </div>
                                    {item.label}
                                </Link>
                            ))}
                        </nav>
                    </div>

                    <div className="mt-auto p-6">
                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                            <h3 className="font-bold text-xs text-slate-900 mb-1">Security Status</h3>
                            <div className="flex items-center gap-2 mb-2">
                                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                <span className="text-[10px] text-slate-500">RBAC Active</span>
                            </div>
                            <p className="text-[10px] text-slate-400">
                                Role-Based Access Control is enforced on all modules.
                            </p>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    )
}
