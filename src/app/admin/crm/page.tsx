import { auth } from "@/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Building2, MapPin, Receipt, Phone, Mail, UserSquare2, ArrowRight } from "lucide-react"
import { ClientDialog } from "@/components/crm/client-dialog"

export default async function ClientsDirectoryPage() {
    const session = await auth()
    const user = session?.user as any
    if (!user) return redirect('/login')

    const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT'].includes(user.role)

    // Build the query
    // - Admin/Accountant sees all clients
    // - Others only see clients connected to projects they are assigned to
    let whereClause = {}
    if (!isAdmin) {
        whereClause = {
            projects: {
                some: {
                    engineers: {
                        some: {
                            id: user.id
                        }
                    }
                }
            }
        }
    }

    const clientsRaw = await (db as any).client.findMany({
        where: whereClause,
        orderBy: { name: 'asc' },
        include: {
            // Include enough data to show project counts and simple aggregates
            projects: {
                select: {
                    id: true,
                    status: true,
                    contractValue: true,
                }
            }
        }
    })

    // Serialize
    const clients = JSON.parse(JSON.stringify(clientsRaw))

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-4xl font-bold tracking-tight text-primary">Clients Directory</h2>
                    <p className="text-muted-foreground mt-1">Manage client profiles and view consolidated statements</p>
                </div>
                {isAdmin && <ClientDialog />}
            </div>

            {clients.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed text-muted-foreground">
                    <UserSquare2 className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>No clients found matching your access level.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {clients.map((client: any) => {
                        const activeProjects = client.projects.filter((p: any) => p.status === 'ACTIVE').length
                        const totalProjects = client.projects.length

                        return (
                            <Link href={`/admin/crm/${client.id}`} key={client.id} className="group">
                                <Card className="h-full hover:shadow-xl transition-all duration-300 border-none bg-white shadow-sm hover:-translate-y-1 relative overflow-hidden flex flex-col">
                                    {/* Action Stripe */}
                                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500 to-indigo-600" />

                                    <CardHeader className="pb-3">
                                        <div className="flex justify-between items-start">
                                            <Badge variant="outline" className="font-mono text-xs text-muted-foreground bg-slate-50">
                                                {client.clientCode}
                                            </Badge>
                                        </div>
                                        <CardTitle className="text-lg font-bold leading-tight mt-3 text-slate-800 group-hover:text-primary transition-colors line-clamp-2 min-h-[56px]">
                                            {client.name}
                                        </CardTitle>
                                    </CardHeader>

                                    <CardContent className="space-y-4 pt-0 flex-1 flex flex-col">

                                        <div className="space-y-2 text-sm text-slate-600 flex-1">
                                            {client.taxNumber ? (
                                                <div className="flex items-center gap-2">
                                                    <Receipt className="w-4 h-4 text-emerald-600 shrink-0" />
                                                    <span className="font-mono text-xs">{client.taxNumber}</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 opacity-50">
                                                    <Receipt className="w-4 h-4 shrink-0" />
                                                    <span className="text-xs italic">No VAT Number</span>
                                                </div>
                                            )}

                                            {client.phone && (
                                                <div className="flex items-center gap-2">
                                                    <Phone className="w-4 h-4 text-indigo-500 shrink-0" />
                                                    <span className="truncate">{client.phone}</span>
                                                </div>
                                            )}
                                            {client.email && (
                                                <div className="flex items-center gap-2">
                                                    <Mail className="w-4 h-4 text-amber-500 shrink-0" />
                                                    <span className="truncate">{client.email}</span>
                                                </div>
                                            )}
                                            {client.address && (
                                                <div className="flex items-start gap-2 pt-1 border-t border-slate-50 mt-2">
                                                    <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                                                    <span className="line-clamp-2 text-xs leading-tight">{client.address}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex justify-between items-center mt-auto">
                                            <div className="text-center">
                                                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total</div>
                                                <div className="font-bold text-slate-700">{totalProjects}</div>
                                            </div>
                                            <div className="w-px h-8 bg-slate-200" />
                                            <div className="text-center">
                                                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active</div>
                                                <div className="font-bold text-emerald-600">{activeProjects}</div>
                                            </div>
                                            <div className="w-px h-8 bg-slate-200" />
                                            <div className="flex items-center justify-center p-2 rounded-full bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                <ArrowRight className="w-4 h-4" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
