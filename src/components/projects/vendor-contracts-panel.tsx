"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    Plus, ChevronDown, ChevronRight, FileText, CheckCircle2,
    Clock, AlertTriangle, Upload, Building2, ExternalLink, Trash2, ShieldCheck, ShieldOff, Receipt
} from "lucide-react"
import { useRouter } from "next/navigation"
import {
    createSubContract, createVendorMilestone, updateMilestoneStatus, deleteMilestone,
    getVendorsForProject, getProjectSubContracts
} from "@/app/admin/projects/[projectId]/vendor-project-actions"

interface Vendor {
    id: string; companyName: string; specialty: string;
    isVatRegistered?: boolean; taxNumber?: string
}
interface VendorMilestone {
    id: string; description: string; amount: number; vatAmount: number;
    dueDate?: string; status: string;
    taxInvoiceUrl?: string; transferReceiptUrl?: string; paidAt?: string
}
interface SubContract {
    id: string; vendorId: string; totalAmount: number; contractDate: string;
    scopeOfWork?: string; driveFolderId?: string;
    vendor: Vendor; milestones: VendorMilestone[];
}

interface VendorContractsPanelProps {
    projectId: string
    subContracts: SubContract[]   // initial server-rendered seed
    canEdit: boolean
    canApproveFinance: boolean
}

export function VendorContractsPanel({
    projectId,
    subContracts: initialSubContracts,
    canEdit,
    canApproveFinance,
}: VendorContractsPanelProps) {
    const router = useRouter()
    const [subContracts, setSubContracts] = useState<SubContract[]>(initialSubContracts)
    const [vendors, setVendors] = useState<Vendor[]>([])
    const [expanded, setExpanded] = useState<Set<string>>(new Set())
    const [loading, setLoading] = useState(false)
    const [addContractOpen, setAddContractOpen] = useState(false)
    const [addMilestoneOpen, setAddMilestoneOpen] = useState<string | null>(null)
    const [paymentOpen, setPaymentOpen] = useState<string | null>(null)

    // Dual file refs
    const receiptRef = useRef<HTMLInputElement>(null)
    const invoiceRef = useRef<HTMLInputElement>(null)

    // Payment form state (per open dialog)
    const [vatAmountInput, setVatAmountInput] = useState('')

    // Fetch vendors and sub-contracts dynamically — always reflects latest DB state
    const refreshData = async () => {
        const [freshVendors, freshContracts] = await Promise.all([
            getVendorsForProject(),
            getProjectSubContracts(projectId),
        ])
        setVendors(freshVendors as Vendor[])
        setSubContracts(freshContracts as SubContract[])
    }

    useEffect(() => { refreshData() }, [projectId])

    // Form states
    const [contractForm, setContractForm] = useState({ vendorId: '', totalAmount: '', contractDate: '', scopeOfWork: '' })
    const [milestoneForm, setMilestoneForm] = useState({ description: '', amount: '', dueDate: '' })

    const toggleExpand = (id: string) => {
        setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
    }

    async function handleAddContract() {
        if (!contractForm.vendorId || !contractForm.totalAmount || !contractForm.contractDate) return
        setLoading(true)
        const res = await createSubContract(projectId, {
            vendorId: contractForm.vendorId,
            totalAmount: parseFloat(contractForm.totalAmount),
            contractDate: contractForm.contractDate,
            scopeOfWork: contractForm.scopeOfWork || undefined,
        })
        setLoading(false)
        if (res.success) {
            setAddContractOpen(false)
            setContractForm({ vendorId: '', totalAmount: '', contractDate: '', scopeOfWork: '' })
            await refreshData()
            router.refresh()
        } else { alert(res.error) }
    }

    async function handleAddMilestone(subContractId: string) {
        if (!milestoneForm.description || !milestoneForm.amount) return
        setLoading(true)
        const res = await createVendorMilestone(subContractId, {
            description: milestoneForm.description,
            amount: parseFloat(milestoneForm.amount),
            dueDate: milestoneForm.dueDate || undefined,
        })
        setLoading(false)
        if (res.success) {
            setAddMilestoneOpen(null)
            setMilestoneForm({ description: '', amount: '', dueDate: '' })
            await refreshData()
            router.refresh()
        } else { alert(res.error) }
    }

    async function handleMarkPaid(milestoneId: string) {
        const receiptFile = receiptRef.current?.files?.[0]
        const invoiceFile = invoiceRef.current?.files?.[0]

        setLoading(true)
        const formData = new FormData()
        if (receiptFile) formData.append('transferReceipt', receiptFile)
        if (invoiceFile) formData.append('taxInvoice', invoiceFile)
        if (vatAmountInput) formData.append('vatAmount', vatAmountInput)

        const res = await updateMilestoneStatus(milestoneId, 'PAID', formData)
        setLoading(false)

        if (res.success) {
            setPaymentOpen(null)
            setVatAmountInput('')
            if (receiptRef.current) receiptRef.current.value = ''
            if (invoiceRef.current) invoiceRef.current.value = ''
            await refreshData()
            router.refresh()
        } else { alert(res.error) }
    }

    async function handleDeleteMilestone(milestoneId: string) {
        if (!confirm("حذف هذه المرحلة؟")) return
        setLoading(true)
        const res = await deleteMilestone(milestoneId)
        setLoading(false)
        if (res.success) { await refreshData(); router.refresh() }
        else alert(res.error)
    }

    const totalSubContracted = subContracts.reduce((s, sc) => s + sc.totalAmount, 0)
    const totalPaid = subContracts.reduce((s, sc) =>
        s + sc.milestones.filter(m => m.status === 'PAID').reduce((ms, m) => ms + m.amount, 0), 0)
    const totalVAT = subContracts.reduce((s, sc) =>
        s + sc.milestones.filter(m => m.status === 'PAID').reduce((ms, m) => ms + (m.vatAmount || 0), 0), 0)

    return (
        <div className="space-y-5">
            {/* Summary Bar */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4">
                    <p className="text-[10px] font-black uppercase text-orange-500 tracking-widest mb-1">إجمالي العقود</p>
                    <p className="text-xl font-black text-orange-700">{totalSubContracted.toLocaleString()} <span className="text-xs font-normal">SAR</span></p>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                    <p className="text-[10px] font-black uppercase text-emerald-500 tracking-widest mb-1">إجمالي المدفوع</p>
                    <p className="text-xl font-black text-emerald-700">{totalPaid.toLocaleString()} <span className="text-xs font-normal">SAR</span></p>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                    <p className="text-[10px] font-black uppercase text-amber-500 tracking-widest mb-1">ضريبة مدخلات (ZATCA)</p>
                    <p className="text-xl font-black text-amber-700">{totalVAT.toLocaleString()} <span className="text-xs font-normal">SAR</span></p>
                </div>
            </div>

            {/* Add Sub-Contract Button */}
            {canEdit && (
                <Dialog open={addContractOpen} onOpenChange={setAddContractOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" className="rounded-xl gap-2 border-dashed border-2 border-orange-200 text-orange-700 hover:bg-orange-50 font-bold h-11">
                            <Plus className="h-4 w-4" /> إضافة عقد فرعي (Add Sub-Contract)
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 font-black">
                                <Building2 className="h-5 w-5 text-orange-500" /> عقد فرعي جديد
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-2">
                            <div className="space-y-1.5">
                                <Label className="font-bold">المورد / المستشار من الباطن *</Label>
                                <Select value={contractForm.vendorId} onValueChange={v => setContractForm(f => ({ ...f, vendorId: v }))}>
                                    <SelectTrigger className="rounded-xl h-11">
                                        <SelectValue placeholder="اختر مورداً..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {vendors.map(v => (
                                            <SelectItem key={v.id} value={v.id}>
                                                <span className="font-bold">{v.companyName}</span>
                                                <span className="ml-2 text-xs text-muted-foreground">({v.specialty})</span>
                                                {v.isVatRegistered
                                                    ? <span className="ml-1 text-[9px] text-orange-600 font-black">◆ ضريبة</span>
                                                    : <span className="ml-1 text-[9px] text-slate-400">بدون ضريبة</span>
                                                }
                                            </SelectItem>
                                        ))}
                                        {vendors.length === 0 && (
                                            <div className="text-sm text-muted-foreground p-3 text-center">
                                                لا يوجد موردون. أضفهم من Finance Hub → Vendors Directory.
                                            </div>
                                        )}
                                    </SelectContent>
                                </Select>
                                {/* Show VAT status of selected vendor */}
                                {contractForm.vendorId && (() => {
                                    const v = vendors.find(vv => vv.id === contractForm.vendorId)
                                    if (!v) return null
                                    return (
                                        <div className={`flex items-center gap-2 text-xs rounded-xl px-3 py-2 mt-1 ${v.isVatRegistered ? 'bg-orange-50 text-orange-700' : 'bg-slate-50 text-slate-500'}`}>
                                            {v.isVatRegistered ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldOff className="h-3.5 w-3.5" />}
                                            {v.isVatRegistered
                                                ? `مسجل ضريبياً — سيُطلب فاتورة ضريبية + إيصال حوالة عند كل دفعة`
                                                : `غير مسجل ضريبياً — يكفي إيصال الحوالة البنكية عند الدفع`}
                                        </div>
                                    )
                                })()}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="font-bold">قيمة العقد (SAR) *</Label>
                                    <Input type="number" className="rounded-xl h-11"
                                        value={contractForm.totalAmount}
                                        onChange={e => setContractForm(f => ({ ...f, totalAmount: e.target.value }))}
                                        placeholder="0.00" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="font-bold">تاريخ العقد *</Label>
                                    <Input type="date" className="rounded-xl h-11"
                                        value={contractForm.contractDate}
                                        onChange={e => setContractForm(f => ({ ...f, contractDate: e.target.value }))} />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="font-bold">نطاق العمل (Scope of Work)</Label>
                                <Textarea className="rounded-xl resize-none" rows={3}
                                    value={contractForm.scopeOfWork}
                                    onChange={e => setContractForm(f => ({ ...f, scopeOfWork: e.target.value }))}
                                    placeholder="وصف خدمات المورد..." />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="ghost" onClick={() => setAddContractOpen(false)}>إلغاء</Button>
                            <Button
                                disabled={loading || !contractForm.vendorId || !contractForm.totalAmount || !contractForm.contractDate}
                                onClick={handleAddContract}
                                className="bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold"
                            >
                                {loading ? "جاري الإنشاء..." : "إنشاء العقد الفرعي"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}

            {/* Sub-Contract Cards */}
            <div className="space-y-3">
                {subContracts.map(sc => {
                    const paid = sc.milestones.filter(m => m.status === 'PAID').reduce((s, m) => s + m.amount, 0)
                    const remaining = sc.totalAmount - paid
                    const pct = sc.totalAmount > 0 ? (paid / sc.totalAmount) * 100 : 0
                    const isExpanded = expanded.has(sc.id)

                    return (
                        <Card key={sc.id} className="border border-orange-100 shadow-sm rounded-2xl overflow-hidden">
                            <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 cursor-pointer py-4" onClick={() => toggleExpand(sc.id)}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        {isExpanded ? <ChevronDown className="h-4 w-4 text-orange-400" /> : <ChevronRight className="h-4 w-4 text-orange-400" />}
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-black text-slate-900">{sc.vendor.companyName}</span>
                                                <Badge className="text-[9px] font-black uppercase bg-orange-100 text-orange-700 border-orange-200 rounded-full px-2">
                                                    {sc.vendor.specialty}
                                                </Badge>
                                                {sc.vendor.isVatRegistered ? (
                                                    <Badge className="text-[9px] font-black bg-amber-100 text-amber-700 border-amber-200 rounded-full px-2 gap-1">
                                                        <ShieldCheck className="h-2.5 w-2.5" /> ضريبي
                                                    </Badge>
                                                ) : (
                                                    <Badge className="text-[9px] font-black bg-slate-100 text-slate-500 border-slate-200 rounded-full px-2">
                                                        بدون ضريبة
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                {new Date(sc.contractDate).toLocaleDateString()} • {sc.milestones.length} دفعة
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6 text-sm text-right">
                                        <div>
                                            <p className="text-[10px] uppercase font-black text-slate-400">العقد</p>
                                            <p className="font-black text-slate-800">{sc.totalAmount.toLocaleString()} SAR</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase font-black text-emerald-500">مدفوع</p>
                                            <p className="font-black text-emerald-700">{paid.toLocaleString()} SAR</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase font-black text-rose-400">متبقي</p>
                                            <p className="font-black text-rose-700">{remaining.toLocaleString()} SAR</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-3 h-1.5 bg-white/70 rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-orange-400 to-emerald-500 rounded-full transition-all duration-500"
                                        style={{ width: `${Math.min(pct, 100)}%` }} />
                                </div>
                            </CardHeader>

                            {isExpanded && (
                                <CardContent className="pt-4 pb-5 space-y-4">
                                    {sc.scopeOfWork && (
                                        <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-3 border border-slate-100">
                                            <span className="font-bold block text-xs text-slate-400 uppercase mb-1">Scope of Work</span>
                                            {sc.scopeOfWork}
                                        </p>
                                    )}

                                    {/* Milestones Table */}
                                    <div className="border border-slate-100 rounded-xl overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead className="bg-slate-50 border-b border-slate-100">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-black uppercase text-slate-400">الوصف</th>
                                                    <th className="px-4 py-3 text-right text-xs font-black uppercase text-slate-400">المبلغ</th>
                                                    <th className="px-4 py-3 text-right text-xs font-black uppercase text-slate-400">الضريبة</th>
                                                    <th className="px-4 py-3 text-center text-xs font-black uppercase text-slate-400">الحالة</th>
                                                    <th className="px-4 py-3 text-center text-xs font-black uppercase text-slate-400">المستندات</th>
                                                    {canEdit && <th className="px-4 py-3 text-center text-xs font-black uppercase text-slate-400">إجراء</th>}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {sc.milestones.map(m => (
                                                    <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-center gap-2">
                                                                {m.status === 'PAID'
                                                                    ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                                                                    : <Clock className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
                                                                }
                                                                <span className="font-semibold text-slate-800">{m.description}</span>
                                                            </div>
                                                            {m.paidAt && (
                                                                <p className="text-[10px] text-emerald-600 ml-5 mt-0.5">
                                                                    دُفع: {new Date(m.paidAt).toLocaleDateString('ar-SA')}
                                                                </p>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-black text-slate-800">{m.amount.toLocaleString()} SAR</td>
                                                        <td className="px-4 py-3 text-right font-semibold text-amber-600 text-xs">
                                                            {(m.vatAmount || 0) > 0 ? `${(m.vatAmount || 0).toLocaleString()} SAR` : '—'}
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <Badge className={`text-[10px] font-black rounded-full px-3 ${m.status === 'PAID'
                                                                ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                                                : 'bg-amber-100 text-amber-700 border-amber-200'}`}>
                                                                {m.status === 'PAID' ? 'مدفوع' : 'معلق'}
                                                            </Badge>
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <div className="flex items-center justify-center gap-2">
                                                                {m.transferReceiptUrl && (
                                                                    <a href={m.transferReceiptUrl} target="_blank" rel="noopener noreferrer"
                                                                        className="inline-flex items-center gap-1 text-[10px] text-emerald-600 hover:underline font-bold"
                                                                        title="إيصال الحوالة">
                                                                        <Receipt className="h-3 w-3" /> حوالة
                                                                    </a>
                                                                )}
                                                                {m.taxInvoiceUrl && (
                                                                    <a href={m.taxInvoiceUrl} target="_blank" rel="noopener noreferrer"
                                                                        className="inline-flex items-center gap-1 text-[10px] text-blue-600 hover:underline font-bold"
                                                                        title="الفاتورة الضريبية">
                                                                        <FileText className="h-3 w-3" /> فاتورة
                                                                    </a>
                                                                )}
                                                                {!m.transferReceiptUrl && !m.taxInvoiceUrl && (
                                                                    <span className="text-xs text-slate-300">—</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        {canEdit && (
                                                            <td className="px-4 py-3 text-center">
                                                                <div className="flex items-center justify-center gap-1">
                                                                    {/* Pay Button */}
                                                                    {m.status === 'PENDING' && (
                                                                        <Dialog
                                                                            open={paymentOpen === m.id}
                                                                            onOpenChange={o => {
                                                                                setPaymentOpen(o ? m.id : null)
                                                                                if (!o) {
                                                                                    setVatAmountInput('')
                                                                                    if (receiptRef.current) receiptRef.current.value = ''
                                                                                    if (invoiceRef.current) invoiceRef.current.value = ''
                                                                                }
                                                                            }}
                                                                        >
                                                                            <DialogTrigger asChild>
                                                                                <Button size="sm"
                                                                                    disabled={!canApproveFinance}
                                                                                    title={canApproveFinance ? "تأكيد الدفع" : "يلزم صلاحية 'الموافقة المالية'"}
                                                                                    className="h-7 text-[10px] font-black rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40"
                                                                                >
                                                                                    <CheckCircle2 className="h-3 w-3 mr-1" /> دفع
                                                                                </Button>
                                                                            </DialogTrigger>
                                                                            <DialogContent className="max-w-md">
                                                                                <DialogHeader>
                                                                                    <DialogTitle className="flex items-center gap-2 font-black">
                                                                                        <CheckCircle2 className="h-5 w-5 text-emerald-500" /> تأكيد الدفع للمورد
                                                                                    </DialogTitle>
                                                                                </DialogHeader>
                                                                                <div className="space-y-4 py-2">
                                                                                    {/* Payment Summary */}
                                                                                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                                                                                        <div className="flex items-start justify-between">
                                                                                            <div>
                                                                                                <p className="text-xs text-slate-500 font-bold uppercase">المورد</p>
                                                                                                <p className="font-black text-slate-900">{sc.vendor.companyName}</p>
                                                                                                <p className="text-xs text-slate-500 mt-1">{m.description}</p>
                                                                                            </div>
                                                                                            <div className="text-right">
                                                                                                <p className="text-xs text-slate-500 font-bold uppercase">المبلغ</p>
                                                                                                <p className="text-2xl font-black text-slate-900">{m.amount.toLocaleString()}</p>
                                                                                                <p className="text-xs text-slate-500">SAR</p>
                                                                                            </div>
                                                                                        </div>
                                                                                        <div className={`flex items-center gap-2 mt-3 text-xs rounded-lg px-3 py-2 ${sc.vendor.isVatRegistered ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'}`}>
                                                                                            {sc.vendor.isVatRegistered
                                                                                                ? <><ShieldCheck className="h-3.5 w-3.5" /> مسجل ضريبياً — يلزم فاتورة ضريبية + إيصال حوالة</>
                                                                                                : <><ShieldOff className="h-3.5 w-3.5" /> غير مسجل ضريبياً — يكفي إيصال الحوالة فقط</>
                                                                                            }
                                                                                        </div>
                                                                                    </div>

                                                                                    {/* Document 1: Transfer Receipt (ALWAYS required) */}
                                                                                    <div className="space-y-1.5 border border-slate-200 rounded-xl p-3">
                                                                                        <Label className="font-black flex items-center gap-2 text-slate-800">
                                                                                            <Receipt className="h-4 w-4 text-emerald-500" />
                                                                                            إيصال الحوالة البنكية <span className="text-rose-500">*</span>
                                                                                        </Label>
                                                                                        <p className="text-xs text-slate-500">مطلوب دائماً — أرفق إيصال التحويل البنكي</p>
                                                                                        <input
                                                                                            ref={receiptRef}
                                                                                            type="file"
                                                                                            accept="application/pdf,image/*"
                                                                                            className="block w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-emerald-100 file:text-emerald-700 hover:file:bg-emerald-200 border border-emerald-100 rounded-xl p-1.5 bg-emerald-50"
                                                                                        />
                                                                                    </div>

                                                                                    {/* Document 2: Tax Invoice (VAT vendors only) */}
                                                                                    {sc.vendor.isVatRegistered && (
                                                                                        <div className="space-y-1.5 border border-amber-200 rounded-xl p-3 bg-amber-50/50">
                                                                                            <Label className="font-black flex items-center gap-2 text-amber-800">
                                                                                                <FileText className="h-4 w-4 text-amber-500" />
                                                                                                الفاتورة الضريبية (PDF) <span className="text-rose-500">*</span>
                                                                                            </Label>
                                                                                            <p className="text-xs text-amber-600">مطلوب لنظام ZATCA — الفاتورة الضريبية الرسمية من المورد</p>
                                                                                            <input
                                                                                                ref={invoiceRef}
                                                                                                type="file"
                                                                                                accept="application/pdf"
                                                                                                className="block w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-amber-100 file:text-amber-700 hover:file:bg-amber-200 border border-amber-100 rounded-xl p-1.5"
                                                                                            />
                                                                                            <div className="mt-2 space-y-1.5">
                                                                                                <Label className="font-bold text-xs text-amber-700">مبلغ الضريبة المضافة (SAR) — ZATCA</Label>
                                                                                                <Input type="number"
                                                                                                    placeholder="0.00"
                                                                                                    value={vatAmountInput}
                                                                                                    onChange={e => setVatAmountInput(e.target.value)}
                                                                                                    className="rounded-xl h-10 border-amber-200 bg-white text-sm" />
                                                                                            </div>
                                                                                        </div>
                                                                                    )}

                                                                                    {/* Warning */}
                                                                                    <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                                                                                        <p className="text-xs text-red-700 font-bold flex items-center gap-1">
                                                                                            <AlertTriangle className="h-3 w-3" />
                                                                                            هذا الإجراء مُسجَّل. لا يمكن التراجع عنه إلا بموافقة المدير.
                                                                                        </p>
                                                                                    </div>
                                                                                </div>
                                                                                <DialogFooter>
                                                                                    <Button variant="ghost" onClick={() => setPaymentOpen(null)}>إلغاء</Button>
                                                                                    <Button
                                                                                        disabled={loading}
                                                                                        onClick={() => handleMarkPaid(m.id)}
                                                                                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold"
                                                                                    >
                                                                                        {loading ? "جاري المعالجة..." : "تأكيد الدفع ✓"}
                                                                                    </Button>
                                                                                </DialogFooter>
                                                                            </DialogContent>
                                                                        </Dialog>
                                                                    )}
                                                                    {/* Delete */}
                                                                    {m.status === 'PENDING' && (
                                                                        <Button size="sm" variant="ghost"
                                                                            disabled={loading}
                                                                            onClick={() => handleDeleteMilestone(m.id)}
                                                                            className="h-7 w-7 p-0 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50">
                                                                            <Trash2 className="h-3 w-3" />
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        )}
                                                    </tr>
                                                ))}
                                                {sc.milestones.length === 0 && (
                                                    <tr>
                                                        <td colSpan={canEdit ? 6 : 5} className="text-center py-8 text-muted-foreground text-sm">
                                                            لا توجد دفعات بعد. اضغط "إضافة دفعة" لإضافة مرحلة دفع.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Add Milestone */}
                                    {canEdit && (
                                        <Dialog open={addMilestoneOpen === sc.id} onOpenChange={o => setAddMilestoneOpen(o ? sc.id : null)}>
                                            <DialogTrigger asChild>
                                                <Button variant="ghost" size="sm" className="h-9 text-xs font-bold text-orange-600 hover:bg-orange-50 rounded-xl gap-1">
                                                    <Plus className="h-3.5 w-3.5" /> إضافة دفعة
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="max-w-md">
                                                <DialogHeader>
                                                    <DialogTitle className="font-black">إضافة مرحلة دفع</DialogTitle>
                                                </DialogHeader>
                                                <div className="space-y-3 py-2">
                                                    <div className="space-y-1.5">
                                                        <Label className="font-bold">الوصف *</Label>
                                                        <Input className="rounded-xl h-11"
                                                            placeholder="مثال: دفعة مقدمة، تسليم التقرير النهائي..."
                                                            value={milestoneForm.description}
                                                            onChange={e => setMilestoneForm(f => ({ ...f, description: e.target.value }))} />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="space-y-1.5">
                                                            <Label className="font-bold">المبلغ (SAR) *</Label>
                                                            <Input type="number" className="rounded-xl h-11"
                                                                placeholder="0.00"
                                                                value={milestoneForm.amount}
                                                                onChange={e => setMilestoneForm(f => ({ ...f, amount: e.target.value }))} />
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <Label className="font-bold">تاريخ الاستحقاق</Label>
                                                            <Input type="date" className="rounded-xl h-11"
                                                                value={milestoneForm.dueDate}
                                                                onChange={e => setMilestoneForm(f => ({ ...f, dueDate: e.target.value }))} />
                                                        </div>
                                                    </div>
                                                    {sc.vendor.isVatRegistered && (
                                                        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-700">
                                                            <ShieldCheck className="h-3.5 w-3.5 inline mr-1" />
                                                            هذا المورد مسجل ضريبياً — مبلغ الضريبة يُدخل عند تأكيد الدفع مع الفاتورة الضريبية
                                                        </div>
                                                    )}
                                                </div>
                                                <DialogFooter>
                                                    <Button variant="ghost" onClick={() => setAddMilestoneOpen(null)}>إلغاء</Button>
                                                    <Button
                                                        disabled={loading || !milestoneForm.description || !milestoneForm.amount}
                                                        onClick={() => handleAddMilestone(sc.id)}
                                                        className="bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold"
                                                    >
                                                        {loading ? "جاري الإضافة..." : "إضافة الدفعة"}
                                                    </Button>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                                    )}
                                </CardContent>
                            )}
                        </Card>
                    )
                })}

                {subContracts.length === 0 && (
                    <div className="text-center py-12 border-2 border-dashed border-orange-100 rounded-2xl">
                        <Building2 className="h-10 w-10 text-orange-200 mx-auto mb-3" />
                        <p className="font-bold text-slate-500 text-sm">لا يوجد موردون في هذا المشروع بعد.</p>
                        <p className="text-xs text-slate-400 mt-1">اضغط "إضافة عقد فرعي" للبدء.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
