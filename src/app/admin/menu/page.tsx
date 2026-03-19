import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Pencil, Trash } from "lucide-react"
import { createMenuLink, deleteMenuLink, updateMenuLink } from "./actions"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default async function MenuPage() {
    const session = await auth()
    if (!session) redirect('/login')

    const links = await (db as any).menuLink.findMany({
        orderBy: { order: 'asc' }
    })

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Menu Management</h1>
                <MenuDialog />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Sidebar Links</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Order</TableHead>
                                <TableHead>Label</TableHead>
                                <TableHead>HREF</TableHead>
                                <TableHead>Icon</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {links.map((link: any) => (
                                <TableRow key={link.id}>
                                    <TableCell>{link.order}</TableCell>
                                    <TableCell className="font-medium">{link.label}</TableCell>
                                    <TableCell>{link.href}</TableCell>
                                    <TableCell>{link.icon}</TableCell>
                                    <TableCell className="text-right flex justify-end gap-2">
                                        <MenuDialog link={link} />
                                        <DeleteButton id={link.id} />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}

function MenuDialog({ link }: { link?: any }) {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant={link ? "ghost" : "default"} size={link ? "icon" : "default"}>
                    {link ? <Pencil className="h-4 w-4" /> : <><Plus className="mr-2 h-4 w-4" /> Add Link</>}
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{link ? "Edit Link" : "Add New Link"}</DialogTitle>
                </DialogHeader>
                <form action={link ? updateMenuLink : createMenuLink} className="space-y-4">
                    {link && <input type="hidden" name="id" value={link.id} />}
                    <div className="grid gap-2">
                        <Label>Label</Label>
                        <Input name="label" defaultValue={link?.label} required />
                    </div>
                    <div className="grid gap-2">
                        <Label>HREF</Label>
                        <Input name="href" defaultValue={link?.href} required />
                    </div>
                    <div className="grid gap-2">
                        <Label>Icon (Lucide Name)</Label>
                        <Input name="icon" defaultValue={link?.icon} required placeholder="LayoutDashboard, Users, etc." />
                    </div>
                    <div className="grid gap-2">
                        <Label>Order</Label>
                        <Input name="order" type="number" defaultValue={link?.order || 0} required />
                    </div>
                    <Button type="submit" className="w-full">{link ? "Update" : "Create"}</Button>
                </form>
            </DialogContent>
        </Dialog>
    )
}

function DeleteButton({ id }: { id: string }) {
    return (
        <form action={async () => {
            "use server"
            await deleteMenuLink(id)
        }}>
            <Button variant="ghost" size="icon" type="submit" className="text-red-500 hover:text-red-600 hover:bg-red-50">
                <Trash className="h-4 w-4" />
            </Button>
        </form>
    )
}
