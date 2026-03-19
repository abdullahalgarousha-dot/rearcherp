import { auth } from "@/auth"
import { redirect, notFound } from "next/navigation"
import { db } from "@/lib/db"
import { getSystemSettings } from "@/app/actions/settings"
import { format } from "date-fns"
import { Printer } from "lucide-react"

export default async function ClearanceCertificatePage({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const session = await auth()
    if (!session) redirect('/login')

    const { id } = await params

    const [custody, settings] = await Promise.all([
        (db as any).pettyCashRequest.findUnique({
            where: { id },
            include: {
                user: { select: { name: true, email: true } },
                project: {
                    select: {
                        name: true,
                        code: true,
                        brand: { select: { nameEn: true, logoUrl: true } },
                    }
                },
                closedBy: { select: { name: true } },
                settlementItems: { orderBy: { createdAt: 'asc' } },
            }
        }),
        getSystemSettings(),
    ])

    if (!custody) notFound()
    if (custody.status !== 'CLOSED') {
        redirect(`/admin/hr/petty-cash`)
    }

    const currentUser = session.user as any
    const isOwner = custody.userId === currentUser.id
    const isFinance = ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'GLOBAL_SUPER_ADMIN'].includes(currentUser.role)
    if (!isOwner && !isFinance) redirect('/')

    const totalSettled = custody.settlementItems.reduce((s: number, i: any) => s + i.amount, 0)
    const companyName =
        custody.project?.brand?.nameEn ||
        (settings as any)?.companyNameEn ||
        'Company'
    const logoUrl =
        custody.project?.brand?.logoUrl ||
        (settings as any)?.logoUrl ||
        null
    const certNumber = `CLR-${custody.id.slice(-6).toUpperCase()}-${new Date(custody.closedAt).getFullYear()}`

    return (
        <div className="min-h-screen bg-slate-100 flex items-start justify-center py-10 px-4">
            {/* Print button — hidden when printing */}
            <div className="fixed top-4 right-4 print:hidden z-50">
                <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 bg-primary text-white font-bold px-4 py-2 rounded-xl shadow-lg hover:bg-primary/90 transition-all"
                >
                    <Printer className="h-4 w-4" /> Print / Save PDF
                </button>
            </div>

            {/* Certificate */}
            <div
                id="clearance-cert"
                className="bg-white w-full max-w-[800px] shadow-2xl print:shadow-none"
                style={{ fontFamily: "'Segoe UI', Arial, sans-serif" }}
            >
                {/* Header stripe */}
                <div className="bg-[#1e293b] px-10 py-6 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        {logoUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={logoUrl} alt={companyName} className="h-12 w-auto object-contain" />
                        )}
                        <div>
                            <h1 className="text-white font-black text-2xl tracking-tight">{companyName}</h1>
                            <p className="text-white/40 text-xs font-bold uppercase tracking-widest mt-1">Finance & Accounting Department</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Certificate No.</p>
                        <p className="text-white font-black text-lg font-mono">{certNumber}</p>
                    </div>
                </div>

                {/* Title band */}
                <div className="bg-emerald-600 px-10 py-3 text-center">
                    <h2 className="text-white font-black text-lg uppercase tracking-widest">
                        Custody Clearance Certificate — شهادة تسوية العهدة
                    </h2>
                </div>

                {/* Body */}
                <div className="px-10 py-8 space-y-8">
                    {/* Formal statement */}
                    <div className="border-2 border-slate-200 rounded-xl p-6 text-center space-y-3">
                        <p className="text-slate-500 text-sm font-medium">This is to certify that</p>
                        <p className="text-3xl font-black text-slate-900">{custody.user.name}</p>
                        <p className="text-slate-600 text-sm leading-relaxed">
                            has fully settled the custody of{" "}
                            <span className="font-black text-emerald-700 text-lg">
                                SAR {custody.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>{" "}
                            disbursed for project{" "}
                            <span className="font-black text-slate-900">{custody.project?.name || "—"}</span>.
                            All supporting invoices have been submitted and deposited in the custody archive.
                        </p>
                        <p className="text-slate-500 text-xs italic">
                            يشهد بأن الموظف المذكور أعلاه قد أتم تسوية العهدة المحددة وتم إيداع جميع الفواتير في أرشيف العهد.
                        </p>
                    </div>

                    {/* Details grid */}
                    <div className="grid grid-cols-2 gap-4">
                        {[
                            { label: "Employee", value: custody.user.name },
                            { label: "Email", value: custody.user.email },
                            { label: "Project", value: `${custody.project?.code || ''} — ${custody.project?.name || '—'}` },
                            { label: "Custody Reason", value: custody.reason },
                            { label: "Original Amount Disbursed", value: `SAR ${custody.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
                            { label: "Total Invoices Submitted", value: `SAR ${totalSettled.toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
                            { label: "Date Closed", value: format(new Date(custody.closedAt), 'dd MMMM yyyy') },
                            { label: "Closed By (Accountant)", value: custody.closedBy?.name || "—" },
                        ].map(({ label, value }) => (
                            <div key={label} className="flex flex-col gap-0.5">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
                                <span className="text-sm font-bold text-slate-900">{value}</span>
                            </div>
                        ))}
                    </div>

                    {/* Settlement items table */}
                    {custody.settlementItems.length > 0 && (
                        <div>
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">
                                Archived Invoices ({custody.settlementItems.length} items)
                            </h3>
                            <table className="w-full text-sm border border-slate-200 rounded-xl overflow-hidden">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-[10px] font-black text-slate-400 uppercase">#</th>
                                        <th className="px-4 py-2 text-left text-[10px] font-black text-slate-400 uppercase">Description</th>
                                        <th className="px-4 py-2 text-right text-[10px] font-black text-slate-400 uppercase">Amount (SAR)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {custody.settlementItems.map((item: any, idx: number) => (
                                        <tr key={item.id}>
                                            <td className="px-4 py-2 text-slate-400">{idx + 1}</td>
                                            <td className="px-4 py-2 text-slate-700">{item.description || '—'}</td>
                                            <td className="px-4 py-2 text-right font-bold text-slate-900">
                                                {item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    ))}
                                    <tr className="bg-slate-50 font-black">
                                        <td colSpan={2} className="px-4 py-2 text-right text-xs text-slate-600 uppercase">Total</td>
                                        <td className="px-4 py-2 text-right text-emerald-700">
                                            {totalSettled.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Accountant notes */}
                    {custody.closedNotes && (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Accountant Notes</p>
                            <p className="text-sm text-slate-700">{custody.closedNotes}</p>
                        </div>
                    )}

                    {/* Signature block */}
                    <div className="grid grid-cols-2 gap-10 pt-6 border-t border-slate-200">
                        <div className="text-center space-y-8">
                            <div className="border-b border-slate-400 w-3/4 mx-auto" />
                            <div>
                                <p className="text-xs font-black text-slate-700">{custody.user.name}</p>
                                <p className="text-[10px] text-slate-400">Employee Signature</p>
                            </div>
                        </div>
                        <div className="text-center space-y-8">
                            <div className="border-b border-slate-400 w-3/4 mx-auto" />
                            <div>
                                <p className="text-xs font-black text-slate-700">{custody.closedBy?.name || 'Accountant'}</p>
                                <p className="text-[10px] text-slate-400">Accountant Signature & Stamp</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-slate-50 border-t border-slate-200 px-10 py-4 flex justify-between items-center">
                    <p className="text-[10px] text-slate-400">
                        Generated on {format(new Date(), 'dd MMM yyyy, HH:mm')} · {certNumber}
                    </p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Confidential</p>
                </div>
            </div>

            <style>{`
                @media print {
                    body { background: white !important; }
                    @page { margin: 0; size: A4; }
                }
            `}</style>
        </div>
    )
}
