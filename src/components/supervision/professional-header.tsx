import { format } from "date-fns"

export function ProfessionalHeader({
    project,
    title,
    reference,
    revision,
    date
}: {
    project: any,
    title: string,
    reference?: string | null,
    revision?: number,
    date: Date | string
}) {
    // Determine Brand Logo
    const brandLogo = project.brand?.logoUrl || "/brands/generic.png"
    const brandName = project.brand?.nameEn || project.brand?.fullName || "Consultant"

    return (
        <div className="border-b-2 border-slate-900 pb-4 mb-6 print:mb-4">
            <div className="flex justify-between items-center">
                {/* Brand Logo (Left) */}
                <div className="w-1/4">
                    {/* Use a simple text fallback if no logo, or imagine an <img /> */}
                    <div className="font-black text-2xl tracking-tighter text-slate-900 uppercase">
                        {project.brand?.shortName || brandName}
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">
                        Construction Management
                    </div>
                </div>

                {/* Project Info (Center) */}
                <div className="w-1/2 text-center space-y-1">
                    <h1 className="text-xl font-bold uppercase tracking-tight text-slate-900">{project.name}</h1>
                    <p className="text-sm font-medium text-slate-600">{project.client}</p>
                    <div className="inline-block px-4 py-1 bg-slate-900 text-white text-sm font-bold uppercase tracking-wider rounded-sm mt-2">
                        {title}
                    </div>
                </div>

                {/* Document Info (Right) */}
                <div className="w-1/4 text-right space-y-1">
                    <div className="text-xs text-slate-500 font-medium uppercase">Reference</div>
                    <div className="font-mono font-bold text-slate-900">{reference || "---"}</div>

                    <div className="flex justify-end gap-4 mt-2">
                        <div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase">Date</div>
                            <div className="font-medium text-sm">{format(new Date(date), "dd MMM yyyy")}</div>
                        </div>
                        {revision !== undefined && (
                            <div>
                                <div className="text-[10px] text-slate-400 font-bold uppercase">Rev</div>
                                <div className="font-medium text-sm">{revision}</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
