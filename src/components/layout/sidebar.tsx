"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Users, Briefcase, Settings, LogOut, Building2, ChevronDown } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { signOut } from "next-auth/react"
import { useState } from "react"
import { NotificationBell } from "@/components/layout/notification-bell"

const sidebarItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Projects", href: "/admin/projects", icon: Briefcase },
    { name: "Brands", href: "/admin/brands", icon: Building2 },
    { name: "Users", href: "/admin/users", icon: Users },
    { name: "Settings", href: "/admin/settings/general", icon: Settings },
]

interface SidebarProps {
    className?: string
    menuLinks?: any[]
    settings?: any
    user?: any
}

import * as Icons from "lucide-react"

export function Sidebar({ className, menuLinks = [], settings, user }: SidebarProps) {
    const pathname = usePathname()
    const [expandedItems, setExpandedItems] = useState<string[]>([])

    const toggleExpand = (label: string) => {
        setExpandedItems(prev =>
            prev.includes(label) ? prev.filter(i => i !== label) : [...prev, label]
        )
    }

    // Process items to support nesting
    const items = menuLinks.map(link => ({
        name: link.label,
        href: link.href,
        icon: (Icons as any)[link.icon] || Icons.Circle,
        children: link.children?.map((child: any) => ({
            name: child.label,
            href: child.href,
            icon: (Icons as any)[child.icon] || Icons.Circle
        }))
    }))

    return (
        <aside className={cn("h-full w-64 bg-primary/95 text-white flex flex-col", className)}>
            <div className="absolute inset-0 bg-primary/95 backdrop-blur-xl border-l border-white/10 shadow-2xl -z-10" />

            <div className="relative h-full flex flex-col p-6 text-primary-foreground z-10">
                <div className="mb-10 flex items-center gap-3">
                    {settings?.logoUrl ? (
                        <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center shadow-lg overflow-hidden p-1">
                            <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                        </div>
                    ) : (
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-accent to-yellow-600 flex items-center justify-center shadow-lg shadow-accent/20">
                            <Building2 className="h-6 w-6 text-white" />
                        </div>
                    )}
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{settings?.companyNameEn || 'ERP'}</h1>
                        <p className="text-xs text-primary-foreground/60">{settings?.companyNameAr || 'Architectural & Eng.'}</p>
                    </div>
                </div>

                <nav className="flex-1 space-y-2 overflow-y-auto custom-scrollbar pr-2">
                    {items.map((item) => {
                        const hasChildren = item.children && item.children.length > 0
                        const isActive = pathname.startsWith(item.href) && !hasChildren
                        const isExpanded = expandedItems.includes(item.name)
                        const Icon = item.icon

                        if (hasChildren) {
                            return (
                                <div key={item.name} className="space-y-1">
                                    <button
                                        onClick={() => toggleExpand(item.name)}
                                        className={cn(
                                            "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 hover:bg-white/5",
                                            isExpanded ? "text-white" : "text-primary-foreground/70"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Icon className="h-5 w-5" />
                                            <span className="font-medium">{item.name}</span>
                                        </div>
                                        <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", isExpanded && "rotate-180")} />
                                    </button>

                                    <AnimatePresence>
                                        {isExpanded && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden pl-4 space-y-1"
                                            >
                                                {item.children.map((child: any) => {
                                                    const isChildActive = pathname === child.href
                                                    return (
                                                        <Link
                                                            key={child.href}
                                                            href={child.href}
                                                            className={cn(
                                                                "flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-colors",
                                                                isChildActive ? "text-accent bg-white/5 font-bold" : "text-primary-foreground/50 hover:text-white"
                                                            )}
                                                        >
                                                            <child.icon className="h-4 w-4" />
                                                            <span>{child.name}</span>
                                                        </Link>
                                                    )
                                                })}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )
                        }

                        return (
                            <Link key={item.href} href={item.href} className="block relative group">
                                {isActive && (
                                    <motion.div
                                        layoutId="activeTab"
                                        className="absolute inset-0 bg-white/10 rounded-xl"
                                        initial={false}
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    />
                                )}
                                <div className={cn(
                                    "relative flex items-center gap-3 px-4 py-3 rounded-xl transition-colors duration-200",
                                    isActive ? "text-accent" : "text-primary-foreground/70 group-hover:text-white"
                                )}>
                                    <Icon className={cn("h-5 w-5", isActive && "text-accent")} />
                                    <span className="font-medium">{item.name}</span>

                                    {isActive && (
                                        <motion.div
                                            className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-accent rounded-l-full"
                                            layoutId="activeIndicator"
                                        />
                                    )}
                                </div>
                            </Link>
                        )
                    })}
                </nav>

                <div className="pt-6 border-t border-white/10">
                    <div className="flex items-center justify-between px-4 pb-3">
                        <span className="text-xs text-primary-foreground/40 font-medium">Notifications</span>
                        <NotificationBell />
                    </div>
                    <button
                        onClick={() => signOut({ callbackUrl: "/login" })}
                        className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-primary-foreground/70 hover:bg-white/5 hover:text-red-400 transition-colors"
                    >
                        <LogOut className="h-5 w-5" />
                        <span className="font-medium">Sign Out</span>
                    </button>
                    <div className="mt-4 px-4 flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center border border-accent/50">
                            <span className="text-xs font-bold text-accent">
                                {user?.name?.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || 'AD'}
                            </span>
                        </div>
                        <div>
                            <p className="text-sm font-medium">{user?.name || 'Admin User'}</p>
                            <p className="text-xs text-primary-foreground/50">{user?.email || 'admin@fts.com'}</p>
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    )
}
