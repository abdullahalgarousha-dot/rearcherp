"use client"

import { Suspense } from "react"
import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ShieldAlert, ShieldCheck, Loader2 } from "lucide-react"
import { loginSuperAdmin, verifyMfaAction } from "./actions"
import { signIn } from "next-auth/react"
import { toast, Toaster } from "react-hot-toast"

// إضافة هذا السطر لحل مشكلة الـ Dynamic Rendering
export const dynamic = 'force-dynamic';

// هذا هو الجزء الذي يحتوي على منطق تسجيل الدخول الخاص بك
function SuperLoginContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const access = searchParams.get("access")

    // هنا أضفت لك بقية منطق الـ State والـ Functions التي كانت في ملفك الأصلي
    const [step, setStep] = useState<"login" | "mfa">("login")
    const [loading, setLoading] = useState(false)
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [mfaCode, setMfaCode] = useState("")

    // ... (بقية منطق الـ HandleLogin والـ HandleVerify التي كانت عندك)

    return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
            <Toaster position="top-center" />
            {/* هنا ضع كود الـ JSX (تصميم الصفحة) الذي كان موجوداً في ملفك الأصلي */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-md w-full space-y-8 bg-zinc-900 p-8 rounded-2xl border border-zinc-800">
                <h1 className="text-2xl font-bold text-center">تسجيل دخول المسؤول</h1>
                {/* ... بقية محتويات الفورم الخاصة بك ... */}
                <p className="text-center text-zinc-500">نظام الإدارة المركزية</p>
            </motion.div>
        </div>
    )
}

// هذه هي الوظيفة الرئيسية التي سيقرأها Vercel
export default function SuperLoginPage() {
    return (
        // هنا "غلاف الحماية" الذي طلبه Vercel في رسالة الخطأ
        <Suspense fallback={
            <div className="min-h-screen bg-black flex items-center justify-center text-white">
                <Loader2 className="animate-spin mr-2" /> جاري تحميل نظام الأمان...
            </div>
        }>
            <SuperLoginContent />
        </Suspense>
    )
}