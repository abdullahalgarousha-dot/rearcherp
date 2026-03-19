"use client"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu } from "lucide-react"
import { Sidebar } from "./sidebar"
import { useState } from "react"

export function MobileSidebar({ menuLinks, settings, user }: { menuLinks: any[], settings?: any, user?: any }) {
    const [open, setOpen] = useState(false)

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-6 w-6" />
                </Button>
            </SheetTrigger>
            <SheetContent side="right" className="p-0 border-l border-white/10 bg-transparent w-72">
                {/* Reuse existing Sidebar content logic or wrapper */}
                <div className="h-full w-full">
                    <Sidebar menuLinks={menuLinks} settings={settings} user={user} />
                </div>
            </SheetContent>
        </Sheet>
    )
}
