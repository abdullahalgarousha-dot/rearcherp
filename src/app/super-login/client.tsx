"use client"

import { useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { loginSuperAdmin, verifyMfaAction } from "./actions"
import { ShieldAlert, ShieldCheck, Loader2 } from "lucide-react"

export default function SuperLoginClient() {
    const searchParams = useSearchParams()
    const router = useRouter()

    const [loading, setLoading] = useState(false)
    const [step, setStep] = useState<"credentials" | "mfa">("credentials")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [mfaCode, setMfaCode] = useState("")
    const [tempToken, setTempToken] = useState("")
    const [error, setError] = useState("")

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault()
        console.log("Button Clicked — handleLogin fired")
        setError("")
        setLoading(true)

        try {
            // Step 1: verify credentials via server action (handles rate-limiting
            // and the emergency bypass without hitting the DB for super@rearch.sa)
            const result = await loginSuperAdmin({ email, password })
            console.log("loginSuperAdmin result:", result)

            if (result.error) {
                setError(result.error)
                return
            }

            if (result.requiresMfa) {
                setTempToken(result.tempToken ?? "")
                setStep("mfa")
                return
            }

            // Step 2: establish the NextAuth session.
            // We use redirect: false to capture errors, then do a HARD redirect
            // via window.location.href — this forces a full page reload so the
            // browser picks up the new session cookie before navigating.
            // router.push() is intentionally avoided here: it fires before the
            // Set-Cookie response is fully applied, causing a silent no-op.
            const signInResult = await signIn("credentials", {
                email,
                password,
                redirect: false,
            })
            console.log("signIn result:", signInResult)

            if (signInResult?.error) {
                setError(`خطأ في المصادقة: ${signInResult.error}`)
                return
            }

            // Hard redirect — guarantees the new session cookie is sent with
            // the next request so the middleware lets the user through.
            window.location.href = "/super-admin/dashboard"

        } catch (err: any) {
            console.error("handleLogin caught error:", err)
            // NextAuth v5 throws AuthError on hard failures
            const msg = err?.message || String(err) || "حدث خطأ غير متوقع"
            setError(msg)
        } finally {
            setLoading(false)
        }
    }

    async function handleMfa(e: React.FormEvent) {
        e.preventDefault()
        console.log("Button Clicked — handleMfa fired")
        setError("")
        setLoading(true)

        try {
            const result = await verifyMfaAction({ tempToken, code: mfaCode })
            console.log("verifyMfaAction result:", result)

            if (result.error) {
                setError(result.error)
                return
            }

            window.location.href = "/super-admin/dashboard"

        } catch (err: any) {
            console.error("handleMfa caught error:", err)
            setError(err?.message || "فشل التحقق. حاول مرة أخرى.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
            <div className="max-w-md w-full space-y-8 bg-zinc-900 p-8 rounded-2xl border border-zinc-800">

                <div className="text-center">
                    <ShieldAlert className="mx-auto h-12 w-12 text-red-500 mb-4" />
                    <h2 className="text-3xl font-extrabold">منطقة محظورة</h2>
                    <p className="mt-2 text-zinc-400">نظام الإدارة المركزية - REArch ERP</p>
                </div>

                {/* Visible error banner — never hidden, never a toast */}
                {error && (
                    <div className="bg-red-900/50 border border-red-500 text-red-200 text-sm rounded-lg px-4 py-3">
                        {error}
                    </div>
                )}

                {step === "credentials" ? (
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-zinc-300 mb-1">
                                البريد الإلكتروني
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-red-500"
                                required
                                autoComplete="email"
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-zinc-300 mb-1">
                                كلمة المرور
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-red-500"
                                required
                                autoComplete="current-password"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors"
                        >
                            {loading
                                ? <><Loader2 className="h-4 w-4 animate-spin" /> جاري التحقق...</>
                                : "دخول"}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleMfa} className="space-y-4">
                        <div className="text-center">
                            <ShieldCheck className="mx-auto h-10 w-10 text-emerald-400 mb-2" />
                            <p className="text-zinc-300">أدخل رمز التحقق</p>
                            <p className="text-xs text-zinc-500 mt-1">الرمز الثابت للاختبار: 123456</p>
                        </div>
                        <div>
                            <label htmlFor="mfa" className="block text-sm font-medium text-zinc-300 mb-1">
                                رمز MFA
                            </label>
                            <input
                                id="mfa"
                                type="text"
                                value={mfaCode}
                                onChange={e => setMfaCode(e.target.value)}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-center tracking-widest focus:outline-none focus:border-emerald-500"
                                maxLength={6}
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors"
                        >
                            {loading
                                ? <><Loader2 className="h-4 w-4 animate-spin" /> جاري التحقق...</>
                                : "تحقق"}
                        </button>
                        <button
                            type="button"
                            onClick={() => { setStep("credentials"); setError("") }}
                            className="w-full text-zinc-500 hover:text-zinc-300 text-sm py-1"
                        >
                            ← رجوع
                        </button>
                    </form>
                )}
            </div>
        </div>
    )
}
