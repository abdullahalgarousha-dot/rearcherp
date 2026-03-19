import { useState } from 'react'

export function usePDFExport() {
    const [isExporting, setIsExporting] = useState(false)

    const exportPDF = async (elementId: string, filename: string) => {
        setIsExporting(true)
        try {
            // Dynamically import to avoid SSR issues
            const html2canvas = (await import('html2canvas')).default
            const { jsPDF } = await import('jspdf')

            const element = document.getElementById(elementId)
            if (!element) throw new Error(`Element with id ${elementId} not found`)

            // Add a temporary class to ensure print styles are active during capture
            element.classList.add('print-mode')

            const canvas = await html2canvas(element, {
                scale: 2, // Higher quality
                useCORS: true,
                logging: false,
                windowWidth: 1200 // Standardize capture width
            })

            element.classList.remove('print-mode')

            const imgData = canvas.toDataURL('image/png')

            // A4 page dimensions in mm
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            })

            const pdfWidth = pdf.internal.pageSize.getWidth()
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
            pdf.save(filename)

        } catch (error) {
            console.error('Failed to export PDF:', error)
            alert('Failed to generate PDF. Please try again.')
        } finally {
            setIsExporting(false)
        }
    }

    return { exportPDF, isExporting }
}
