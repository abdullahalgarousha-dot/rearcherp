"use client"

import { Button } from "@/components/ui/button"
import { FileDown, Loader2 } from "lucide-react"
import { useState } from "react"
import html2canvas from "html2canvas"
import jsPDF from "jspdf"

interface PDFExportButtonProps {
    elementId: string
    fileName: string
    brand?: string
}

export function PDFExportButton({ elementId, fileName, brand }: PDFExportButtonProps) {
    const handlePrint = () => {
        const originalTitle = document.title;
        document.title = fileName;
        window.print();
        setTimeout(() => {
            document.title = originalTitle;
        }, 100);
    };

    return (
        <Button onClick={handlePrint} variant="outline" className="border-primary/20 hover:bg-primary/5 print:hidden">
            <FileDown className="mr-2 h-4 w-4" />
            Print / Save PDF
        </Button>
    )
}
