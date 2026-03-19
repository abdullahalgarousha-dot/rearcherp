"use client"

import { useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ShieldAlert, ShieldCheck, Loader2 } from "lucide-react"
import { loginSuperAdmin, verifyMfaAction } from "./actions"
import { signIn } from "next-auth/react"
import { toast, Toaster } from "react-hot-toast"

export default function SuperLoginClient() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const access = searchParams.get("access")

    const [loading, setLoading] = useState(false)
    const [step, setStep] = useState<"credentials" | "mfa">("credentials")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [mfaCode, setMfaCode] = useState("")
    const [tempToken, setTempToken] = useState("")

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        try {
            const result = await loginSuperAdmin({ email, password })
            if (result.requiresMfa) {
                setTempToken(result.tempToken ?? "")
                setStep("mfa")
            } else if (result.success) {
                await signIn("credentials", { email, password, redirect: false })
                router.push("/super-admin/dashboard")
            } else {
                toast.error(result.error ?? "فشل تسجيل الدخول")
            }
        } catch {
            toast.error("حدث خطأ غير متوقع")
        } finally {
            setLoading(false)
        }
    }

    async function handleMfa(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        try {
            const result = await verifyMfaAction({ tempToken, code: mfaCode })
            if (result.success) {
                router.push("/super-admin/dashboard")
            } else {
                toast.error(result.error ?? "رمز خاطئ")
            }
        } catch {
            toast.error("حدث خطأ غير متوقع")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
            <Toaster position="top-center" />
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md w-full space-y-8 bg-zinc-900 p-8 rounded-2xl border border-zinc-800"
            >
                <div className="text-center">
                    <ShieldAlert className="mx-auto h-12 w-12 text-red-500 mb-4" />
                    <h2 className="text-3xl font-extrabold">منطقة محظورة</h2>
                    <p className="mt-2 text-zinc-400">نظام الإدارة المركزية - REArch ERP</p>
                </div>

                {step === "credentials" ? (
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <Label htmlFor="email">البريد الإلكتروني</Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="mt-1 bg-zinc-800 border-zinc-700"
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor="password">كلمة المرور</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="mt-1 bg-zinc-800 border-zinc-700"
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full bg-red-600 hover:bg-red-700" disabled={loading}>
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "دخول"}
                        </Button>
                    </form>
                ) : (
                    <form onSubmit={handleMfa} className="space-y-4">
                        <div className="text-center">
                            <ShieldCheck className="mx-auto h-10 w-10 text-emerald-400 mb-2" />
                            <p className="text-zinc-300">أدخل رمز التحقق</p>
                        </div>
                        <div>
                            <Label htmlFor="mfa">رمز MFA</Label>
                            <Input
                                id="mfa"
                                type="text"
                                value={mfaCode}
                                onChange={e => setMfaCode(e.target.value)}
                                className="mt-1 bg-zinc-800 border-zinc-700 text-center tracking-widest"
                                maxLength={6}
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={loading}>
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "تحقق"}
                        </Button>
                    </form>
                )}
            </motion.div>
        </div>
    )
}
