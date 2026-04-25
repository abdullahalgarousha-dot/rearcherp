"use client"

import { useState, useEffect, useTransition, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Bell, Check, CheckCheck, Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import {
    getUnreadNotifications,
    markNotificationRead,
    markAllNotificationsRead,
} from "@/app/admin/tasks/actions"

interface Notification {
    id: string
    title: string
    message: string
    type: string
    link: string | null
    isRead: boolean
    createdAt: string
}

const TYPE_COLORS: Record<string, string> = {
    TASK_ASSIGNED: 'bg-indigo-500',
    TASK_COMMENT: 'bg-violet-500',
    TASK_DEADLINE: 'bg-red-500',
    TASK: 'bg-blue-500',
}

export function NotificationBell() {
    const router = useRouter()
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [open, setOpen] = useState(false)
    const [isPending, startTransition] = useTransition()

    const fetchNotifications = useCallback(() => {
        getUnreadNotifications().then(data => setNotifications(data as Notification[]))
    }, [])

    // Initial fetch + poll every 30 seconds
    useEffect(() => {
        fetchNotifications()
        const interval = setInterval(fetchNotifications, 30_000)
        return () => clearInterval(interval)
    }, [fetchNotifications])

    function handleOpen(isOpen: boolean) {
        setOpen(isOpen)
        if (isOpen) fetchNotifications()
    }

    function handleClick(notification: Notification) {
        // Mark as read
        startTransition(async () => {
            await markNotificationRead(notification.id)
            setNotifications(prev => prev.filter(n => n.id !== notification.id))
        })

        // Navigate to link (task board with taskId)
        if (notification.link) {
            router.push(notification.link)
        }
        setOpen(false)
    }

    function handleMarkAllRead() {
        startTransition(async () => {
            await markAllNotificationsRead()
            setNotifications([])
        })
    }

    const count = notifications.length

    return (
        <Popover open={open} onOpenChange={handleOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative h-9 w-9 text-primary-foreground/70 hover:text-white hover:bg-white/10 rounded-xl"
                    aria-label={`Notifications${count > 0 ? ` (${count} unread)` : ''}`}
                >
                    <Bell className="h-5 w-5" />
                    {count > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white leading-none">
                            {count > 9 ? '9+' : count}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent
                align="end"
                className="w-80 p-0 shadow-2xl border-0 rounded-2xl overflow-hidden"
                sideOffset={8}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white">
                    <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4 text-slate-300" />
                        <span className="font-bold text-sm">Notifications</span>
                        {count > 0 && (
                            <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                                {count}
                            </span>
                        )}
                    </div>
                    {count > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[11px] text-slate-400 hover:text-white gap-1 px-2"
                            onClick={handleMarkAllRead}
                            disabled={isPending}
                        >
                            <CheckCheck className="h-3 w-3" />
                            Mark all read
                        </Button>
                    )}
                </div>

                {/* Notification list */}
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {isPending && notifications.length === 0 && (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
                        </div>
                    )}

                    {!isPending && notifications.length === 0 && (
                        <div className="py-10 text-center">
                            <Check className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                            <p className="text-sm font-semibold text-slate-700">All caught up!</p>
                            <p className="text-xs text-slate-400 mt-0.5">No unread notifications.</p>
                        </div>
                    )}

                    {notifications.map(n => (
                        <button
                            key={n.id}
                            className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors group"
                            onClick={() => handleClick(n)}
                        >
                            <div className="flex items-start gap-3">
                                <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", TYPE_COLORS[n.type] || 'bg-slate-400')} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-slate-900 leading-tight">{n.title}</p>
                                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">{n.message}</p>
                                    <p className="text-[10px] text-slate-300 mt-1">
                                        {new Date(n.createdAt).toLocaleString('en-GB', {
                                            day: '2-digit', month: 'short',
                                            hour: '2-digit', minute: '2-digit'
                                        })}
                                    </p>
                                </div>
                                <X className="h-3 w-3 text-slate-300 group-hover:text-slate-500 shrink-0 mt-0.5 transition-colors" />
                            </div>
                        </button>
                    ))}
                </div>

                {/* Footer */}
                {count > 0 && (
                    <div className="px-4 py-2 bg-slate-50 border-t border-slate-100">
                        <Button
                            variant="link"
                            className="h-auto p-0 text-xs text-indigo-600 font-semibold"
                            onClick={() => { router.push('/admin/tasks'); setOpen(false) }}
                        >
                            View all tasks →
                        </Button>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    )
}
