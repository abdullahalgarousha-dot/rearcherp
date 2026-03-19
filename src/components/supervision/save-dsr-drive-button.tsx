"use client"

import { Button } from "@/components/ui/button"
import { useState } from "react"
import { Loader2, CloudUpload } from "lucide-react"
import { toast } from "sonner"
import html2canvas from "html2canvas"
import jsPDF from "jspdf"
import { uploadDsrPdfToDrive } from "@/app/admin/supervision/actions"

export function SaveDsrToDriveButton({ reportId, projectId, fileName, className }: { reportId: string, projectId: string, fileName: string, className?: string }) {
    const [loading, setLoading] = useState(false)

    const handleSaveToDrive = async () => {
        const element = document.querySelector('.print-container') as HTMLElement | null
        if (!element) return toast.error("Report content not found")

        setLoading(true)
        const toastId = toast.loading("Generating PDF for Google Drive...")

        try {
            // Generate Canvas
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                logging: false,
                imageTimeout: 8000,
                windowWidth: element.scrollWidth,
                windowHeight: element.scrollHeight,
                onclone: (_doc: Document, clone: HTMLElement) => {
                    // Hide any images that fail to load to prevent html2canvas crash
                    const imgs = clone.querySelectorAll('img')
                    imgs.forEach((img) => {
                        img.onerror = () => { img.style.display = 'none' }
                    })
                }
            })

            const imgData = canvas.toDataURL('image/jpeg', 0.95)
            const pdf = new jsPDF('p', 'mm', 'a4')
            const pdfWidth = pdf.internal.pageSize.getWidth()
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width

            pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight)

            // Get raw Blob
            const pdfBlob = pdf.output('blob')

            // Upload to Drive Server Action
            toast.loading("Uploading to Google Drive...", { id: toastId })
            const formData = new FormData()
            formData.append('file', pdfBlob, `${fileName}.pdf`)
            formData.append('projectId', projectId)
            formData.append('reportId', reportId)

            const res = await uploadDsrPdfToDrive(formData)

            if (res.success) {
                toast.success("Saved to Google Drive!", { id: toastId })
            } else {
                toast.error(res.error || "Failed to upload to drive", { id: toastId })
            }
        } catch (error) {
            console.error(error)
            toast.error("Failed to generate and save PDF", { id: toastId })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Button
            onClick={handleSaveToDrive}
            disabled={loading}
            className={className || "bg-[#4285F4] text-white px-6 py-2 rounded-xl shadow-lg hover:bg-[#3367D6] transition-all font-bold print:hidden"}
        >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CloudUpload className="mr-2 h-4 w-4" />}
            حفظ في Google Drive
        </Button>
    )
}
