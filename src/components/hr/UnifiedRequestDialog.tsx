"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Calendar as CalendarIcon, Wallet, FileText, Send, AlertCircle } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { submitRequest } from "@/app/admin/hr/actions"

const leaveSchema = z.object({
    leaveType: z.string().min(1, "Required"),
    startDate: z.date(),
    endDate: z.date(),
    reason: z.string().min(5, "Reason is too short")
})

const loanSchema = z.object({
    amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, "Must be positive number"),
    installments: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, "Must be positive"),
    reason: z.string().min(5, "Required")
})

const docSchema = z.object({
    docType: z.string().min(1, "Required"),
    details: z.string().optional()
})

const complaintSchema = z.object({
    subject: z.string().min(5, "Required"),
    details: z.string().min(10, "Detail required")
})

export function UnifiedRequestDialog({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(false)
    const [activeTab, setActiveTab] = useState("leave")

    // Forms
    const leaveForm = useForm<z.infer<typeof leaveSchema>>({
        resolver: zodResolver(leaveSchema),
        defaultValues: { leaveType: "", reason: "" }
    })
    const loanForm = useForm<z.infer<typeof loanSchema>>({
        resolver: zodResolver(loanSchema),
        defaultValues: { amount: "", installments: "", reason: "" }
    })
    const docForm = useForm<z.infer<typeof docSchema>>({
        resolver: zodResolver(docSchema),
        defaultValues: { docType: "", details: "" }
    })
    const complaintForm = useForm<z.infer<typeof complaintSchema>>({
        resolver: zodResolver(complaintSchema),
        defaultValues: { subject: "", details: "" }
    })

    async function onSubmitLeave(values: z.infer<typeof leaveSchema>) {
        toast.loading("Submitting Leave Request...")
        const res = await submitRequest('LEAVE', values)
        if (res.success) {
            toast.success("Leave Request Submitted")
            setOpen(false)
            leaveForm.reset()
        } else {
            toast.error(res.error)
        }
        toast.dismiss()
    }

    async function onSubmitLoan(values: z.infer<typeof loanSchema>) {
        toast.loading("Submitting Loan Request...")
        const res = await submitRequest('LOAN', values)
        if (res.success) {
            toast.success("Loan Request Submitted")
            setOpen(false)
            loanForm.reset()
        } else {
            toast.error(res.error)
        }
        toast.dismiss()
    }

    async function onSubmitDoc(values: z.infer<typeof docSchema>) {
        toast.loading("Submitting Document Request...")
        const res = await submitRequest('DOCUMENT', values)
        if (res.success) {
            toast.success("Document Request Submitted")
            setOpen(false)
            docForm.reset()
        } else {
            toast.error(res.error)
        }
        toast.dismiss()
    }

    async function onSubmitComplaint(values: z.infer<typeof complaintSchema>) {
        toast.loading("Submitting Complaint...")
        const res = await submitRequest('COMPLAINT', values)
        if (res.success) {
            toast.success("Complaint Submitted")
            setOpen(false)
            complaintForm.reset()
        } else {
            toast.error(res.error)
        }
        toast.dismiss()
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden border-none shadow-2xl rounded-[2rem]">
                <div className="bg-slate-900 p-6 text-white pb-12">
                    <DialogTitle className="text-2xl font-black flex items-center gap-2">
                        <Send className="h-6 w-6 text-indigo-400" />
                        Unified Request Center
                    </DialogTitle>
                    <DialogDescription className="text-slate-400">
                        Submit a new request for approval. Choose the category below.
                    </DialogDescription>
                </div>

                <div className="-mt-6 bg-white rounded-t-[2rem] p-6">
                    <Tabs defaultValue="leave" value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-4 mb-6">
                            <TabsTrigger value="leave">Leave</TabsTrigger>
                            <TabsTrigger value="loan">Loan</TabsTrigger>
                            <TabsTrigger value="document">Doc</TabsTrigger>
                            <TabsTrigger value="complaint">Complaint</TabsTrigger>
                        </TabsList>

                        {/* LEAVE FORM */}
                        <TabsContent value="leave">
                            <Form {...leaveForm}>
                                <form onSubmit={leaveForm.handleSubmit(onSubmitLeave)} className="space-y-4">
                                    <FormField
                                        control={leaveForm.control}
                                        name="leaveType"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Leave Type</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select type" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="ANNUAL">Annual Leave</SelectItem>
                                                        <SelectItem value="SICK">Sick Leave</SelectItem>
                                                        <SelectItem value="EMERGENCY">Emergency Leave</SelectItem>
                                                        <SelectItem value="UNPAID">Unpaid Leave</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField
                                            control={leaveForm.control}
                                            name="startDate"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-col">
                                                    <FormLabel>Start Date</FormLabel>
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <FormControl>
                                                                <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                                    {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                                </Button>
                                                            </FormControl>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-auto p-0" align="start">
                                                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < new Date()} initialFocus />
                                                        </PopoverContent>
                                                    </Popover>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={leaveForm.control}
                                            name="endDate"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-col">
                                                    <FormLabel>End Date</FormLabel>
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <FormControl>
                                                                <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                                    {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                                </Button>
                                                            </FormControl>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-auto p-0" align="start">
                                                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < new Date()} initialFocus />
                                                        </PopoverContent>
                                                    </Popover>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <FormField
                                        control={leaveForm.control}
                                        name="reason"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Reason</FormLabel>
                                                <FormControl>
                                                    <Textarea placeholder="Why are you taking leave?" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700">Submit Leave Request</Button>
                                </form>
                            </Form>
                        </TabsContent>

                        {/* LOAN FORM */}
                        <TabsContent value="loan">
                            <Form {...loanForm}>
                                <form onSubmit={loanForm.handleSubmit(onSubmitLoan)} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField
                                            control={loanForm.control}
                                            name="amount"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Amount</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" placeholder="0.00" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={loanForm.control}
                                            name="installments"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Installments (Months)</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" placeholder="12" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <FormField
                                        control={loanForm.control}
                                        name="reason"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Reason for Loan</FormLabel>
                                                <FormControl>
                                                    <Textarea placeholder="Brief explanation..." {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700">Submit Loan Request</Button>
                                </form>
                            </Form>
                        </TabsContent>

                        {/* DOCUMENT FORM */}
                        <TabsContent value="document">
                            <Form {...docForm}>
                                <form onSubmit={docForm.handleSubmit(onSubmitDoc)} className="space-y-4">
                                    <FormField
                                        control={docForm.control}
                                        name="docType"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Document Type</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select document" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="SALARY_CERTIFICATE">Salary Certificate</SelectItem>
                                                        <SelectItem value="EXIT_RE_ENTRY">Exit Re-Entry Visa</SelectItem>
                                                        <SelectItem value="IBAN_LETTER">IBAN Letter</SelectItem>
                                                        <SelectItem value="EMPLOYMENT_CERTIFICATE">Employment Certificate</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={docForm.control}
                                        name="details"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Additional Details (Optional)</FormLabel>
                                                <FormControl>
                                                    <Textarea placeholder="Any specific requirements?" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <Button type="submit" className="w-full bg-amber-600 hover:bg-amber-700">Submit Document Request</Button>
                                </form>
                            </Form>
                        </TabsContent>

                        {/* COMPLAINT FORM */}
                        <TabsContent value="complaint">
                            <Form {...complaintForm}>
                                <form onSubmit={complaintForm.handleSubmit(onSubmitComplaint)} className="space-y-4">
                                    <FormField
                                        control={complaintForm.control}
                                        name="subject"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Subject</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="What is the issue?" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={complaintForm.control}
                                        name="details"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Details</FormLabel>
                                                <FormControl>
                                                    <Textarea placeholder="Describe the issue in detail..." className="min-h-[100px]" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <Button type="submit" className="w-full bg-rose-600 hover:bg-rose-700">Submit Complaint</Button>
                                </form>
                            </Form>
                        </TabsContent>
                    </Tabs>
                </div>
            </DialogContent>
        </Dialog>
    )
}
