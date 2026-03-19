import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { BackButton } from "@/components/ui/back-button"
import { PDFExportButton } from "@/components/supervision/pdf-export-button"
import { format } from "date-fns"
import { Separator } from "@/components/ui/separator"
import { generateZatcaQR } from "@/lib/zatca"
import { ZatcaQR } from "@/components/finance/zatca-qr"

export default async function InvoicePage({ params }: { params: Promise<{ invoiceId: string }> }) {
    const session = await auth()
    if (!['ADMIN', 'ACCOUNTANT', 'GLOBAL_SUPER_ADMIN', 'SUPER_ADMIN'].includes((session?.user as any)?.role)) {
        redirect('/')
    }

    const { invoiceId } = await params

    const invoice = await (db as any).invoice.findUnique({
        where: { id: invoiceId },
        include: {
            project: {
                include: { brand: true }
            }
        }
    })

    if (!invoice) return <div>Invoice not found</div>

    const { project } = invoice
    const { brand } = project

    // Calculate Totals (Safely use schema fields)
    const baseAmount = invoice.baseAmount || 0
    const vatAmount = invoice.vatAmount || 0
    const totalWithVat = invoice.totalAmount || (baseAmount + vatAmount)

    // Generate ZATCA QR Data
    const qrData = generateZatcaQR(
        brand.fullName || brand.nameEn,
        brand.vatNumber || "",
        new Date(invoice.date).toISOString(),
        totalWithVat.toFixed(2),
        vatAmount.toFixed(2)
    )

    return (
        <div className="min-h-screen bg-gray-50/50 pb-20 print:bg-white print:pb-0 font-sans rtl:text-right">
            {/* Top Bar - Hidden in Print */}
            <div className="flex justify-between items-center p-6 md:p-8 max-w-5xl mx-auto no-print">
                <div className="flex items-center gap-4">
                    <BackButton />
                    <h1 className="text-2xl font-bold tracking-tight text-primary">تفاصيل الفاتورة الضريبية</h1>
                </div>
                <PDFExportButton elementId="invoice-content" fileName={`Invoice-${invoice.invoiceNumber || invoice.id}`} />
            </div>

            {/* A4 Invoice Container - Updated Classes */}
            <div id="invoice-content" className="invoice-container max-w-[210mm] mx-auto bg-white p-8 md:p-12 shadow-lg my-8 rounded-lg border border-gray-200 text-slate-900 relative">

                {/* 1. Header & Branding */}
                <header className="flex justify-between items-start mb-8 pb-6 border-b-4 border-slate-900">
                    {/* Left: Invoice Info */}
                    <div className="w-1/2 space-y-2 text-left rtl:text-right">
                        <div>
                            <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Tax Invoice | فاتورة ضريبية</span>
                            <h2 className="text-2xl font-black text-slate-900 leading-tight">{invoice.invoiceNumber}</h2>
                        </div>
                        <div className="flex gap-8">
                            <div>
                                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Issue Date | التاريخ</span>
                                <p className="text-sm font-bold text-slate-700">{format(new Date(invoice.date), 'dd/MM/yyyy')}</p>
                            </div>
                        </div>
                    </div>

                    {/* Right: Branding */}
                    <div className="w-1/2 flex flex-col items-end text-right">
                        {brand.logoUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={brand.logoUrl} alt="Brand Logo" className="h-16 w-auto object-contain mb-2" />
                        )}
                        <h2 className="text-lg font-bold text-slate-800">{brand.fullName}</h2>
                        <div className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold flex flex-col gap-0.5">
                            <p>CR: {brand.crNumber} | س.ت: {brand.crNumber}</p>
                            <p>VAT: {brand.vatNumber} | ضريبي: {brand.vatNumber}</p>
                        </div>
                    </div>
                </header>

                {/* 2. Client & QR Info */}
                <section className="grid grid-cols-2 gap-12 mb-12">
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <span className="text-[10px] font-bold text-primary uppercase tracking-tight">Bill To | فاتورة إلى</span>
                            <h3 className="text-lg font-bold text-slate-900">
                                {project.client?.name || project.legacyClientName || "Client"}
                            </h3>
                        </div>
                        <div className="text-sm text-slate-600 leading-relaxed font-medium space-y-1">
                            <p>{project.client?.address || project.legacyClientAddr || "Address not provided"}</p>
                            {(project.client?.taxNumber || project.legacyClientVat) && (
                                <p className="text-xs text-slate-400">
                                    VAT: {project.client?.taxNumber || project.legacyClientVat}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end items-start gap-6">
                        <div className="text-right space-y-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Scan Verify | تحقق</span>
                            <p className="text-[10px] text-slate-400 leading-tight italic max-w-[120px]">
                                ZATCA Compliant Electronic Invoice
                            </p>
                        </div>
                        <ZatcaQR value={qrData} size={100} />
                    </div>
                </section>

                <Separator className="bg-slate-100 mb-10 no-print" />

                {/* 3. Description List */}
                <section className="mb-12 flex-grow min-h-[50mm]">
                    <div className="bg-slate-50 p-3 rounded-lg flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-widest px-6 mb-6">
                        <span>Description | البيان</span>
                        <span>Amount | المبلغ</span>
                    </div>

                    <div className="px-6 space-y-6">
                        <div className="flex justify-between items-start group">
                            <div className="space-y-1.5">
                                <h4 className="text-lg font-bold text-slate-800 tracking-tight">
                                    {invoice.description || "Professional Services | خدمات مهنية"}
                                </h4>
                                <div className="flex flex-col gap-1 text-xs font-medium text-slate-500">
                                    <span>Project: {project.name}</span>
                                    <span>Code: {project.code}</span>
                                    {invoice.dueDate && (
                                        <span>Due Date: {format(new Date(invoice.dueDate), 'dd/MM/yyyy')}</span>
                                    )}
                                </div>
                            </div>
                            <span className="text-xl font-bold text-slate-900 tabular-nums">
                                {baseAmount.toLocaleString()} <span className="text-xs font-medium text-slate-400 ml-1">SAR</span>
                            </span>
                        </div>
                    </div>
                </section>

                {/* 4. Financial Totals (Avoid Break Inside) */}
                <section className="break-inside-avoid mt-8 mb-12 border-t border-slate-100 pt-8 flex justify-end">
                    <div className="w-72 space-y-4">
                        <div className="flex justify-between items-center text-sm font-medium">
                            <span className="text-slate-500">Subtotal | المجموع الفرعي</span>
                            <span className="text-slate-900 tabular-nums">{baseAmount.toLocaleString()} SAR</span>
                        </div>
                        <div className="flex justify-between items-center text-sm font-medium">
                            <span className="text-slate-500">VAT (15%) | الضريبة</span>
                            <span className="text-slate-900 tabular-nums">{vatAmount.toLocaleString()} SAR</span>
                        </div>
                        <div className="bg-primary/5 p-4 rounded-xl flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase tracking-widest text-primary">Grand Total | الإجمالي</span>
                            <span className="text-2xl font-black text-primary tabular-nums italic">
                                {totalWithVat.toLocaleString()} <span className="text-[10px] ml-1">SAR</span>
                            </span>
                        </div>
                    </div>
                </section>

                {/* 5. Bank & Footer */}
                <section className="break-inside-avoid mt-auto border-t border-slate-100 pt-8 mb-12">
                    <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Bank Details | بيانات البنك</h5>
                    <div className="grid grid-cols-2 gap-8">
                        <div className="bg-slate-50 p-4 rounded-xl space-y-2">
                            <div>
                                <p className="text-slate-400 uppercase text-[8px] tracking-tighter">Bank Name</p>
                                <p className="text-slate-800 font-bold text-sm">{brand.bankName || "N/A"}</p>
                            </div>
                            <div>
                                <p className="text-slate-400 uppercase text-[8px] tracking-tighter">IBAN</p>
                                <p className="text-slate-800 font-mono font-bold tracking-tight text-sm">{brand.iban || "N/A"}</p>
                            </div>
                        </div>
                        <div className="flex flex-col items-center justify-center text-center gap-4">
                            <div className="w-full text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                Authorized Signature | التوقيع المعتمد
                            </div>
                            <div className="h-16 w-32 border-b-2 border-slate-200"></div>
                        </div>
                    </div>
                </section>

                {/* Print Footer */}
                <div className="print-footer border-t border-slate-200 flex justify-between items-end text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-12 print:mt-0">
                    <div className="flex flex-col gap-1">
                        <span>{brand.fullName}</span>
                        <span>CR: {brand.crNumber} | VAT: {brand.vatNumber}</span>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <span>Page <span className="page-number"></span></span>
                        <span className="normal-case">Generated via {brand.shortName || "System"}</span>
                    </div>
                </div>

            </div>
        </div>
    )
}
