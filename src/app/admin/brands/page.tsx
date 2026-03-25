import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { Badge } from "@/components/ui/badge"
import { Building2, Sparkles, Globe, Hash, ShieldCheck, Mail, Phone, MapPin } from "lucide-react"
import { BrandAddDialog, BrandEditDialog, BrandDeleteDialog, SetDefaultBrandButton } from "@/components/brands/brand-crud-dialogs"

export default async function BrandsCRUDPage() {
    const session = await auth()
    const userRole = (session?.user as any)?.role
    const tenantId = (session?.user as any)?.tenantId

    if (!['ADMIN', 'GLOBAL_SUPER_ADMIN'].includes(userRole)) {
        redirect('/dashboard')
    }

    // If super admin is accessing this page directly (tenantId="system"), they
    // don't have a real tenant — show a helpful redirect hint instead.
    if (!tenantId || tenantId === 'system') {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center space-y-3 max-w-sm">
                    <p className="text-2xl font-black text-slate-800">No Tenant Context</p>
                    <p className="text-slate-500 text-sm">
                        You are logged in as the Global Super Admin. To manage brands, log in as a
                        tenant admin via the Super Admin dashboard.
                    </p>
                </div>
            </div>
        )
    }

    // Fetch all brands for this tenant
    const brands = await db.brand.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'asc' }
    })

    return (
        <div className="space-y-8 pb-20">
            {/* Header Section */}
            <div className="relative overflow-hidden rounded-[3rem] bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 p-8 md:p-12 text-white shadow-2xl mb-8 border border-white/5">
                <div className="absolute top-0 right-0 p-12 opacity-10 rotate-12">
                    <Building2 className="h-48 w-48" />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-end gap-8">
                    <div className="space-y-4 text-center md:text-left">
                        <div className="flex items-center gap-3 justify-center md:justify-start">
                            <Badge className="bg-primary text-white border-none px-3 py-1 text-[10px] font-black uppercase tracking-widest">Multi-Entity Management</Badge>
                            <span className="text-slate-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                                <Sparkles className="h-3 w-3 text-amber-400" /> Administrative Core
                            </span>
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-none">
                            Brands & Entities
                        </h1>
                        <p className="text-slate-400 text-lg max-w-xl font-medium leading-relaxed">
                            Manage multiple corporate identities, prefixes, and ZATCA compliance settings for your organization.
                        </p>
                    </div>
                    <BrandAddDialog tenantId={tenantId} />
                </div>
            </div>

            {/* Brand Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {brands.map((brand: any) => (
                    <div key={brand.id} className="group relative bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500 overflow-hidden flex flex-col">
                        {/* Status Bar */}
                        <div className={`h-2 w-full ${brand.isDefault ? 'bg-primary' : 'bg-slate-100'}`} />

                        <div className="p-8 flex-1 space-y-6">
                            <div className="flex justify-between items-start">
                                <div className="h-20 w-20 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden shadow-inner">
                                    {brand.logoUrl ? (
                                        <img src={brand.logoUrl} alt={brand.nameEn} className="h-full w-full object-contain p-2" />
                                    ) : (
                                        <Building2 className="h-10 w-10 text-slate-200" />
                                    )}
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <div className="flex items-center gap-2">
                                        <BrandEditDialog brand={brand} tenantId={tenantId} />
                                        <BrandDeleteDialog brandId={brand.id} name={brand.nameEn} />
                                    </div>
                                    <Badge variant="outline" className="rounded-lg font-black border-slate-200 bg-slate-50 text-slate-500">
                                        ID Prefix: {brand.abbreviation || 'N/A'}
                                    </Badge>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">{brand.nameEn}</h3>
                                <p className="text-slate-400 font-bold text-sm text-right">{brand.nameAr}</p>
                            </div>

                            <div className="space-y-3 pt-2">
                                <div className="flex items-center gap-3 text-sm text-slate-500 font-medium">
                                    <Hash className="h-4 w-4 text-slate-300" />
                                    <span>CR: {brand.crNumber || '---'}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-slate-500 font-medium">
                                    <ShieldCheck className="h-4 w-4 text-slate-300" />
                                    <span>VAT: {brand.taxNumber || '---'}</span>
                                </div>
                            </div>

                            <div className="pt-4 mt-auto border-t border-slate-50 flex items-center justify-between">
                                <SetDefaultBrandButton brandId={brand.id} tenantId={tenantId} isDefault={brand.isDefault} />
                            </div>
                        </div>
                    </div>
                ))}

                {brands.length === 0 && (
                    <div className="col-span-full py-20 text-center bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
                        <Building2 className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-xl font-black text-slate-800">No Entities Configured</h3>
                        <p className="text-slate-500 mb-8 max-w-xs mx-auto">Start by adding your first brand or branch to enable ID generation and compliance.</p>
                        <BrandAddDialog tenantId={tenantId} />
                    </div>
                )}
            </div>
        </div>
    )
}
