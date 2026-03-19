"use client"

import { Button } from "@/components/ui/button"

export function PrintReportButton({ className, label, fileName }: { className?: string, label?: string, fileName?: string }) {
    const handlePrint = () => {
        if (fileName) {
            const originalTitle = document.title;
            document.title = fileName;
            window.print();
            setTimeout(() => {
                document.title = originalTitle;
            }, 100);
        } else {
            window.print();
        }
    }

    return (
        <button
            onClick={handlePrint}
            className={className || "bg-primary text-white px-6 py-2 rounded-xl shadow-lg hover:shadow-primary/20 transition-all font-bold print:hidden"}
        >
            {label || "طباعة / تصدير PDF"}
        </button>
    )
}
