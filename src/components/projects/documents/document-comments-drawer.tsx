"use client"

import { useState } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { MessageSquare, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { addFileComment } from "@/app/admin/projects/[projectId]/document-actions"
import { format } from "date-fns"
import { toast } from "sonner"

export function DocumentCommentsDrawer({ projectId, revisionId, comments = [] }: { projectId: string, revisionId: string, comments: any[] }) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [text, setText] = useState("")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!text.trim()) return

        setLoading(true)
        try {
            const res = await addFileComment(projectId, revisionId, text.trim())
            if (res.error) throw new Error(res.error)

            toast.success("Comment added")
            setText("")
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 shadow-sm">
                    <MessageSquare className="h-4 w-4 mr-1.5" />
                    Comments ({comments.length})
                </Button>
            </SheetTrigger>
            <SheetContent className="w-[400px] sm:w-[540px] flex flex-col h-full bg-slate-50">
                <SheetHeader className="pb-4 border-b">
                    <SheetTitle>Revision Comments</SheetTitle>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto py-4 space-y-4">
                    {comments.length === 0 ? (
                        <div className="text-center text-slate-400 mt-10">
                            <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-50" />
                            <p>No comments yet. Start the discussion.</p>
                        </div>
                    ) : (
                        comments.map((c: any) => (
                            <div key={c.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-bold text-sm text-slate-800">{c.user.name}</span>
                                    <span className="text-xs text-slate-400">{format(new Date(c.createdAt), 'MMM dd, HH:mm')}</span>
                                </div>
                                <p className="text-sm text-slate-600 whitespace-pre-wrap">{c.text}</p>
                            </div>
                        ))
                    )}
                </div>

                <div className="pt-4 border-t mt-auto">
                    <form onSubmit={handleSubmit} className="flex gap-2">
                        <Input
                            placeholder="Add a comment..."
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            disabled={loading}
                            autoFocus
                        />
                        <Button type="submit" disabled={loading || !text.trim()} className="shrink-0">
                            <Send className="h-4 w-4" />
                        </Button>
                    </form>
                </div>
            </SheetContent>
        </Sheet>
    )
}
