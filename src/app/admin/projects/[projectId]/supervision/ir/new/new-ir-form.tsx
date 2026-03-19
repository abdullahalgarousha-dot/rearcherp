"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createIR } from "../actions"
import { useRouter } from "next/navigation"
import { Loader2, UploadCloud } from "lucide-react"

export function NewIRForm({ projectId, tasks }: { projectId: string, tasks: any[] }) {
    const [loading, setLoading] = useState(false)
    const [type, setType] = useState("MATERIAL")
    const [taskId, setTaskId] = useState("none")
    const router = useRouter()

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        const formData = new FormData(e.currentTarget)
        formData.append("type", type)
        if (taskId !== "none") {
            formData.append("taskId", taskId)
        }

        const res = await createIR(projectId, formData)

        if (res.success) {
            router.push(`/admin/projects/${projectId}/supervision/ir`)
            router.refresh()
        } else {
            alert(res.error || "Failed to create IR")
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label>Date</Label>
                    <Input type="date" name="date" required defaultValue={new Date().toISOString().split('T')[0]} />
                </div>

                <div className="space-y-2">
                    <Label>Type</Label>
                    <Select required value={type} onValueChange={setType}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="MATERIAL">Material Inspection</SelectItem>
                            <SelectItem value="WORK">Work Inspection</SelectItem>
                            <SelectItem value="TESTING">Testing / Commissioning</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>Contractor Reference</Label>
                    <Input name="contractorRef" placeholder="e.g. REF-001" required />
                </div>

                <div className="space-y-2">
                    <Label>Related Task (Optional)</Label>
                    <Select value={taskId} onValueChange={setTaskId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select Task" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {tasks.map(t => (
                                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="space-y-2">
                <Label>Description</Label>
                <Textarea name="description" placeholder="Brief description of the inspection..." required />
            </div>

            <div className="space-y-2">
                <Label>Contractor's Report (Mandatory)</Label>
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:bg-slate-50 transition-colors cursor-pointer relative">
                    <Input
                        type="file"
                        name="file"
                        accept=".pdf,.jpg,.png,.jpeg"
                        required
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <UploadCloud className="h-10 w-10 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-500 font-medium">Click to upload Contractor's Report</p>
                    <p className="text-xs text-slate-400">PDF or Images only</p>
                </div>
            </div>

            <div className="pt-4">
                <Button type="submit" className="w-full h-12 text-lg shadow-lg shadow-primary/20" disabled={loading}>
                    {loading ? <span className="flex items-center gap-2"><Loader2 className="animate-spin" /> Submitting...</span> : "Submit Inspection Request"}
                </Button>
            </div>
        </form>
    )
}
