import { db } from "@/lib/db"
import { notFound, redirect } from "next/navigation"
import { format, differenceInCalendarDays } from "date-fns"
import { auth } from "@/auth"
import { BackButton } from "@/components/ui/back-button"
import { PrintReportButton } from "@/components/supervision/print-report-button"
import { SaveDsrToDriveButton } from "@/components/supervision/save-dsr-drive-button"

// دالة مساعدة لتحليل الـ JSON بأمان
const parseJson = (data: any) => {
    if (!data) return []
    if (typeof data === 'object') return data
    if (typeof data === 'string') {
        try { return JSON.parse(data) } catch (e) { return [] }
    }
    return []
}

export default async function DailyReportDetailsPage({
    params
}: {
    params: Promise<{ projectId: string; reportId: string }>
}) {
    const { reportId } = await params
    const session = await auth()
    const user = session?.user as any

    // Auth Check
    if (!['ADMIN', 'PM', 'HR', 'SITE_ENGINEER'].includes(user?.role)) {
        redirect('/')
    }

    const tenantId = user?.tenantId
    if (!tenantId) redirect('/login')

    // 1. جلب التقرير مع كافة العلاقات — scoped to tenantId
    const report = await db.dailyReport.findFirst({
        where: { id: reportId, tenantId },
        include: {
            project: { include: { brand: true } },
            createdBy: true,
            approvedBy: true,
        }
    })

    if (!report) return notFound()

    // 2. تجهيز البيانات (فك الـ JSON)
    const contractorData = parseJson(report.contractorData)
    const equipment = parseJson(report.equipment)
    const photos = parseJson(report.sitePhotos)
    const attendees = parseJson(report.consultantStaff)

    // 3. حساب الأيام المنقضية
    let elapsedDays = 0
    if (report.project.startDate) {
        elapsedDays = differenceInCalendarDays(new Date(report.date), new Date(report.project.startDate))
        if (elapsedDays < 0) elapsedDays = 0
    }

    return (
        <div className="min-h-screen bg-gray-50/50 p-4 md:p-8 print:p-0 print:bg-white pb-20">

            {/* --- زر الطباعة (يختفي عند الطباعة) --- */}
            <div className="max-w-5xl mx-auto mb-6 flex justify-between items-center no-print">
                <div className="flex items-center gap-4">
                    <BackButton />
                    <h1 className="text-2xl font-bold">تفاصيل التقرير اليومي</h1>
                </div>
                <div className="flex items-center gap-2">
                    <SaveDsrToDriveButton
                        reportId={report.id}
                        projectId={report.projectId}
                        fileName={report.officeRef || `DSR-${report.project.code}-${report.serial}`}
                    />
                    <PrintReportButton fileName={report.officeRef || `DSR-${report.project.code}-${report.serial}`} />
                </div>
            </div>

            {/* --- حاوية الطباعة (A4) --- */}
            <div className="print-container bg-white shadow-xl print:shadow-none mx-auto print:mx-0 text-black print:text-base">

                {/* 1. الترويسة الرسمية (Header) */}
                <div className="border-b-4 border-black pb-4 mb-6 flex justify-between items-end">
                    <div className="text-right flex flex-col items-start w-1/2">
                        {/* الشعار */}
                        {report.project.brand?.logoUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={report.project.brand.logoUrl} alt="Logo" className="h-16 object-contain mb-2" />
                        )}
                        <h2 className="text-xl print:text-2xl font-black uppercase tracking-widest leading-none">{report.project.brand?.nameEn || report.project.brand?.fullName || "Consultant"}</h2>
                        <p className="text-sm print:text-lg font-bold text-gray-500 mt-1">{report.project.brand?.nameAr}</p>
                    </div>
                    <div className="text-right w-1/2">
                        <h1 className="text-2xl print:text-3xl font-black mb-1">DAILY SITE REPORT</h1>
                        <p className="text-lg print:text-xl font-bold text-gray-400">تقرير الموقع اليومي</p>
                        <div className="mt-2 text-sm print:text-base">
                            <span className="block font-bold">Project: {report.project.name}</span>
                            <span className="block text-gray-500 text-[10px] print:text-xs font-mono">Ref: {report.officeRef || `DSR-${report.project.code}-${report.serial}`}</span>
                        </div>
                    </div>
                </div>

                {/* 2. شريط المعلومات العلوي (KPIs) */}
                <div className="grid grid-cols-4 gap-4 mb-6 border-b-2 border-gray-100 pb-6 text-center">
                    <div className="border-r border-gray-100">
                        <p className="text-[10px] print:text-xs uppercase font-bold text-gray-400">Date | التاريخ</p>
                        <p className="font-black text-lg print:text-xl">{format(new Date(report.date), "yyyy-MM-dd")}</p>
                    </div>
                    <div className="border-r border-gray-100">
                        <p className="text-[10px] print:text-xs uppercase font-bold text-gray-400">Elapsed Days | المدة</p>
                        <p className="font-black text-lg print:text-xl">{elapsedDays} <span className="text-[10px] print:text-xs text-gray-400 uppercase">Days</span></p>
                    </div>
                    <div className="border-r border-gray-100">
                        <p className="text-[10px] print:text-xs uppercase font-bold text-gray-400">Completion | الإنجاز</p>
                        <p className="font-black text-lg print:text-xl">{report.currentCompletion || report.completionPercentage}%</p>
                    </div>
                    <div>
                        <p className="text-[10px] print:text-xs uppercase font-bold text-gray-400">Weather | الطقس</p>
                        <p className="font-black text-lg print:text-xl">{report.weather || "-"}</p>
                    </div>
                </div>

                {/* 3. كادر الإشراف (Consultant Team) */}
                <div className="mb-6 avoid-break">
                    <h3 className="text-xs print:text-sm font-black uppercase bg-gray-50 p-2 border-l-4 border-black mb-3">Consultant Team | طاقم الإشراف</h3>
                    <div className="grid grid-cols-3 gap-3 text-xs print:text-sm">
                        {attendees.length > 0 ? attendees.map((att: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center border border-gray-100 p-2 rounded bg-gray-50/30">
                                <div>
                                    <span className="font-bold text-gray-700 block">{att.name}</span>
                                    {att.role && <span className="text-[10px] print:text-xs text-gray-400 tracking-tighter block">{att.role}</span>}
                                </div>
                                <span className={`flex items-center gap-1 font-bold ${att.present ? "text-emerald-600" : "text-red-500"}`}>
                                    {att.present ? (
                                        <><span className="text-lg leading-none">✅</span> Present</>
                                    ) : (
                                        <><span className="text-lg leading-none">❌</span> Absent</>
                                    )}
                                </span>
                            </div>
                        )) : <p className="col-span-3 text-gray-400 italic text-center py-2">No attendance recorded.</p>}
                    </div>
                </div>

                {/* 4. المقاولون والعمالة (Contractors) */}
                <div className="mb-6">
                    <h3 className="text-xs print:text-sm font-black uppercase bg-gray-50 p-2 border-l-4 border-black mb-3">Contractors Activity | أعمال المقاولين</h3>
                    {contractorData.length > 0 ? contractorData.map((cont: any, idx: number) => (
                        <div key={idx} className="mb-4 border border-gray-200 rounded p-4 avoid-break">
                            <div className="flex justify-between border-b border-gray-100 pb-2 mb-3">
                                <h4 className="font-black text-slate-800 uppercase text-sm print:text-base">{cont.contractorName}</h4>
                                <span className="text-[10px] print:text-xs font-bold bg-slate-900 text-white px-3 py-1 rounded-full">
                                    Total Manpower: {cont.labor?.reduce((a: any, b: any) => a + Number(b.count), 0) || 0}
                                </span>
                            </div>

                            {/* Contractor Timeline Status */}
                            <div className="grid grid-cols-4 gap-2 mb-4 bg-slate-50 border border-slate-100 p-2 rounded text-[9px] print:text-[10px] uppercase font-black tracking-tighter text-center">
                                <div>
                                    <span className="block text-slate-400">Value (SAR)</span>
                                    <span className="text-slate-800">{cont.contractValue ? Number(cont.contractValue).toLocaleString() : "-"}</span>
                                </div>
                                <div className="border-l border-slate-200">
                                    <span className="block text-slate-400">Duration</span>
                                    <span className="text-slate-800">{cont.durationDays || "-"} Days</span>
                                </div>
                                <div className="border-l border-slate-200">
                                    <span className="block text-slate-400">Elapsed</span>
                                    <span className="text-slate-800">{cont.elapsedDays || "-"} Days</span>
                                </div>
                                <div className="border-l border-slate-200">
                                    <span className="block text-slate-400">Status</span>
                                    {cont.delayDays > 0 ? (
                                        <span className="text-red-600">Delayed {cont.delayDays} Days</span>
                                    ) : (
                                        <span className="text-green-600">Remaining {cont.remainingDays || "-"} Days</span>
                                    )}
                                </div>
                            </div>

                            {/* العمالة */}
                            <div className="grid grid-cols-4 gap-2 mb-3">
                                {cont.labor?.map((lab: any, lIdx: number) => (
                                    <div key={lIdx} className="border border-gray-100 p-1.5 text-center bg-slate-50/50 rounded">
                                        <span className="block text-[9px] print:text-[10px] font-bold text-gray-400 uppercase">{lab.type}</span>
                                        <span className="block font-black text-base print:text-lg text-slate-800">{lab.count}</span>
                                    </div>
                                ))}
                            </div>

                            {/* الملاحظات الخاصة بالمقاول */}
                            {cont.notes && (
                                <div className="text-xs bg-amber-50/50 p-2 border border-amber-100/50 text-slate-700 whitespace-pre-wrap rounded italic">
                                    <span className="font-bold block text-[9px] text-amber-600 uppercase not-italic mb-1 underline">Contractor Notes:</span>
                                    {cont.notes}
                                </div>
                            )}
                        </div>
                    )) : (
                        <div className="p-8 border-2 border-dashed border-gray-100 rounded text-center text-gray-400 text-xs italic">No Contractor Data Recorded</div>
                    )}
                </div>

                {/* 5. الأعمال المنجزة والمخططة */}
                <div className="grid grid-cols-2 gap-6 mb-6">
                    <div className="avoid-break">
                        <h3 className="text-xs print:text-sm font-black uppercase bg-gray-50 p-2 border-l-4 border-emerald-600 mb-2">Work Performed | المنجز</h3>
                        <div className="text-xs print:text-sm text-gray-700 whitespace-pre-wrap border border-gray-100 p-3 min-h-[100px] bg-emerald-50/10 rounded leading-relaxed">{report.workPerformedToday || "No data."}</div>
                    </div>
                    <div className="avoid-break">
                        <h3 className="text-xs print:text-sm font-black uppercase bg-gray-50 p-2 border-l-4 border-blue-600 mb-2">Planned Work | المخطط</h3>
                        <div className="text-xs print:text-sm text-gray-700 whitespace-pre-wrap border border-gray-100 p-3 min-h-[100px] bg-blue-50/10 rounded leading-relaxed">{report.plannedWorkTomorrow || "No data."}</div>
                    </div>
                </div>

                {/* 6. المعدات (Equipment) */}
                {equipment.length > 0 && (
                    <div className="mb-6 avoid-break">
                        <h3 className="text-xs font-black uppercase bg-gray-50 p-2 border-l-4 border-black mb-3">Equipment on Site | المعدات</h3>
                        <table className="w-full text-xs border-collapse border border-gray-200">
                            <thead className="bg-slate-50">
                                <tr className="text-[10px] uppercase text-gray-500 font-bold">
                                    <th className="border border-gray-200 p-2 text-left">Equipment Type</th>
                                    <th className="border border-gray-200 p-2 text-center w-24">Unit/Qty</th>
                                </tr>
                            </thead>
                            <tbody>
                                {equipment.map((eq: any, idx: number) => (
                                    <tr key={idx} className="border-b border-gray-100">
                                        <td className="border border-gray-200 p-2 font-bold text-slate-700">{eq.name}</td>
                                        <td className="border border-gray-200 p-2 text-center font-black">{eq.count}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* 7. معرض الصور (Photo Gallery) */}
                <div className="mb-6 page-break">
                    <h3 className="text-xs font-black uppercase bg-gray-50 p-2 border-l-4 border-black mb-4">Site Photos | الصور</h3>
                    <div className="grid grid-cols-2 gap-4">
                        {photos.map((photo: any, idx: number) => (
                            <div key={idx} className="border border-gray-200 p-1.5 avoid-break bg-white rounded shadow-sm">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={photo.url}
                                    alt="Site Photo"
                                    className="w-full h-64 object-cover block rounded-sm"
                                />
                                <p className="text-[10px] font-bold text-center mt-2 bg-gray-50 py-1.5 text-gray-600 rounded uppercase">{photo.caption || `Photo ${idx + 1}`}</p>
                            </div>
                        ))}
                        {photos.length === 0 && <p className="col-span-2 text-center text-gray-400 italic py-4">No photos attached.</p>}
                    </div>
                </div>

                {/* 8. التذييل والتواقيع (Footer) */}
                <div className="mt-12 pt-6 border-t-4 border-slate-900 avoid-break">
                    <div className="grid grid-cols-2 gap-12 text-center">
                        <div className="flex flex-col items-center">
                            <p className="text-[10px] font-black uppercase text-gray-400 mb-12 tracking-widest">Site Engineer / Prepared By</p>
                            <p className="font-black text-lg text-slate-900">{report.createdBy?.name}</p>
                            <div className="w-2/3 h-px bg-slate-300 mt-1"></div>
                            <p className="text-[9px] text-gray-400 mt-1 font-mono">{format(new Date(report.date), "dd MMM yyyy")}</p>
                        </div>
                        <div className="flex flex-col items-center">
                            <p className="text-[10px] font-black uppercase text-gray-400 mb-12 tracking-widest">Project Manager / Approved By</p>
                            <p className="font-black text-lg text-slate-900">{report.approvedBy?.name || "REPORT PENDING APPROVAL"}</p>
                            <div className="w-2/3 h-px bg-slate-200 mt-1"></div>
                            <p className="text-[9px] text-gray-300 mt-1 uppercase">Signature</p>
                        </div>
                    </div>
                    <div className="text-[8px] text-gray-400 text-center mt-8 uppercase tracking-[0.2em]">
                        {report.project.brand?.nameEn || report.project.brand?.fullName || "Site Supervision"} | Generated: {format(new Date(), "yyyy-MM-dd HH:mm")}
                    </div>
                </div>

            </div>
        </div>
    )
}
