"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2, UserPlus, Edit, Save } from "lucide-react"
import { createClient, updateClient, ClientDTO } from "@/app/admin/crm/actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

const clientSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    taxNumber: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email("Invalid email").optional().or(z.literal("")),
    address: z.string().optional(),
})

type ClientFormValues = z.infer<typeof clientSchema>

interface ClientDialogProps {
    client?: ClientDTO | null
    trigger?: React.ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
}

export function ClientDialog({ client, trigger, open: controlledOpen, onOpenChange }: ClientDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    const isEditing = !!client
    const open = controlledOpen !== undefined ? controlledOpen : internalOpen
    const setOpen = onOpenChange || setInternalOpen

    const form = useForm<ClientFormValues>({
        resolver: zodResolver(clientSchema),
        defaultValues: {
            name: client?.name || "",
            taxNumber: client?.taxNumber || "",
            phone: client?.phone || "",
            email: client?.email || "",
            address: client?.address || "",
        }
    })

    const onSubmit = async (values: ClientFormValues) => {
        try {
            setIsLoading(true)
            if (isEditing && client) {
                await updateClient(client.id, values)
                toast.success("Client profile updated successfully")
            } else {
                await createClient(values)
                toast.success("New client added successfully")
            }
            setOpen(false)
            form.reset()
            router.refresh()
        } catch (error: any) {
            toast.error(error.message || "Something went wrong")
        } finally {
            setIsLoading(false)
        }
    }

    // Reset form when opening to edit a different client
    const handleOpenChange = (newOpen: boolean) => {
        if (newOpen) {
            form.reset({
                name: client?.name || "",
                taxNumber: client?.taxNumber || "",
                phone: client?.phone || "",
                email: client?.email || "",
                address: client?.address || "",
            })
        }
        setOpen(newOpen)
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button className="gap-2 shrink-0">
                        {isEditing ? <Edit className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                        {isEditing ? "Edit Client" : "Add Client"}
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? "Edit Client Profile" : "Add New Client"}</DialogTitle>
                    <DialogDescription>
                        {isEditing ? "Update the details for this client." : "Enter the details for the new client."}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Client Name *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g. Abdullah Saad" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="taxNumber"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Tax / VAT Number</FormLabel>
                                        <FormControl>
                                            <Input placeholder="ZATCA Number" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="phone"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Phone Number</FormLabel>
                                        <FormControl>
                                            <Input placeholder="+966 50..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email Address</FormLabel>
                                    <FormControl>
                                        <Input type="email" placeholder="client@example.com" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="address"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Address</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Riyadh, KSA" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter className="pt-4">
                            <Button type="submit" disabled={isLoading} className="w-full sm:w-auto gap-2">
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {isEditing ? "Save Changes" : "Create Client"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
