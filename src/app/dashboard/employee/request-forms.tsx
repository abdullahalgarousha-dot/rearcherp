"use client"

import { useState } from "react"
import { submitRequest } from "@/app/admin/hr/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

export function RequestForms({ type, onSuccess }: { type: 'LOAN' | 'DOCUMENT' | 'LEAVE' | 'COMPLAINT', onSuccess?: () => void }) {
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        const formData = new FormData(e.currentTarget)
        const data = Object.fromEntries(formData.entries())

        const res = await submitRequest(type, data)
        setLoading(false)

        if (res.success) {
            toast.success(`${type.charAt(0) + type.slice(1).toLowerCase()} request submitted successfully`)
            if (onSuccess) onSuccess()
            window.location.reload()
        } else {
            toast.error(res.error || "Failed to submit")
        }
    }

    if (type === 'LOAN') {
        // ... (existing loan code)
        return (
            <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                <div className="space-y-2">
                    <Label className="font-bold">Loan Amount (SAR)</Label>
                    <Input name="amount" type="number" placeholder="5000" required className="rounded-xl border-slate-200" />
                </div>
                <div className="space-y-2">
                    <Label className="font-bold">Installments (Months)</Label>
                    <Select name="installments" defaultValue="6">
                        <SelectTrigger className="rounded-xl border-slate-200">
                            <SelectValue placeholder="Select period" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="3">3 Months</SelectItem>
                            <SelectItem value="6">6 Months</SelectItem>
                            <SelectItem value="12">12 Months</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label className="font-bold">Reason</Label>
                    <Textarea name="reason" placeholder="Personal emergency, etc." required className="rounded-xl border-slate-200" />
                </div>
                <Button type="submit" className="w-full rounded-xl font-bold py-6" disabled={loading}>
                    {loading ? <Loader2 className="mr-2 animate-spin" /> : "Submit Request"}
                </Button>
            </form>
        )
    }

    if (type === 'LEAVE') {
        // ... (existing leave code)
        return (
            <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                <div className="space-y-2">
                    <Label className="font-bold">Leave Type</Label>
                    <Select name="leaveType" defaultValue="ANNUAL" required>
                        <SelectTrigger className="rounded-xl border-slate-200">
                            <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ANNUAL">Annual Leave</SelectItem>
                            <SelectItem value="SICK">Sick Leave</SelectItem>
                            <SelectItem value="EMERGENCY">Emergency Leave</SelectItem>
                            <SelectItem value="UNPAID">Unpaid Leave</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="font-bold">Start Date</Label>
                        <Input name="startDate" type="date" required className="rounded-xl border-slate-200" />
                    </div>
                    <div className="space-y-2">
                        <Label className="font-bold">End Date</Label>
                        <Input name="endDate" type="date" required className="rounded-xl border-slate-200" />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label className="font-bold">Reason</Label>
                    <Textarea name="reason" placeholder="Family event, medical checkup, etc." required className="rounded-xl border-slate-200" />
                </div>
                <Button type="submit" className="w-full rounded-xl font-bold py-6" disabled={loading}>
                    {loading ? <Loader2 className="mr-2 animate-spin" /> : "Submit Request"}
                </Button>
            </form>
        )
    }

    if (type === 'COMPLAINT') {
        return (
            <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                <div className="space-y-2">
                    <Label className="font-bold">Subject | الموضوع</Label>
                    <Input name="subject" placeholder="Complaint subject..." required className="rounded-xl border-slate-200" />
                </div>
                <div className="space-y-2">
                    <Label className="font-bold">Details | التفاصيل</Label>
                    <Textarea name="details" placeholder="Describe the issue or suggestion..." required className="rounded-xl border-slate-200 h-32" />
                </div>
                <Button type="submit" className="w-full rounded-xl font-bold py-6 bg-rose-600 hover:bg-rose-700 text-white" disabled={loading}>
                    {loading ? <Loader2 className="mr-2 animate-spin" /> : "إرسال الشكوى / المقترح"}
                </Button>
            </form>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
            <div className="space-y-2">
                <Label className="font-bold">Document Type</Label>
                <Select name="docType" required>
                    <SelectTrigger className="rounded-xl border-slate-200">
                        <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="EXIT_RE_ENTRY">Exit/Re-entry Visa</SelectItem>
                        <SelectItem value="SALARY_CERTIFICATE">Salary Certificate</SelectItem>
                        <SelectItem value="IBAN_LETTER">IBAN Letter</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label className="font-bold">Additional Details (Optional)</Label>
                <Textarea name="details" placeholder="Specific purpose, dates, etc." className="rounded-xl border-slate-200" />
            </div>
            <Button type="submit" className="w-full rounded-xl font-bold py-6" disabled={loading}>
                {loading ? <Loader2 className="mr-2 animate-spin" /> : "Submit Request"}
            </Button>
        </form>
    )
}
