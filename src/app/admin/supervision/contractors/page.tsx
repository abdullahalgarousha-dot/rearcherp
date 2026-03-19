import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { BackButton } from "@/components/ui/back-button"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Building2, Plus, Phone, Globe, Trash2 } from "lucide-react"
import { NewContractorDialog } from "../../../../components/supervision/new-contractor-dialog"

export default async function ContractorsPage() {
    const session = await auth()
    const userRole = (session?.user as any)?.role

    if (userRole !== 'ADMIN' && userRole !== 'PM') {
        redirect('/admin/supervision')
    }

    const contractors = await db.contractor.findMany({
        orderBy: { companyName: 'asc' }
    })

    return (
        <div className="space-y-6 rtl:text-right">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <BackButton />
                    <h1 className="text-3xl font-bold tracking-tight text-primary">إدارة المقاولين</h1>
                </div>
                <NewContractorDialog />
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {contractors.map((contractor: any) => (
                    <Card key={contractor.id} className="group relative overflow-hidden border-none shadow-lg bg-white/60 backdrop-blur-xl hover:shadow-2xl transition-all duration-300">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="h-16 w-16 rounded-2xl bg-primary/5 flex items-center justify-center text-primary border border-primary/10 overflow-hidden group-hover:scale-110 transition-transform">
                                    {contractor.logo ? (
                                        <img src={contractor.logo} alt={contractor.companyName} className="h-full w-full object-cover" />
                                    ) : (
                                        <Building2 className="h-8 w-8" />
                                    )}
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-primary">{contractor.companyName}</h3>
                                    <p className="text-xs text-muted-foreground">{contractor.contactInfo || "لا توجد بيانات اتصال"}</p>
                                </div>
                            </div>

                            <div className="flex gap-2 pt-4 border-t border-primary/5">
                                <Button variant="secondary" size="sm" className="w-full rounded-xl bg-primary/5 text-primary hover:bg-primary/10">
                                    <Phone className="mr-2 h-4 w-4" />
                                    اتصال
                                </Button>
                                <Button variant="secondary" size="sm" className="w-full rounded-xl bg-primary/5 text-primary hover:bg-primary/10">
                                    <Globe className="mr-2 h-4 w-4" />
                                    الموقع
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {contractors.length === 0 && (
                    <div className="col-span-full py-20 text-center">
                        <Building2 className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
                        <p className="text-muted-foreground">لا يوجد مقاولون مسجلون حالياً. ابدأ بإضافة مقاول جديد.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
