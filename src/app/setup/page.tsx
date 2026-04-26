"use client"

import { useState } from "react"
import { Building2, Globe, Shield, Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { completeSetup } from "./actions"

export default function SetupWizard() {
    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        companyName: "",
        zatcaVatNumber: "",
        zatcaTaxId: "",
    })
    const router = useRouter()

    const steps = [
        { id: 1, title: "Company Profile", icon: Building2 },
        { id: 2, title: "Google Drive", icon: Globe },
        { id: 3, title: "ZATCA Readiness", icon: Shield },
    ]

    async function handleCompleteSetup() {
        if (!formData.zatcaVatNumber || !formData.zatcaTaxId) {
            toast.error("Please fill in all required ZATCA fields.")
            return
        }

        setLoading(true)
        const result = await completeSetup({
            zatcaVatNumber: formData.zatcaVatNumber,
            zatcaTaxId: formData.zatcaTaxId
        })

        if (result.success) {
            toast.success("Setup completed! Welcome to TO-PO.")
            router.push("/dashboard")
            router.refresh()
        } else {
            toast.error(result.error || "Failed to complete setup")
        }
        setLoading(false)
    }

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-200">
            <div className="w-full max-w-2xl">
                {/* Stepper */}
                <div className="flex justify-between mb-12 relative">
                    <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-800 -translate-y-1/2 z-0" />
                    {steps.map((s) => {
                        const Icon = s.icon
                        const isActive = step >= s.id
                        return (
                            <div key={s.id} className="relative z-10 flex flex-col items-center gap-3">
                                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${isActive ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-900 text-slate-500 border border-slate-800'
                                    }`}>
                                    {isActive && step > s.id ? <Check className="h-6 w-6" /> : <Icon className="h-6 w-6" />}
                                </div>
                                <span className={`text-xs font-bold uppercase tracking-wider ${isActive ? 'text-emerald-400' : 'text-slate-500'}`}>
                                    {s.title}
                                </span>
                            </div>
                        )
                    })}
                </div>

                {/* Content Cards */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 backdrop-blur-xl shadow-2xl">
                    {step === 1 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div>
                                <h1 className="text-2xl font-black mb-2">Welcome! Let&apos;s personalize your space.</h1>
                                <p className="text-slate-400">Please confirm your company details for reporting and invoicing.</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2 col-span-2">
                                    <Label>Legal Company Name (English)</Label>
                                    <Input
                                        placeholder="Acme Engineering Ltd"
                                        className="bg-slate-950 border-slate-800 h-12"
                                        value={formData.companyName}
                                        onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Primary Color</Label>
                                    <div className="flex gap-2">
                                        <div className="h-10 w-10 rounded-lg bg-emerald-600 cursor-pointer border-2 border-white" />
                                        <div className="h-10 w-10 rounded-lg bg-blue-600 cursor-pointer" />
                                        <div className="h-10 w-10 rounded-lg bg-purple-600 cursor-pointer" />
                                        <div className="h-10 w-10 rounded-lg bg-red-600 cursor-pointer" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Timezone</Label>
                                    <Input value="Asia/Riyadh (GMT+3)" readOnly className="bg-slate-950 border-slate-800 h-12 cursor-not-allowed opacity-50" />
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 text-center py-8">
                            <div className="h-20 w-20 bg-blue-500/10 text-blue-400 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                <Globe className="h-10 w-10" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-black mb-2">Connect Google Drive</h1>
                                <p className="text-slate-400 max-w-md mx-auto">
                                    TO-PO uses your Google Drive to store project files, NCR photos, and financial reports in a secure, structured hierarchy.
                                </p>
                            </div>
                            <Button className="w-full h-14 bg-white text-slate-950 hover:bg-slate-200 font-bold rounded-2xl flex items-center justify-center gap-3">
                                <svg className="h-5 w-5" viewBox="0 0 24 24">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                </svg>
                                Authorize TO-PO Drive Access
                            </Button>
                            <p className="text-xs text-slate-500">
                                This creates a secure token stored only for your tenant. We never access your personal files.
                            </p>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div>
                                <h1 className="text-2xl font-black mb-2">ZATCA & Tax Configuration</h1>
                                <p className="text-slate-400">Ensure compliance with Saudi Arabia&apos;s E-Invoicing (Fatoora) requirements.</p>
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                                <div className="space-y-2">
                                    <Label>VAT Registration Number</Label>
                                    <Input
                                        placeholder="300XXXXXXXXXXXX"
                                        className="bg-slate-950 border-slate-800 h-12 font-mono"
                                        value={formData.zatcaVatNumber}
                                        onChange={(e) => setFormData({ ...formData, zatcaVatNumber: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Tax Identification Number (TIN)</Label>
                                    <Input
                                        placeholder="1234567890"
                                        className="bg-slate-950 border-slate-800 h-12 font-mono"
                                        value={formData.zatcaTaxId}
                                        onChange={(e) => setFormData({ ...formData, zatcaTaxId: e.target.value })}
                                    />
                                </div>
                                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-sm flex gap-3">
                                    <Shield className="h-5 w-5 shrink-0" />
                                    <p>Your firm will be prepared for ZATCA Phase 2 (Integration Phase) automatically with this data.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Footer Nav */}
                    <div className="flex justify-between mt-12 pt-8 border-t border-slate-800/50">
                        <Button
                            variant="ghost"
                            onClick={() => setStep(s => Math.max(1, s - 1))}
                            disabled={step === 1}
                            className="text-slate-400 hover:text-white"
                        >
                            Previous
                        </Button>
                        {step < 3 ? (
                            <Button
                                onClick={() => setStep(s => Math.min(3, s + 1))}
                                className="bg-emerald-600 hover:bg-emerald-500 px-8 rounded-xl font-bold"
                            >
                                Continue
                            </Button>
                        ) : (
                            <Button
                                onClick={handleCompleteSetup}
                                disabled={loading}
                                className="bg-emerald-600 hover:bg-emerald-500 px-8 rounded-xl font-black shadow-lg shadow-emerald-500/20"
                            >
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Finalize & Launch Platform
                            </Button>
                        )}
                    </div>
                </div>

                <div className="mt-8 text-center">
                    <p className="text-slate-600 text-xs">
                        TO-PO v1.0.0 — Licensed for your engineering firm.
                    </p>
                </div>
            </div>
        </div>
    )
}
