import React from 'react';
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface PrintLayoutProps {
    children: React.ReactNode;
    brand: {
        nameEn: string;
        fullName?: string;
        logo?: string;
        logoUrl?: string;
        crNumber?: string;
        vatNumber?: string;
    } | null;
    project: {
        name: string;
        code: string;
    } | null;
    documentTitle: string; // e.g., "Inspection Request"
    documentCode?: string; // e.g., "SUD-IR-2026-001"
    className?: string;
}

export const PrintLayout = ({
    children,
    brand,
    project,
    documentTitle,
    documentCode,
    className
}: PrintLayoutProps) => {
    return (
        <div className={cn(
            "min-h-screen bg-gray-50/50 pb-20 print:bg-white print:pb-0 font-sans rtl:text-right",
            className
        )}>
            {/* A4 Container */}
            <div className="invoice-container max-w-[210mm] mx-auto bg-white p-[20mm] shadow-lg my-8 rounded-lg border border-gray-200 text-slate-900 relative">

                {/* Header */}
                <header className="flex justify-between items-start mb-8 pb-6 border-b-4 border-slate-900">
                    {/* Left: Document Info */}
                    <div className="w-1/2 space-y-2 text-left rtl:text-right">
                        <div>
                            <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">{documentTitle}</span>
                            <h2 className="text-2xl font-black text-slate-900 leading-tight">{documentCode || "DRAFT"}</h2>
                        </div>
                        {project && (
                            <div className="flex gap-8">
                                <div>
                                    <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Project</span>
                                    <p className="text-sm font-bold text-slate-700">{project.name}</p>
                                    <p className="text-xs text-slate-500">{project.code}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right: Branding */}
                    <div className="w-1/2 flex flex-col items-end text-right">
                        {brand?.logoUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={brand.logoUrl} alt="Brand Logo" className="h-16 w-auto object-contain mb-2" />
                        )}
                        <h2 className="text-lg font-bold text-slate-800">{brand?.fullName || brand?.nameEn || "Consultant"}</h2>
                        <div className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold flex flex-col gap-0.5">
                            {brand?.crNumber && <p>CR: {brand.crNumber}</p>}
                            {brand?.vatNumber && <p>VAT: {brand.vatNumber}</p>}
                        </div>
                    </div>
                </header>

                {/* Content */}
                <main className="min-h-[50mm]">
                    {children}
                </main>

                {/* Footer */}
                <div className="print-footer border-t border-slate-200 flex justify-between items-end text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-12 print:mt-auto pt-4">
                    <div className="flex flex-col gap-1">
                        <span>{brand?.fullName || "System Generated"}</span>
                        <span>{new Date().toLocaleDateString()}</span>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <span>Page <span className="page-number"></span></span>
                        <span className="normal-case">Generated via System</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
