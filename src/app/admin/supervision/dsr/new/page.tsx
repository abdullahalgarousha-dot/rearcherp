import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { BackButton } from "@/components/ui/back-button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FolderKanban, ArrowRight } from "lucide-react"
import Link from "next/link"

export default async function NewDSRProjectSelect() {
    const session = await auth()
    if (!session) redirect('/login')

    const projects = await db.project.findMany({
        orderBy: { updatedAt: 'desc' },
        include: { brand: true }
    })

    return (
        <div className="space-y-6 rtl:text-right">
            <div className="flex items-center gap-4">
                <BackButton />
                <h1 className="text-3xl font-bold tracking-tight text-primary">إنشاء تقرير يومي</h1>
            </div>

            <p className="text-muted-foreground">اختر المشروع الذي ترغب في إنشاء تقرير له:</p>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {projects.map((project: any) => (
                    <Link key={project.id} href={`/admin/supervision/dsr/${project.id}/new`} className="group">
                        <Card className="border-none shadow-lg bg-white/60 backdrop-blur-xl hover:bg-primary hover:text-white transition-all duration-300 cursor-pointer">
                            <CardContent className="p-6">
                                <div className="flex justify-between items-start">
                                    <div className="h-12 w-12 rounded-xl bg-primary/10 group-hover:bg-white/20 flex items-center justify-center text-primary group-hover:text-white mb-4">
                                        <FolderKanban className="h-6 w-6" />
                                    </div>
                                    <ArrowRight className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                                <h3 className="text-lg font-bold">{project.name}</h3>
                                <p className="text-sm opacity-70">{project.brand.nameEn} - {project.code}</p>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    )
}
