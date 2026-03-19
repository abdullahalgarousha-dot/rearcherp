"use client"

import { useState } from "react"
import { Check, X, Calendar, Wallet, FileText, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { processLeaveRequest, processLoanRequest, processDocumentRequest } from "./actions"

export function HRInboxClient({ leaves, loans, documents, isHR, isFinance }: any) {
    const [loadingId, setLoadingId] = useState<string | null>(null)

    const handleAction = async (type: 'LEAVE' | 'LOAN' | 'DOC', id: string, action: 'APPROVE' | 'REJECT') => {
        if (!confirm(`هل أنت متأكد من ${action === 'APPROVE' ? 'اعتماد' : 'رفض'} هذا الطلب؟`)) return

        setLoadingId(id)
        let res
        if (type === 'LEAVE') res = await processLeaveRequest(id, action)
        else if (type === 'LOAN') res = await processLoanRequest(id, action)
        else res = await processDocumentRequest(id, action)

        if (res.error) alert(res.error)
        setLoadingId(null)
    }

    const ActionButtons = ({ id, type, canApprove }: { id: string, type: 'LEAVE' | 'LOAN' | 'DOC', canApprove: boolean }) => {
        if (!canApprove) return <span className="text-xs text-slate-400">بانتظار جهة أخرى</span>
        return (
            <div className="flex gap-2 justify-end">
                <Button
                    size="sm"
                    variant="outline"
                    className="text-red-500 hover:bg-red-50 border-red-200"
                    disabled={loadingId === id}
                    onClick={() => handleAction(type, id, 'REJECT')}
                >
                    <X className="w-4 h-4 mr-1" /> رفض
                </Button>
                <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                    disabled={loadingId === id}
                    onClick={() => handleAction(type, id, 'APPROVE')}
                >
                    <Check className="w-4 h-4 ml-1" /> {loadingId === id ? 'جاري...' : 'اعتماد'}
                </Button>
            </div>
        )
    }

    return (
        <Tabs defaultValue="leaves" className="w-full dir-rtl" dir="rtl">
            <TabsList className="grid grid-cols-3 w-full max-w-lg mb-8 bg-white border border-slate-200 shadow-sm rounded-xl p-1">
                <TabsTrigger value="leaves" className="font-bold data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700">
                    <Calendar className="ml-2 w-4 h-4" /> الإجازات
                    {leaves.length > 0 && <span className="mr-2 bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">{leaves.length}</span>}
                </TabsTrigger>
                <TabsTrigger value="loans" className="font-bold data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700">
                    <Wallet className="ml-2 w-4 h-4" /> السلف
                    {loans.length > 0 && <span className="mr-2 bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">{loans.length}</span>}
                </TabsTrigger>
                <TabsTrigger value="docs" className="font-bold data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700">
                    <FileText className="ml-2 w-4 h-4" /> الخطابات
                    {documents.length > 0 && <span className="mr-2 bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">{documents.length}</span>}
                </TabsTrigger>
            </TabsList>

            {/* --- LEAVES --- */}
            <TabsContent value="leaves">
                <div className="space-y-4">
                    {leaves.map((l: any) => (
                        <div key={l.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <h3 className="text-lg font-black text-slate-800">{l.user?.name}</h3>
                                    <Badge variant="outline" className="font-mono text-xs">{l.user?.profile?.employeeCode}</Badge>
                                </div>
                                <p className="text-sm font-bold text-slate-600 mb-1">
                                    {l.type === 'ANNUAL' ? 'إجازة سنوية' : l.type} ({Math.ceil((new Date(l.endDate).getTime() - new Date(l.startDate).getTime()) / (1000 * 3600 * 24)) + 1} أيام)
                                </p>
                                <p className="text-xs text-slate-500">من {new Date(l.startDate).toLocaleDateString()} إلى {new Date(l.endDate).toLocaleDateString()}</p>
                                {l.reason && <p className="text-sm mt-3 bg-slate-50 p-3 rounded-lg text-slate-700 border border-slate-100">{l.reason}</p>}
                            </div>
                            <div className="flex flex-col items-end gap-3 w-full md:w-auto">
                                <Badge className={l.status === 'PENDING_MANAGER' ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}>
                                    {l.status === 'PENDING_MANAGER' ? 'مراجعة المدير المباشر' : 'مراجعة الموارد البشرية (HR)'}
                                </Badge>
                                <ActionButtons
                                    id={l.id}
                                    type="LEAVE"
                                    canApprove={(l.status === 'PENDING_MANAGER') || (l.status === 'PENDING_HR' && isHR)}
                                />
                            </div>
                        </div>
                    ))}
                    {leaves.length === 0 && <p className="text-center text-slate-400 py-12">لا توجد طلبات إجازة معلقة.</p>}
                </div>
            </TabsContent>

            {/* --- LOANS --- */}
            <TabsContent value="loans">
                <div className="space-y-4">
                    {loans.map((l: any) => (
                        <div key={l.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <h3 className="text-lg font-black text-slate-800">{l.profile?.user?.name}</h3>
                                    <Badge variant="outline" className="font-mono text-xs">{l.profile?.employeeCode}</Badge>
                                </div>
                                <p className="text-xl font-black text-slate-800 mb-1">{l.amount.toLocaleString()} SAR <span className="text-sm font-medium text-slate-500 font-sans">على {l.installments} أشهر</span></p>
                                <p className="text-xs font-bold text-slate-500 bg-slate-50 inline-block px-2 py-1 rounded">الخصم الشهري: {l.monthlyDeduction.toFixed(2)} SAR</p>
                                {l.reason && <p className="text-sm mt-3 text-slate-600">{l.reason}</p>}
                            </div>
                            <div className="flex flex-col items-end gap-3 w-full md:w-auto">
                                <Badge className={
                                    l.status === 'PENDING_FINANCE' ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' :
                                        l.status === 'PENDING_HR' ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' :
                                            'bg-orange-100 text-orange-700 hover:bg-orange-200'
                                }>
                                    {l.status === 'PENDING_FINANCE' ? 'الاعتماد المالي النهائي' :
                                        l.status === 'PENDING_HR' ? 'مراجعة الموارد البشرية (HR)' :
                                            'مراجعة المدير المباشر'}
                                </Badge>
                                <ActionButtons
                                    id={l.id}
                                    type="LOAN"
                                    canApprove={(l.status === 'PENDING_FINANCE' && isFinance) || (l.status === 'PENDING_HR' && isHR) || (l.status === 'PENDING_MANAGER')}
                                />
                            </div>
                        </div>
                    ))}
                    {loans.length === 0 && <p className="text-center text-slate-400 py-12">لا توجد طلبات سلف معلقة.</p>}
                </div>
            </TabsContent>

            {/* --- DOCS --- */}
            <TabsContent value="docs">
                <div className="space-y-4">
                    {documents.map((d: any) => (
                        <div key={d.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <h3 className="text-lg font-black text-slate-800">{d.profile?.user?.name}</h3>
                                    <Badge variant="outline" className="font-mono text-xs bg-slate-100">{d.profile?.department}</Badge>
                                </div>
                                <p className="text-md font-bold text-indigo-700 mb-2">{d.type}</p>
                                <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">{d.details}</p>
                            </div>
                            <div className="flex flex-col items-end gap-3 w-full md:w-auto">
                                <Badge className={d.status === 'PENDING_MANAGER' ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}>
                                    {d.status === 'PENDING_MANAGER' ? 'مراجعة المدير المباشر' : 'إجراء الموارد البشرية (HR)'}
                                </Badge>
                                <ActionButtons id={d.id} type="DOC" canApprove={(d.status === 'PENDING_MANAGER') || (d.status === 'PENDING_HR' && isHR)} />
                            </div>
                        </div>
                    ))}
                    {documents.length === 0 && <p className="text-center text-slate-400 py-12">لا توجد طلبات خطابات معلقة.</p>}
                </div>
            </TabsContent>

        </Tabs>
    )
}
