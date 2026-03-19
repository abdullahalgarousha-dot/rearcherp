import {
    Home,
    ClipboardList,
    ShieldAlert,
    Calendar as CalendarIcon,
    Plus,
    FileText,
    Wallet,
    MessageSquare,
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { usePathname } from "next/navigation"
export function BottomNav() {
    const pathname = usePathname()

    const navItems = [
        { label: "الرئيسية", icon: Home, href: "/admin/hr", active: pathname === "/admin/hr" },
        { label: "طلباتي", icon: ClipboardList, href: "/admin/hr/requests", active: pathname === "/admin/hr/requests" },
        { label: "الجزاءات", icon: ShieldAlert, href: "/admin/hr/penalties", active: pathname === "/admin/hr/penalties" },
        { label: "جدولي", icon: CalendarIcon, href: "/admin/hr/schedule", active: pathname === "/admin/hr/schedule" },
    ]

    const requestIcons = {
        LEAVE: CalendarIcon,
        LOAN: Wallet,
        DOCUMENT: FileText,
        COMPLAINT: MessageSquare
    }

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-100 flex justify-around items-center h-20 px-4 pb-2 z-50 md:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
            {navItems.slice(0, 2).map((item) => (
                <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                        "flex flex-col items-center gap-1 transition-all",
                        item.active ? "text-primary" : "text-slate-400"
                    )}
                >
                    <item.icon size={24} className={cn(item.active ? "scale-110" : "")} />
                    <span className="text-[10px] font-bold">{item.label}</span>
                </Link>
            ))}

            <Link href="/admin/hr/requests" className="-translate-y-8 cursor-pointer relative group">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl group-hover:bg-primary/40 transition-all" />
                <button className="relative w-16 h-16 bg-primary rounded-full flex items-center justify-center text-white shadow-xl shadow-primary/30 active:scale-95 transition-transform border-4 border-white">
                    <Plus size={32} />
                </button>
            </Link>

            {navItems.slice(2).map((item) => (
                <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                        "flex flex-col items-center gap-1 transition-all",
                        item.active ? "text-primary" : "text-slate-400"
                    )}
                >
                    <item.icon size={24} className={cn(item.active ? "scale-110" : "")} />
                    <span className="text-[10px] font-bold">{item.label}</span>
                </Link>
            ))}
        </div>
    )
}
