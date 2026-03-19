"use client"

import { Suspense, useState, useEffect } from "react" // أضفنا Suspense هنا
import { useSearchParams, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ShieldAlert, ShieldCheck, Loader2 } from "lucide-react"
import { loginSuperAdmin, verifyMfaAction } from "./actions"
import { signIn } from "next-auth/react"
import { toast, Toaster } from "react-hot-toast"

// 1. هذا السطر يحل مشكلة الـ Dynamic Rendering التي ظهرت في Vercel
export const dynamic = 'force-dynamic';

// 2. قمنا بنقل منطق الصفحة إلى هذا المكون الداخلي
function SuperLoginContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const access = searchParams.get("access")

    // هنا تضع بقية الـ States والـ Functions الخاصة بك (مثل handleLogin وغيره)
    // سأضع لك هيكلاً بسيطاً للتوضيح:
    const [loading, setLoading] = useState(false)

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

                {/* كود الفورم الخاص بك يستمر هنا... */}

            </motion.div>
        </div>
    )
}

// 3. هذه هي الوظيفة الأساسية التي سيقرأها Vercel (مغلفة بـ Suspense)
export default function SuperLoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
                <Loader2 className="h-8 w-8 animate-spin text-red-500 mb-4" />
                <p>جاري تشغيل بروتوكولات الأمان...</p>
            </div>
        }>
            <SuperLoginContent />
        </Suspense>
    )
}