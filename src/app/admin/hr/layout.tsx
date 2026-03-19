export default function HRLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex flex-col h-full bg-slate-50/50">
            {/* Mobile/Tablet Helper Text - Hidden on Desktop */}
            <div className="lg:hidden p-4 bg-amber-50 border-b border-amber-100 text-amber-800 text-sm text-center">
                For the best executive experience, please view on a larger screen.
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Main Content Area - No Legacy Sidebar */}
                <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
                    <div className="max-w-7xl mx-auto space-y-6">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    )
}
