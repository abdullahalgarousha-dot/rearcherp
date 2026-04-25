"use client"

import { useState, useMemo } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Plus, Trash2, Loader2, Calculator } from "lucide-react"
import { createInvoice } from "./actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

const invoiceSchema = z.object({
    invoiceNumber: z.string().min(1, "Invoice number is required"),
    description: z.string().min(1, "Description is required"),
    projectId: z.string().min(1, "Project is required"),
    date: z.string().min(1, "Date is required"),
    discountType: z.enum(["PERCENTAGE", "FIXED"]).optional().nullable(),
    discountValue: z.coerce.number().min(0).default(0),
    items: z.array(z.object({
        description: z.string().min(1, "Item description required"),
        quantity: z.coerce.number().min(0.01, "Quantity must be > 0"),
        unitPrice: z.coerce.number().min(0, "Price must be >= 0"),
    })).min(1, "At least one item is required"),
})

export type InvoiceFormValues = z.infer<typeof invoiceSchema>

export function IssueInvoiceForm({ projectsForForm }: { projectsForForm: any[] }) {
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    const form = useForm<InvoiceFormValues>({
        resolver: zodResolver(invoiceSchema) as any,
        defaultValues: {
            invoiceNumber: `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000)}`,
            description: "",
            projectId: "",
            date: new Date().toISOString().split('T')[0],
            discountType: "FIXED",
            discountValue: 0,
            items: [{ description: "", quantity: 1, unitPrice: 0 }]
        }
    })

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "items"
    })

    // Watch fields for live calculation
    const watchItems = form.watch("items")
    const discountType = form.watch("discountType")
    const discountValue = form.watch("discountValue")
    const projectId = form.watch("projectId")

    // Determine client type
    const selectedProject = projectsForForm.find(p => p.id === projectId)
    const clientType = selectedProject?.client?.clientType || "COMPANY"
    const invoiceType = clientType === "INDIVIDUAL" ? "SIMPLIFIED" : "STANDARD"

    const calculations = useMemo(() => {
        let itemsTotal = 0
        watchItems.forEach(item => {
            const qty = Number(item.quantity) || 0
            const price = Number(item.unitPrice) || 0
            itemsTotal += (qty * price)
        })

        let discountAmount = 0
        const dVal = Number(discountValue) || 0
        if (discountType === "PERCENTAGE") {
            discountAmount = itemsTotal * (dVal / 100)
        } else if (discountType === "FIXED") {
            discountAmount = dVal
        }

        const taxableSubtotal = Math.max(0, itemsTotal - discountAmount)
        const vatAmount = taxableSubtotal * 0.15
        const grandTotal = taxableSubtotal + vatAmount

        return { itemsTotal, discountAmount, taxableSubtotal, vatAmount, grandTotal }
    }, [watchItems, discountType, discountValue])

    const onSubmit = async (values: InvoiceFormValues) => {
        try {
            setIsLoading(true)
            const result = await createInvoice(values)
            if (result?.error) {
                toast.error(result.error)
            } else {
                toast.success("Invoice created successfully")
                router.refresh()
                form.reset()
            }
        } catch (e: any) {
            toast.error(e.message || "Failed to create invoice")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                
                <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="projectId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Project</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {projectsForForm.map((p: any) => (
                                            <SelectItem key={p.id} value={p.id}>{p.code} – {p.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    
                    <FormField
                        control={form.control}
                        name="invoiceNumber"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Invoice #</FormLabel>
                                <FormControl>
                                    <Input placeholder="INV-2026-001" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Subject / Description</FormLabel>
                                <FormControl>
                                    <Input placeholder="Payment milestone / Progress claim" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="date"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Issue Date</FormLabel>
                                <FormControl>
                                    <Input type="date" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                
                {/* Dynamic Line Items */}
                <div className="space-y-4 pt-6 mt-4 border-t border-slate-100">
                    <div className="flex justify-between items-center mb-2">
                        <Label className="text-base font-bold text-slate-800">Line Items</Label>
                    </div>

                    {/* Header Row */}
                    <div className="hidden md:grid grid-cols-12 gap-3 pb-2 border-b border-slate-100 px-1">
                        <div className="col-span-12 md:col-span-5 text-xs font-bold text-slate-500 uppercase tracking-widest">Description (الوصف)</div>
                        <div className="col-span-12 md:col-span-2 text-xs font-bold text-slate-500 uppercase tracking-widest">Qty (الكمية)</div>
                        <div className="col-span-12 md:col-span-2 text-xs font-bold text-slate-500 uppercase tracking-widest">Unit Price (سعر الوحدة)</div>
                        <div className="col-span-12 md:col-span-2 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Total (الإجمالي)</div>
                        <div className="col-span-12 md:col-span-1"></div>
                    </div>

                    <div className="space-y-3">
                        {fields.map((field, index) => (
                            <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start animate-in fade-in slide-in-from-top-2 p-3 md:p-1 bg-slate-50 md:bg-transparent rounded-xl md:rounded-none border border-slate-100 md:border-transparent">
                                
                                <div className="col-span-12 md:col-span-5">
                                    <FormField
                                        control={form.control}
                                        name={`items.${index}.description`}
                                        render={({ field }) => (
                                            <FormItem className="space-y-1">
                                                <div className="md:hidden text-xs font-bold text-slate-500 uppercase mb-1">Description (الوصف)</div>
                                                <FormControl>
                                                    <Input placeholder="Item name..." className="bg-white border-slate-200 shadow-sm" {...field} />
                                                </FormControl>
                                                <FormMessage className="text-[10px]" />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                
                                <div className="grid grid-cols-2 md:grid-cols-4 col-span-12 md:col-span-4 gap-3 md:gap-3">
                                    <div className="col-span-1 md:col-span-2">
                                        <FormField
                                            control={form.control}
                                            name={`items.${index}.quantity`}
                                            render={({ field }) => (
                                                <FormItem className="space-y-1">
                                                    <div className="md:hidden text-xs font-bold text-slate-500 uppercase mb-1">Qty (الكمية)</div>
                                                    <FormControl>
                                                        <Input type="number" step="0.01" placeholder="1" className="bg-white border-slate-200 shadow-sm" {...field} />
                                                    </FormControl>
                                                    <FormMessage className="text-[10px]" />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <div className="col-span-1 md:col-span-2">
                                        <FormField
                                            control={form.control}
                                            name={`items.${index}.unitPrice`}
                                            render={({ field }) => (
                                                <FormItem className="space-y-1">
                                                    <div className="md:hidden text-xs font-bold text-slate-500 uppercase mb-1">Unit Price (سعر الوحدة)</div>
                                                    <FormControl>
                                                        <Input type="number" step="0.01" placeholder="0.00" className="bg-white border-slate-200 shadow-sm" {...field} />
                                                    </FormControl>
                                                    <FormMessage className="text-[10px]" />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-3 col-span-12 md:col-span-3 items-center gap-3 md:gap-0 pt-2 md:pt-0 mt-2 md:mt-0 border-t border-slate-200 md:border-transparent">
                                    <div className="col-span-1 md:col-span-2 flex items-center md:justify-end h-10 px-3 bg-white md:bg-slate-50 rounded-md border border-slate-200">
                                        <div className="md:hidden text-xs font-bold text-slate-500 uppercase mr-3">Total</div>
                                        <span className="text-sm font-bold text-slate-700">
                                            {((Number(watchItems[index]?.quantity) || 0) * (Number(watchItems[index]?.unitPrice) || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                    <div className="col-span-1 flex items-center justify-end h-10">
                                        <Button 
                                            type="button" 
                                            variant="ghost" 
                                            size="icon" 
                                            className="text-rose-500 hover:text-rose-700 hover:bg-rose-100 md:hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors h-10 w-10 shrink-0"
                                            onClick={() => remove(index)}
                                            disabled={fields.length === 1}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>

                            </div>
                        ))}
                    </div>
                    
                    <Button 
                        type="button" 
                        variant="secondary" 
                        size="sm" 
                        className="gap-2 text-xs font-bold mt-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-100"
                        onClick={() => append({ description: "", quantity: 1, unitPrice: 0 })}
                    >
                        <Plus className="w-4 h-4" /> Add Line Item
                    </Button>
                </div>

                {/* Discount */}
                <div className="flex items-end gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <FormField
                        control={form.control}
                        name="discountType"
                        render={({ field }) => (
                            <FormItem className="w-48">
                                <FormLabel className="text-xs text-slate-500 font-bold uppercase tracking-wider">Discount Type</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                                    <FormControl>
                                        <SelectTrigger className="bg-white"><SelectValue placeholder="Discount Type" /></SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="FIXED">Fixed Amount (SAR)</SelectItem>
                                        <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="discountValue"
                        render={({ field }) => (
                            <FormItem className="w-32">
                                <FormLabel className="text-xs text-slate-500 font-bold uppercase tracking-wider">Value</FormLabel>
                                <FormControl>
                                    <Input type="number" step="0.01" className="bg-white" {...field} />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                </div>

                {/* Live Preview Summary */}
                <div className="bg-[#1e293b] rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
                    <Calculator className="absolute right-[-20px] bottom-[-20px] w-48 h-48 text-white/5" />
                    
                    <div className="flex justify-between items-end mb-4 border-b border-white/10 pb-4">
                        <div>
                            <h3 className="text-lg font-black tracking-tight">Invoice Summary</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`text-[10px] uppercase font-black tracking-widest px-2 py-0.5 rounded-full ${clientType === 'COMPANY' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                                    {invoiceType} INVOICE
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2 relative z-10">
                        <div className="flex justify-between text-sm font-medium text-slate-300">
                            <span>Total Items Amount:</span>
                            <span>SAR {calculations.itemsTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                        {calculations.discountAmount > 0 && (
                            <div className="flex justify-between text-sm font-medium text-rose-400">
                                <span>Discount Amount:</span>
                                <span>- SAR {calculations.discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-sm font-bold text-slate-200 pt-2 border-t border-white/10">
                            <span>Taxable Subtotal:</span>
                            <span>SAR {calculations.taxableSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between text-sm font-medium text-emerald-400">
                            <span>VAT (15%):</span>
                            <span>SAR {calculations.vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between text-2xl font-black text-white pt-3 border-t border-white/10 mt-2">
                            <span>Grand Total:</span>
                            <span>SAR {calculations.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                </div>

                <Button type="submit" disabled={isLoading} className="w-full rounded-xl bg-primary hover:bg-primary/90 font-bold h-12 text-lg">
                    {isLoading ? <Loader2 className="w-5 h-5 mr-3 animate-spin" /> : null}
                    Save & Issue {invoiceType} Invoice
                </Button>
            </form>
        </Form>
    )
}
