"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { format } from "date-fns"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
    FileText,
    Banknote,
    Calendar,
    CheckCircle2,
    XCircle,
    Eye,
    Filter,
    Upload
} from "lucide-react"
import { processRequest, uploadMedicalReport } from "@/app/admin/hr/actions"
import { toast } from "sonner"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface ExtendedRequest {
    id: string
    type: 'LEAVE' | 'LOAN' | 'DOCUMENT'
    subType: string
    requester: {
        name: string
        image: string | null
        position: string
    }
    details: string
    status: string
    date: Date
    raw: any
}

export function UnifiedInbox({ initialRequests, userRole, canApprove: hasApprovePermission }: { initialRequests: any[], userRole: string, canApprove: boolean }) {
    const [requests, setRequests] = useState<ExtendedRequest[]>(initialRequests)
    const [filter, setFilter] = useState('ALL')
    const [uploadingId, setUploadingId] = useState<string | null>(null)

    const filteredRequests = requests.filter(r =>
        filter === 'ALL' ? true : r.type === filter
    )

    const handleAction = async (id: string, type: any, action: 'APPROVE' | 'REJECT') => {
        toast.loading("Processing...")
        const result = await processRequest(id, action, 'HR') // Role is checked in backend now

        if (result.success) {
            toast.success(`Request ${action === 'APPROVE' ? 'Approved' : 'Rejected'}`)
            // Optimistic Update
            setRequests(prev => prev.map(r =>
                r.id === id ? { ...r, status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED' } : r
            ))
        } else {
            toast.error(result.error || "Action failed")
        }
        toast.dismiss()
    }

    const handleUpload = async (id: string, e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        const file = formData.get("file") as File
        if (!file || file.size === 0) {
            toast.error("Please select a file")
            return
        }

        setUploadingId(id)
        toast.loading("Uploading Medical Report to Drive...")

        const result = await uploadMedicalReport(id, formData)

        setUploadingId(null)
        if (result.success) {
            toast.success("Medical Report attached successfully. Status updated to Pending.")
            setRequests(prev => prev.map(r =>
                // Mark optimistic status, could be PENDING_MANAGER or PENDING_HR in reality
                r.id === id ? { ...r, status: 'PENDING_MANAGER', raw: { ...r.raw, attachmentLink: 'uploaded' } } : r
            ))
            // Force close dialog hack
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        } else {
            toast.error(result.error || "Failed to upload report")
        }
        toast.dismiss()
    }

    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'APPROVED': return "default" // or 'success' if available in your badge variants
            case 'REJECTED': return "destructive"
            case 'PENDING_MANAGER': return "outline"
            case 'PENDING_HR': return "secondary"
            default: return "default"
        }
    }

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'LEAVE': return <Calendar className="h-4 w-4 text-indigo-500" />
            case 'LOAN': return <Banknote className="h-4 w-4 text-emerald-500" />
            case 'DOCUMENT': return <FileText className="h-4 w-4 text-amber-500" />
            default: return <FileText className="h-4 w-4" />
        }
    }

    const canApprove = (status: string) => {
        if (!hasApprovePermission) return false
        // Prevent approval if waiting for attachment
        if (status === 'PENDING_ATTACHMENT') return false
        return status.includes('PENDING')
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-slate-500" />
                    <Select value={filter} onValueChange={setFilter}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filter by Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Requests</SelectItem>
                            <SelectItem value="LEAVE">Leaves</SelectItem>
                            <SelectItem value="LOAN">Loans</SelectItem>
                            <SelectItem value="DOCUMENT">Documents</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="text-sm text-slate-500">
                    Showing {filteredRequests.length} requests
                </div>
            </div>

            <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50">
                            <TableHead>Type</TableHead>
                            <TableHead>Requester</TableHead>
                            <TableHead>Details</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredRequests.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    No requests found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredRequests.map((request) => (
                                <TableRow key={request.id} className="hover:bg-slate-50/50">
                                    <TableCell>
                                        <div className="flex items-center gap-2 font-medium">
                                            {getTypeIcon(request.type)}
                                            {request.type}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={request.requester.image || ""} />
                                                <AvatarFallback>{request.requester.name?.[0]}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-medium text-sm">{request.requester.name}</p>
                                                <p className="text-xs text-slate-500">{request.requester.position}</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <p className="text-sm text-slate-700 max-w-[300px] truncate" title={request.details}>
                                            {request.details}
                                        </p>
                                    </TableCell>
                                    <TableCell className="text-slate-500 text-sm">
                                        {format(new Date(request.date), 'MMM dd, yyyy')}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={getStatusVariant(request.status) as any}>
                                            {request.status.replace('_', ' ')}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {canApprove(request.status) && (
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    size="sm"
                                                    className="h-8 w-8 p-0 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-emerald-200"
                                                    variant="outline"
                                                    onClick={() => handleAction(request.id, request.type, 'APPROVE')}
                                                    title="Approve"
                                                >
                                                    <CheckCircle2 className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    className="h-8 w-8 p-0 bg-rose-50 text-rose-600 hover:bg-rose-100 border-rose-200"
                                                    variant="outline"
                                                    onClick={() => handleAction(request.id, request.type, 'REJECT')}
                                                    title="Reject"
                                                >
                                                    <XCircle className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        )}
                                        {request.status === 'PENDING_ATTACHMENT' && (
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button
                                                        size="sm"
                                                        className="h-8 gap-1 bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200"
                                                        variant="outline"
                                                        title="Upload Medical Report"
                                                    >
                                                        <Upload className="h-4 w-4" />
                                                        Upload
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent>
                                                    <form onSubmit={(e) => handleUpload(request.id, e)}>
                                                        <DialogHeader>
                                                            <DialogTitle>Attach Medical Report</DialogTitle>
                                                            <DialogDescription>
                                                                Upload the official medical report to proceed with the leave approval.
                                                                This will be securely saved to the employee's Drive folder constraint.
                                                            </DialogDescription>
                                                        </DialogHeader>
                                                        <div className="grid gap-4 py-4">
                                                            <div className="grid gap-2">
                                                                <Label htmlFor="file">Medical Report (PDF/Image)</Label>
                                                                <Input id="file" name="file" type="file" required accept=".pdf,image/*" />
                                                            </div>
                                                        </div>
                                                        <Button type="submit" disabled={uploadingId === request.id} className="w-full">
                                                            {uploadingId === request.id ? "Uploading..." : "Upload securely to Drive"}
                                                        </Button>
                                                    </form>
                                                </DialogContent>
                                            </Dialog>
                                        )}
                                        {['APPROVED', 'REJECTED'].includes(request.status) && (
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0"><Eye className="h-4 w-4 text-slate-400" /></Button>
                                                </DialogTrigger>
                                                <DialogContent>
                                                    <DialogHeader>
                                                        <DialogTitle>Request Details</DialogTitle>
                                                        <DialogDescription>
                                                            Full details of the processed request.
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <div className="space-y-4 pt-4">
                                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                                            <div>
                                                                <span className="font-bold block">Status:</span>
                                                                <Badge>{request.status}</Badge>
                                                            </div>
                                                            <div>
                                                                <span className="font-bold block">Date:</span>
                                                                {format(new Date(request.date), 'PP')}
                                                            </div>
                                                            <div className="col-span-2">
                                                                <span className="font-bold block">Details:</span>
                                                                <p className="bg-slate-50 p-2 rounded border mt-1">{request.details}</p>
                                                            </div>
                                                            {request.raw.rejectionReason && (
                                                                <div className="col-span-2">
                                                                    <span className="font-bold block text-red-600">Rejection Reason:</span>
                                                                    <p className="bg-red-50 text-red-700 p-2 rounded border border-red-100 mt-1">{request.raw.rejectionReason}</p>
                                                                </div>
                                                            )}
                                                            {request.raw.attachmentLink && (
                                                                <div className="col-span-2">
                                                                    <span className="font-bold block text-blue-600">Attachment:</span>
                                                                    <a href={request.raw.attachmentLink} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline flex items-center gap-1 mt-1">
                                                                        <FileText className="h-4 w-4" /> View Medical Report
                                                                    </a>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </DialogContent>
                                            </Dialog>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
