import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { BackButton } from "@/components/ui/back-button"
import { PDFExportButton } from "@/components/supervision/pdf-export-button"
import { format } from "date-fns"
import { generateZatcaQR } from "@/lib/zatca"
import { ZatcaQR } from "@/components/finance/zatca-qr"

export default async function InvoicePage({ params }: { params: Promise<{ invoiceId: string }> }) {
    const session = await auth()
    if (!['ADMIN', 'ACCOUNTANT', 'GLOBAL_SUPER_ADMIN', 'SUPER_ADMIN'].includes((session?.user as any)?.role)) {
        redirect('/')
    }

    const { invoiceId } = await params

    const user = session?.user as any
    const tenantId = user?.tenantId
    const isGlobalAdmin = user?.role === 'GLOBAL_SUPER_ADMIN'

    const invoice = await db.invoice.findFirst({
        where: isGlobalAdmin ? { id: invoiceId } : { id: invoiceId, tenantId },
        include: {
            items: true,
            project: {
                include: { client: true, brand: true }
            }
        }
    })


    if (!invoice) return <div>Invoice not found</div>

    const { project } = invoice
    const { client } = project || {}

    // Seller Info (Pull directly from Brand/Entity context)
    const brand = project?.brand as any

    const sellerName = brand?.fullName || brand?.nameEn || "غير متوفر"
    const sellerVat = brand?.vatNumber || brand?.taxNumber || "غير متوفر"
    const sellerCr = brand?.crNumber || "غير متوفر"
    const sellerAddress = brand?.nationalAddress || "عنوان غير متوفر"
    const sellerLogo = brand?.logoUrl || null

    const buyerName = client?.name || project?.legacyClientName || "غير متوفر"
    const buyerAddress = client?.address || project?.legacyClientAddr || "عنوان غير متوفر"
    const buyerVat = client?.taxNumber || project?.legacyClientVat || "غير متوفر"
    const buyerCr = client?.crNumber || "غير متوفر"

    // Calculate Totals Safely
    const itemsTotal = (invoice.items as any[]).reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unitPrice)), 0)
    let actualDiscountSAR = 0
    if (invoice.discountType === "PERCENTAGE") {
        actualDiscountSAR = itemsTotal * (Number(invoice.discountValue) / 100)
    } else {
        actualDiscountSAR = Number(invoice.discountValue) || 0
    }

    const subTotalDisplay = itemsTotal > 0 ? itemsTotal : (invoice.subTotal || invoice.baseAmount || 0)
    const vatAmount = invoice.taxAmount || invoice.vatAmount || (subTotalDisplay - actualDiscountSAR) * 0.15
    const grandTotal = invoice.grandTotal || invoice.totalAmount || (subTotalDisplay - actualDiscountSAR + vatAmount)

    // Generate ZATCA QR Data
    const qrData = generateZatcaQR(
        sellerName,
        sellerVat !== "غير متوفر" ? sellerVat : "",
        new Date(invoice.date).toISOString(),
        grandTotal.toFixed(2),
        vatAmount.toFixed(2)
    )

    const titleText = invoice.invoiceType === "SIMPLIFIED" ? "فاتورة ضريبية مبسطة" : "فاتورة ضريبية";

    return (
        <div className="min-h-screen bg-gray-50/50 pb-20 print:bg-white print:pb-0 font-sans rtl:text-right" dir="rtl">
            {/* Top Bar - Hidden in Print */}
            <div className="flex justify-between items-center p-6 md:p-8 max-w-5xl mx-auto print:hidden">
                <div className="flex items-center gap-4">
                    <BackButton />
                    <h1 className="text-2xl font-bold tracking-tight text-primary">عرض الفاتورة</h1>
                </div>
                <PDFExportButton elementId="invoice-content" fileName={`Invoice-${invoice.invoiceNumber || invoice.id}`} />
            </div>

            {/* A4 Invoice Container */}
            <div id="invoice-content" className="invoice-container max-w-[210mm] mx-auto bg-white p-8 md:p-12 shadow-lg my-8 rounded-lg border border-gray-200 text-slate-900 relative print:shadow-none print:my-0 print:border-none print:p-0">

                {/* 1. Header Section */}
                <header className="flex justify-between items-start mb-8 pb-6 border-b-2 border-slate-900">
                    <div className="space-y-4 w-1/2">
                        {sellerLogo && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={sellerLogo} alt="Logo" className="h-16 w-auto object-contain" />
                        )}
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 leading-tight">{titleText}</h2>
                            <p className="text-sm text-slate-500 font-bold uppercase tracking-widest mt-1">Tax Invoice</p>
                        </div>
                    </div>

                    <div className="w-1/2 flex justify-end gap-6 items-start">
                        <div className="text-left space-y-2" dir="ltr">
                            <div>
                                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Invoice Number | رقم الفاتورة</span>
                                <p className="text-sm font-bold text-slate-900">{invoice.invoiceNumber}</p>
                            </div>
                            <div>
                                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Issue Date | تاريخ الإصدار</span>
                                <p className="text-sm font-bold text-slate-900">{format(new Date(invoice.date), 'dd/MM/yyyy')}</p>
                            </div>
                        </div>
                        <ZatcaQR value={qrData} size={100} />
                    </div>
                </header>

                {/* 2. Parties Section */}
                <section className="grid grid-cols-2 gap-8 mb-10">
                    {/* Seller */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 border-b pb-2">معلومات البائع | Seller Info</h3>
                        <div className="space-y-2 text-sm">
                            <p className="font-bold text-slate-900">{sellerName}</p>
                            <p className="text-slate-600 leading-relaxed font-medium">{sellerAddress}</p>
                            <p className="text-slate-700 font-semibold text-xs mt-2">
                                <span className="text-slate-400 font-bold ml-1">الرقم الضريبي VAT:</span> {sellerVat}
                            </p>
                            <p className="text-slate-700 font-semibold text-xs">
                                <span className="text-slate-400 font-bold ml-1">سجل تجاري CR:</span> {sellerCr}
                            </p>
                        </div>
                    </div>

                    {/* Buyer */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 border-b pb-2">معلومات المشتري | Buyer Info</h3>
                        <div className="space-y-2 text-sm">
                            <p className="font-bold text-slate-900">{buyerName}</p>
                            <p className="text-slate-600 leading-relaxed font-medium">{buyerAddress}</p>
                            <p className="text-slate-700 font-semibold text-xs mt-2">
                                <span className="text-slate-400 font-bold ml-1">الرقم الضريبي VAT:</span> {buyerVat}
                            </p>
                            <p className="text-slate-700 font-semibold text-xs">
                                <span className="text-slate-400 font-bold ml-1">سجل تجاري CR:</span> {buyerCr}
                            </p>
                        </div>
                    </div>
                </section>

                {/* 3. Line Items Table */}
                <section className="mb-12 min-h-[60mm]">
                    <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
                        <table className="w-full text-sm text-right border-collapse">
                            <thead>
                                <tr className="bg-slate-100 text-slate-700 font-black text-[10px] uppercase tracking-widest border-b border-slate-200">
                                    <th className="p-3 text-right">الوصف<br/>Description</th>
                                    <th className="p-3 text-center border-r border-slate-200">الكمية<br/>Qty</th>
                                    <th className="p-3 text-center border-r border-slate-200">سعر الوحدة<br/>Unit Price</th>
                                    <th className="p-3 text-center border-r border-slate-200">المجموع الفرعي<br/>Subtotal</th>
                                    <th className="p-3 text-center border-r border-slate-200">نسبة الضريبة<br/>VAT Rate</th>
                                    <th className="p-3 text-center border-r border-slate-200">قيمة الضريبة<br/>VAT Amount</th>
                                    <th className="p-3 text-left border-r border-slate-200">المجموع مع الضريبة<br/>Total with VAT</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {invoice.items && invoice.items.length > 0 ? (
                                    invoice.items.map((item: any, i: number) => (
                                        <tr key={item.id || i} className="hover:bg-slate-50/50">
                                            <td className="p-3 font-semibold text-slate-800">{item.description}</td>
                                            <td className="p-3 text-center tabular-nums text-slate-600 border-r border-slate-100">{Number(item.quantity).toString()}</td>
                                            <td className="p-3 text-center tabular-nums text-slate-600 border-r border-slate-100">{Number(item.unitPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            <td className="p-3 text-center tabular-nums text-slate-600 border-r border-slate-100">{(item.quantity * item.unitPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            <td className="p-3 text-center tabular-nums text-slate-600 border-r border-slate-100">{(item.taxRate * 100).toString()}%</td>
                                            <td className="p-3 text-center tabular-nums text-slate-600 border-r border-slate-100">{Number(item.taxAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            <td className="p-3 text-left font-bold text-slate-900 tabular-nums border-r border-slate-100">{Number(item.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={7} className="p-6 text-center text-slate-400 font-medium">لا توجد منتجات (No items available)</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* 4. Formatting Totals */}
                <section className="break-inside-avoid flex justify-between items-start border-t-4 border-slate-900 pt-6 mb-12">
                    <div className="w-1/2 pr-6">
                        {invoice.description && (
                            <div className="bg-slate-50 p-4 rounded-xl text-sm italic text-slate-600 font-medium border border-slate-100">
                                {invoice.description}
                            </div>
                        )}
                    </div>
                    
                    <div className="w-80 space-y-3 pt-2">
                        <div className="flex justify-between items-center text-sm font-bold text-slate-600 px-4">
                            <span>الإجمالي (قبل الخصم والضريبة)<br/><span className="text-[10px] text-slate-400 tracking-widest uppercase">Subtotal</span></span>
                            <span className="tabular-nums">{subTotalDisplay.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                        
                        {(actualDiscountSAR > 0) && (
                            <div className="flex justify-between items-center text-sm font-bold text-red-500 px-4">
                                <span>الخصم {invoice.discountType === 'PERCENTAGE' ? `(${invoice.discountValue}%)` : ''}<br/><span className="text-[10px] text-red-400 tracking-widest uppercase">Discount</span></span>
                                <span className="tabular-nums">-{actualDiscountSAR.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                        )}
                        
                        <div className="flex justify-between items-center text-sm font-bold text-slate-600 px-4">
                            <span>إجمالي ضريبة القيمة المضافة 15%<br/><span className="text-[10px] text-slate-400 tracking-widest uppercase">Total VAT</span></span>
                            <span className="tabular-nums">{vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                        
                        <div className="bg-primary/5 p-4 rounded-xl flex justify-between items-center border border-primary/20 mt-4">
                            <span className="font-black text-primary leading-tight">الإجمالي المستحق<br/><span className="text-[10px] uppercase tracking-widest">Grand Total</span></span>
                            <span className="text-2xl font-black text-primary tabular-nums">
                                {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-xs font-bold text-primary/70 ml-1">SAR</span>
                            </span>
                        </div>
                    </div>
                </section>

                {/* Print Footer */}
                <div className="print-footer border-t border-slate-200 flex justify-between items-end text-[9px] font-bold text-slate-400 uppercase tracking-widest pt-4">
                    <div className="flex flex-col gap-1 text-right">
                        <span>{sellerName}</span>
                        <span>CR: {sellerCr} | VAT: {sellerVat}</span>
                    </div>
                    <div className="flex flex-col items-start gap-1 text-left">
                        <span>الصفحة <span className="page-number"></span></span>
                        <span className="normal-case">تصدير النظام الآلي</span>
                    </div>
                </div>

            </div>
        </div>
    )
}
