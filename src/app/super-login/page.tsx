"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ShieldAlert, ShieldCheck, Loader2 } from "lucide-react"
import { loginSuperAdmin, verifyMfaAction } from "./actions"
import { signIn } from "next-auth/react"
import toast, { Toaster } from "react-hot-toast"

export default function SuperLoginPage() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const access = searchParams.get("access")

    const [step, setStep] = useState<"LOGIN" | "MFA">("LOGIN")
    const [loading, setLoading] = useState(false)
    const [userId, setUserId] = useState("")
    const [mounted, setMounted] = useState(false)
    const [credentials, setCredentials] = useState({ email: "", password: "" })

    useEffect(() => {
        setMounted(true)
    }, [])

    // Security: Only render if access param is correct
    if (access !== "secure") {
        return (
            <div className="flex h-screen items-center justify-center bg-black text-white p-4 text-center">
                <div className="max-w-md space-y-4">
                    <ShieldAlert className="w-16 h-16 text-red-500 mx-auto" />
                    <h1 className="text-3xl font-black tracking-tighter">UNAUTHORIZED ACCESS</h1>
                    <p className="text-zinc-500">Security event logged. Your IP has been flagged for review.</p>
                </div>
            </div>
        )
    }

    async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        const formData = new FormData(e.currentTarget)
        formData.append("access", "secure")

        const res = await loginSuperAdmin(formData)
        setLoading(false)

        if (res.error) {
            toast.error(res.error)
        } else if (res.success && res.needsMfa) {
            setCredentials({
                email: formData.get("email") as string,
                password: formData.get("password") as string
            })
            setUserId(res.userId!)
            setStep("MFA")
            toast.success("Primary authentication successful. Enter MFA code.")
        }
    }

    async function handleMfa(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        const formData = new FormData(e.currentTarget)
        const code = formData.get("mfaCode") as string

        const res = await verifyMfaAction(userId, code)

        if (res.error) {
            setLoading(false)
            toast.error(res.error)
        } else {
            // Success! Now perform actual signIn via next-auth
            toast.success("MFA Verified. Establishing secure session...")

            // Forcing a full page redirect via callbackUrl is more reliable for session switches
            await signIn("credentials", {
                email: credentials.email,
                password: credentials.password,
                callbackUrl: "/super-admin/dashboard",
                redirect: true
            })
        }
    }

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-6 selection:bg-primary selection:text-black">
            <Toaster position="top-center" reverseOrder={false} />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-sm"
            >
                <div className="mb-12 text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full border border-zinc-800 mb-6">
                        <ShieldCheck className="w-6 h-6 text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-white">REARCH <span className="text-zinc-500">COMMAND</span></h1>
                    <p className="text-sm text-zinc-500 mt-2 font-medium">SUPER ADMIN ACCESS TERMINAL</p>
                </div>

                <AnimatePresence mode="wait">
                    {step === "LOGIN" ? (
                        <motion.form
                            key="login-form"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            onSubmit={handleLogin}
                            className="space-y-4"
                        >
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-zinc-400 text-xs uppercase tracking-widest font-bold">Terminal Identity</Label>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoFocus
                                    required
                                    className="bg-zinc-900/50 border-zinc-800 text-white h-12 focus-visible:ring-primary focus-visible:ring-offset-0 focus-visible:border-primary placeholder:text-zinc-700"
                                    placeholder="admin@rearch.sa"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-zinc-400 text-xs uppercase tracking-widest font-bold">Access Token</Label>
                                <Input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    className="bg-zinc-900/50 border-zinc-800 text-white h-12 focus-visible:ring-primary focus-visible:ring-offset-0 focus-visible:border-primary placeholder:text-zinc-700"
                                    placeholder="••••••••"
                                />
                            </div>
                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full h-12 bg-white text-black hover:bg-zinc-200 transition-colors font-bold text-sm tracking-wide"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "INITIATE SEQUENCE"}
                            </Button>
                        </motion.form>
                    ) : (
                        <motion.form
                            key="mfa-form"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            onSubmit={handleMfa}
                            className="space-y-4"
                        >
                            <div className="space-y-2 text-center mb-6">
                                <p className="text-xs text-zinc-400 uppercase tracking-widest font-bold">MFA Verification Required</p>
                                <p className="text-sm text-zinc-500">Code generated for identity verification.</p>
                            </div>
                            <div className="flex justify-center mb-6">
                                <Input
                                    name="mfaCode"
                                    type="text"
                                    maxLength={6}
                                    autoFocus
                                    className="w-48 text-center text-3xl font-black tracking-[0.5em] bg-zinc-900 border-zinc-800 h-16 text-white"
                                    placeholder="000000"
                                />
                            </div>
                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full h-12 bg-primary text-black hover:bg-primary/90 transition-colors font-bold text-sm tracking-wide"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "AUTHORIZE ACCESS"}
                            </Button>
                            <button
                                type="button"
                                onClick={() => setStep("LOGIN")}
                                className="w-full text-xs text-zinc-600 hover:text-zinc-400 mt-4 underline underline-offset-4"
                            >
                                Re-initiate sequence
                            </button>
                        </motion.form>
                    )}
                </AnimatePresence>

                <div className="mt-24 pt-8 border-t border-zinc-900 space-y-4 text-center">
                    <p className="text-[10px] text-zinc-700 uppercase tracking-widest leading-relaxed">
                        Secure Environment: Unauthorized probe will trigger automated containment.
                    </p>
                    <div className="flex items-center justify-center gap-4 text-zinc-800 text-xs font-mono uppercase">
                        {mounted && (
                            <>
                                <span>L: {access === "secure" ? "AUTH_READY" : "DENIED"}</span>
                                <span>•</span>
                                <span>T: {new Date().toISOString().split('T')[1].split('.')[0]}</span>
                            </>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
