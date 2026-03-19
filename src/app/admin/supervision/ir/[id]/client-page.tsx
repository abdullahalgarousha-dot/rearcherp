"use client"

import { useState } from "react"
import { BackButton } from "@/components/ui/back-button"
import { Badge } from "@/components/ui/badge"
import { PrintLayout } from "@/components/common/print-layout"
import { RevisionTimeline } from "@/components/supervision/revision-timeline"
import { RevisionWorkspace } from "@/components/supervision/revision-workspace"
import { IRActionPanel } from "@/components/supervision/ir-action-panel"
import { PDFExportButton } from "@/components/supervision/pdf-export-button"
import { Separator } from "@/components/ui/separator"
import { format } from "date-fns"

interface ClientIRPageProps {
    ir: any
    userRole: string
}

export default function ClientIRPage({ ir, userRole }: ClientIRPageProps) {
    // Default to the latest revision (which is ir.currentRev)
    // Note: revisions array might be empty if it's a legacy IR, handle gracefully
    const [activeRevNum, setActiveRevNum] = useState<number>(ir.currentRev)

    // Find the active revision object
    const activeRevision = ir.revisions.find((r: any) => r.revNumber === activeRevNum)

    // If no revision found (legacy data), construct a mock one from legacy fields (if needed)
    // But since we did a hard cutover, we expect revisions. 
    // If not found, show empty state.

    return (
        <div className="flex flex-col h-screen bg-slate-50 overflow-hidden rtl:text-right font-sans">
            {/* Top Bar (No Print) */}
            <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 no-print">
                <div className="flex items-center gap-4">
                    <BackButton />
                    <div className="flex flex-col">
                        <h1 className="text-lg font-black text-slate-800 flex items-center gap-2">
                            {ir.officeRef || "New IR"}
                            <Badge variant={ir.status === 'APPROVED' ? 'default' : 'secondary'} className="text-xs">
                                {ir.status}
                            </Badge>
                        </h1>
                        <p className="text-xs text-slate-500 font-medium">
                            {ir.project.name} • {ir.contractor.name}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <PDFExportButton elementId="print-content" fileName={`IR-${ir.officeRef}`} />
                </div>
            </header>

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* 1. Timeline Sidebar */}
                <RevisionTimeline
                    revisions={ir.revisions}
                    activeRev={activeRevNum}
                    onSelectRev={setActiveRevNum}
                    currentParentStatus={ir.status}
                />

                {/* 2. Workspace (Middle) */}
                <div className="flex-1 flex flex-col bg-slate-100/50 overflow-hidden relative">
                    {/* The Action Panel stays at the bottom or top? 
                        Let's put it at the bottom for "Action Taken" feel, 
                        or top for visibility. Bottom is standard for "Review then Act".
                    */}

                    <div className="flex-1 overflow-y-auto p-4 md:p-8">
                        {/* Printable Area Wrapper */}
                        <div id="print-content">
                            <PrintLayout
                                brand={ir.project.brand}
                                project={ir.project}
                                documentTitle="Inspection Request | طلب فحص أعمال"
                                documentCode={ir.officeRef}
                                className="min-h-0 pb-0 bg-transparent print:bg-white" // Override defaults for screen view
                            >
                                {/* IR Details Content (The "Letter") */}
                                <div className="space-y-6">
                                    {/* Info Grid */}
                                    <div className="grid grid-cols-2 gap-x-12 gap-y-4 mb-6">
                                        <div className="space-y-1">
                                            <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Date | التاريخ</span>
                                            <p className="font-bold text-slate-800">{format(new Date(ir.date), 'dd/MM/yyyy')}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Type | النوع</span>
                                            <p className="font-bold text-slate-800">{ir.type}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Extension / Ref</span>
                                            <p className="font-bold text-slate-800">{ir.contractorRef || "-"}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Location | الموقع</span>
                                            <p className="font-bold text-slate-800">{ir.location || "General"}</p>
                                        </div>
                                    </div>

                                    <Separator className="my-6" />

                                    {/* Subject */}
                                    <div className="space-y-2">
                                        <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Description | الوصف</span>
                                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-sm font-medium leading-relaxed text-slate-800 whitespace-pre-wrap">
                                            {ir.description}
                                        </div>
                                    </div>

                                    <div className="h-8"></div>

                                    {/* Signatures */}
                                    <div className="grid grid-cols-2 gap-12 mt-12 break-inside-avoid">
                                        <div className="space-y-8">
                                            <p className="text-xs font-bold text-slate-900 uppercase">Contractor Representative</p>
                                            <div className="h-px bg-slate-200"></div>
                                            <p className="text-[10px] text-slate-500">Name & Signature / Date</p>
                                        </div>
                                        <div className="space-y-8">
                                            <p className="text-xs font-bold text-slate-900 uppercase">Consultant Representative</p>

                                            {/* Digital Stamp if Approved */}
                                            {ir.status === 'APPROVED' && activeRevNum === ir.currentRev ? (
                                                <div className="relative border-4 border-emerald-600 rounded-lg p-2 w-48 rotate-[-5deg] opacity-80">
                                                    <div className="text-center">
                                                        <p className="text-emerald-800 font-black text-lg uppercase">APPROVED</p>
                                                        <p className="text-emerald-700 text-[10px] font-bold">{ir.project.brand.shortName || "CONSULTANT"}</p>
                                                        <p className="text-emerald-600 text-[9px]">{format(new Date(), 'dd/MM/yyyy')}</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="h-16"></div>
                                            )}

                                            <div className="h-px bg-slate-200"></div>
                                            <p className="text-[10px] text-slate-500">Name & Signature / Date</p>
                                        </div>
                                    </div>
                                </div>
                            </PrintLayout>
                        </div>
                    </div>

                    {/* Action Panel (Sticky Bottom) - Only show if viewing the LATEST revision */}
                    {activeRevNum === ir.currentRev && (
                        <IRActionPanel ir={ir} userRole={userRole} currentRev={ir.currentRev} />
                    )}
                </div>

                {/* 3. Document Workspace (Right/Left Split) - Collapsible/Resizeable? 
                    For now, a fixed width or 50% split. 
                    Let's make it a 40% panel on the left (RTL: right).
                */}
                <div className="w-[450px] border-r border-slate-200 bg-white shadow-xl z-20 flex flex-col no-print">
                    <div className="p-4 border-b">
                        <h3 className="font-bold text-slate-800">Documents Workspace</h3>
                    </div>
                    <RevisionWorkspace revision={activeRevision} />
                </div>
            </div>
        </div>
    )
}
