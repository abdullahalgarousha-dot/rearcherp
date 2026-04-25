import { useState } from 'react'

export function usePDFExport() {
    const [isExporting, setIsExporting] = useState(false)

    /**
     * Captures a DOM element as a multi-page A4 PDF.
     *
     * If the element carries `data-pdf-hidden="true"` it is assumed to be
     * positioned off-screen (left: -9999px / visibility: hidden).  The hook
     * will briefly make it visible for the capture and restore it afterwards.
     */
    const exportPDF = async (elementId: string, filename: string) => {
        setIsExporting(true)
        try {
            const html2canvas = (await import('html2canvas')).default
            const { jsPDF } = await import('jspdf')

            const element = document.getElementById(elementId)
            if (!element) throw new Error(`Element #${elementId} not found`)

            // Bring off-screen templates into the viewport for capture
            const isHiddenTemplate = element.getAttribute('data-pdf-hidden') === 'true'
            const savedStyles: Partial<CSSStyleDeclaration> = {}
            if (isHiddenTemplate) {
                savedStyles.position = element.style.position
                savedStyles.left = element.style.left
                savedStyles.top = element.style.top
                savedStyles.zIndex = element.style.zIndex
                savedStyles.visibility = element.style.visibility

                element.style.position = 'fixed'
                element.style.left = '0'
                element.style.top = '0'
                element.style.zIndex = '9999'
                element.style.visibility = 'visible'
                // Allow the browser to paint before capture
                await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
            }

            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                logging: false,
                backgroundColor: '#ffffff',
                // Match the fixed pixel width of the template so fonts aren't rescaled
                windowWidth: element.offsetWidth,
            })

            // Restore element to its hidden state
            if (isHiddenTemplate) {
                element.style.position = savedStyles.position ?? ''
                element.style.left = savedStyles.left ?? ''
                element.style.top = savedStyles.top ?? ''
                element.style.zIndex = savedStyles.zIndex ?? ''
                element.style.visibility = savedStyles.visibility ?? ''
            }

            const imgData = canvas.toDataURL('image/png')

            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
            const pageW = pdf.internal.pageSize.getWidth()   // 210 mm
            const pageH = pdf.internal.pageSize.getHeight()  // 297 mm

            // Scale the full canvas to fit the PDF page width
            const imgW = pageW
            const imgH = (canvas.height * pageW) / canvas.width

            let heightLeft = imgH
            let yOffset = 0

            pdf.addImage(imgData, 'PNG', 0, yOffset, imgW, imgH)
            heightLeft -= pageH

            while (heightLeft > 0) {
                yOffset -= pageH
                pdf.addPage()
                pdf.addImage(imgData, 'PNG', 0, yOffset, imgW, imgH)
                heightLeft -= pageH
            }

            pdf.save(filename)
        } catch (error) {
            console.error('PDF export failed:', error)
            alert('Failed to generate PDF. Please try again.')
        } finally {
            setIsExporting(false)
        }
    }

    return { exportPDF, isExporting }
}
