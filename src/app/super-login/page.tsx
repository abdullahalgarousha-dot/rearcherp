export const dynamic = 'force-dynamic';

import { Suspense } from "react"
import { Loader2 } from "lucide-react"
import SuperLoginClient from "./client"

export default function SuperLoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
                <Loader2 className="h-8 w-8 animate-spin text-red-500 mb-4" />
                <p>جاري تشغيل بروتوكولات الأمان...</p>
            </div>
        }>
            <SuperLoginClient />
        </Suspense>
    )
}
