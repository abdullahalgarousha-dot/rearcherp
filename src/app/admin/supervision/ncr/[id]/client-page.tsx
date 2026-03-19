"use client"

import { useState } from "react"
import { BackButton } from "@/components/ui/back-button"
import { Badge } from "@/components/ui/badge"
import { PrintLayout } from "@/components/common/print-layout"
import { RevisionTimeline } from "@/components/supervision/revision-timeline"
import { RevisionWorkspace } from "@/components/supervision/revision-workspace"
import { NCRActionPanel } from "@/components/supervision/ncr-action-panel"
import { PDFExportButton } from "@/components/supervision/pdf-export-button"
import { Separator } from "@/components/ui/separator"
import { format } from "date-fns"

interface ClientNCRPageProps {
    ncr: any
    userRole: string
}

export default function ClientNCRPage({ ncr, userRole }: ClientNCRPageProps) {
    const [activeRevNum, setActiveRevNum] = useState<number>(ncr.currentRev)
    const activeRevision = ncr.revisions.find((r: any) => r.revNumber === activeRevNum)

    return (
        <div className="flex flex-col h-screen bg-slate-50 overflow-hidden rtl:text-right font-sans">
            {/* Top Bar (No Print) */}
            <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 no-print">
                <div className="flex items-center gap-4">
                    <BackButton />
                    <div className="flex flex-col">
                        <h1 className="text-lg font-black text-slate-800 flex items-center gap-2">
                            {ncr.officeRef || "New NCR"}
                            <Badge variant={ncr.status === 'CLOSED' ? 'default' : 'destructive'} className="text-xs">
                                {ncr.status}
                            </Badge>
                        </h1>
                        <p className="text-xs text-slate-500 font-medium">
                            {ncr.project.name} • {ncr.contractor?.companyName}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <PDFExportButton elementId="print-content" fileName={`NCR-${ncr.officeRef}`} />
                </div>
            </header>

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* 1. Timeline Sidebar */}
                <RevisionTimeline
                    revisions={ncr.revisions}
                    activeRev={activeRevNum}
                    onSelectRev={setActiveRevNum}
                    currentParentStatus={ncr.status}
                />

                {/* 2. Workspace (Middle) */}
                <div className="flex-1 flex flex-col bg-slate-100/50 overflow-hidden relative">
                    <div className="flex-1 overflow-y-auto p-4 md:p-8">
                        {/* Printable Area Wrapper */}
                        <div id="print-content">
                            <PrintLayout
                                brand={ncr.project.brand}
                                project={ncr.project}
                                documentTitle="Non-Conformance Report | تقرير عدم مطابقة"
                                documentCode={ncr.officeRef}
                                className="min-h-0 pb-0 bg-transparent print:bg-white"
                            >
                                {/* NCR Details Content */}
                                <div className="space-y-6">
                                    {/* Info Grid */}
                                    <div className="grid grid-cols-2 gap-x-12 gap-y-4 mb-6">
                                        <div className="space-y-1">
                                            <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Date | التاريخ</span>
                                            <p className="font-bold text-slate-800">{format(new Date(ncr.createdAt), 'dd/MM/yyyy')}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Severity | الخطورة</span>
                                            <Badge variant={ncr.severity === 'CRITICAL' ? 'destructive' : 'outline'}>{ncr.severity}</Badge>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Location | الموقع</span>
                                            <p className="font-bold text-slate-800">{ncr.location || "General"}</p>
                                        </div>
                                    </div>

                                    <Separator className="my-6" />

                                    {/* Subject */}
                                    <div className="space-y-2">
                                        <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Defect Description | وصف المخالفة</span>
                                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-sm font-medium leading-relaxed text-slate-800 whitespace-pre-wrap">
                                            {ncr.description}
                                        </div>
                                    </div>

                                    {/* Root Cause */}
                                    {ncr.rootCause && (
                                        <div className="space-y-2">
                                            <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Root Cause | السبب الجذري</span>
                                            <div className="bg-amber-50 p-4 rounded-lg border border-amber-100 text-sm font-medium leading-relaxed text-slate-800 whitespace-pre-wrap">
                                                {ncr.rootCause}
                                            </div>
                                        </div>
                                    )}

                                    <div className="h-8"></div>

                                    {/* Signatures */}
                                    <div className="grid grid-cols-2 gap-12 mt-12 break-inside-avoid">
                                        <div className="space-y-8">
                                            <p className="text-xs font-bold text-slate-900 uppercase">Issuer (Consultant)</p>
                                            <div className="h-px bg-slate-200"></div>
                                            <p className="text-[10px] text-slate-500">Name & Signature / Date</p>
                                        </div>
                                        <div className="space-y-8">
                                            <p className="text-xs font-bold text-slate-900 uppercase">Received By (Contractor)</p>
                                            <div className="h-px bg-slate-200"></div>
                                            <p className="text-[10px] text-slate-500">Name & Signature / Date</p>
                                        </div>
                                    </div>

                                    {/* Closure Section (If Closed) */}
                                    {ncr.status === 'CLOSED' && (
                                        <div className="mt-8 border-t-2 border-slate-900 pt-8 break-inside-avoid">
                                            <h3 className="text-sm font-black text-emerald-800 uppercase mb-4">Closure Verification | إغلاق التقرير</h3>
                                            <p className="text-xs text-slate-600 mb-8">
                                                The corrective action has been verified and found satisfactory. This Non-Conformance Report is hereby closed.
                                                <br />
                                                تم التحقق من الإجراء تصحيحي، ونعتبر هذا التقرير مغلقاً.
                                            </p>
                                            <div className="flex gap-4 items-center">
                                                <div className="relative border-4 border-emerald-600 rounded-full w-24 h-24 flex items-center justify-center rotate-[-15deg] opacity-80">
                                                    <div className="text-center">
                                                        <p className="text-emerald-800 font-black text-xs uppercase">CLOSED</p>
                                                        <p className="text-emerald-600 text-[9px]">{format(new Date(), 'dd/MM/yyyy')}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </PrintLayout>
                        </div>
                    </div>

                    {/* Action Panel */}
                    {activeRevNum === ncr.currentRev && (
                        <NCRActionPanel ncr={ncr} userRole={userRole} currentRev={ncr.currentRev} />
                    )}
                </div>

                {/* 3. Document Workspace */}
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
