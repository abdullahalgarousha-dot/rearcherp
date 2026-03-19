import { auth } from "@/auth"
import { db } from "@/lib/db"
import { BackButton } from "@/components/ui/back-button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { NewIRForm } from "./new-ir-form"

export default async function NewIRPage({ params }: { params: Promise<{ projectId: string }> }) {
    const { projectId } = await params

    // Fetch Tasks for Dropdown
    const tasks = await (db as any).task.findMany({
        where: { projectId },
        select: { id: true, name: true }
    })

    return (
        <div className="space-y-6 rtl:text-right pb-20 max-w-3xl mx-auto">
            <div className="flex items-center gap-3">
                <BackButton />
                <h1 className="text-2xl font-bold text-slate-900">Submit New Inspection Request</h1>
            </div>

            <Card className="border-none shadow-xl bg-white/70 backdrop-blur-md">
                <CardHeader>
                    <CardTitle>IR Information</CardTitle>
                </CardHeader>
                <CardContent>
                    <NewIRForm projectId={projectId} tasks={tasks} />
                </CardContent>
            </Card>
        </div>
    )
}
