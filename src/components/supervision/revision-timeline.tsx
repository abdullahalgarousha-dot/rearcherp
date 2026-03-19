import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { format } from "date-fns"
import { CheckCircle2, XCircle, Clock, FileText, ArrowRight } from "lucide-react"

interface RevisionTimelineProps {
    revisions: any[]
    activeRev: number
    onSelectRev: (rev: number) => void
    currentParentStatus: string
}

export function RevisionTimeline({ revisions, activeRev, onSelectRev, currentParentStatus }: RevisionTimelineProps) {
    // Sort revisions descending (newest first)
    const sortedRevisions = [...revisions].sort((a, b) => b.revNumber - a.revNumber)

    return (
        <div className="h-full flex flex-col bg-white border-l border-slate-200 w-80 min-w-[320px]">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                <h3 className="font-bold text-slate-900 text-sm">سجل المراجعات (History)</h3>
                <p className="text-xs text-slate-500 mt-1">اضغط على النسخة للعرض</p>
            </div>

            <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                    {sortedRevisions.map((rev) => (
                        <div
                            key={rev.id}
                            onClick={() => onSelectRev(rev.revNumber)}
                            className={cn(
                                "relative p-4 rounded-xl border transition-all cursor-pointer group hover:shadow-md",
                                activeRev === rev.revNumber
                                    ? "bg-white border-primary/50 shadow-md ring-1 ring-primary/20"
                                    : "bg-white border-slate-100 hover:border-slate-300"
                            )}
                        >
                            {/* Active Indicator Line */}
                            {activeRev === rev.revNumber && (
                                <div className="absolute right-0 top-4 bottom-4 w-1 bg-primary rounded-l-full" />
                            )}

                            <div className="flex justify-between items-start mb-2">
                                <span className="font-black font-mono text-sm text-slate-700">REV {rev.revNumber}</span>
                                <Badge variant="outline" className={cn(
                                    "text-[10px] h-5",
                                    rev.status === 'APPROVED' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                        rev.status === 'REJECTED' ? "bg-red-50 text-red-700 border-red-200" :
                                            "bg-orange-50 text-orange-700 border-orange-200"
                                )}>
                                    {rev.status}
                                </Badge>
                            </div>

                            <div className="text-xs text-slate-500 space-y-1">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-3 h-3" />
                                    <span>{format(new Date(rev.createdAt), "dd MMM, hh:mm a")}</span>
                                </div>
                                {rev.respondedBy && (
                                    <div className="flex items-center gap-2 text-slate-600 font-medium">
                                        <CheckCircle2 className="w-3 h-3" />
                                        <span>Replied by: {rev.respondedBy.name}</span>
                                    </div>
                                )}
                            </div>

                            {/* Revision Notes / Comments Preview */}
                            {rev.comments && (
                                <div className="mt-3 pt-2 border-t border-slate-100">
                                    <p className="text-[10px] text-slate-600 line-clamp-2 italic">
                                        "{rev.comments}"
                                    </p>
                                </div>
                            )}
                        </div>
                    ))}

                    {revisions.length === 0 && (
                        <div className="text-center py-8 text-slate-400 text-xs">
                            No revisions found.
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    )
}
