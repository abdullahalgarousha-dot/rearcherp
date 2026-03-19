"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { UserCircle, KeyRound, Loader2, Save } from "lucide-react"
import { submitProfileUpdate } from "@/app/actions/employee-profile"
import { toast } from "sonner"

export function ProfileInfoWidget({ user }: { user: any }) {
    const [name, setName] = useState(user?.name || "")
    const [phone, setPhone] = useState(user?.phone || "")
    const [loadingInfo, setLoadingInfo] = useState(false)

    const handleUpdateInfo = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoadingInfo(true)
        const res = await submitProfileUpdate({ name, phone })
        if (res?.success) toast.success(res.message)
        else toast.error(res?.error)
        setLoadingInfo(false)
    }

    return (
        <Card className="h-full border-white/20 shadow-sm bg-white/60 backdrop-blur-xl">
            <CardHeader className="pb-4 border-b border-slate-100">
                <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-800">
                    <UserCircle className="h-5 w-5 text-primary" />
                    إعدادات الحساب
                </CardTitle>
                <CardDescription>
                    قم بتحديث بياناتك الشخصية أو تغيير كلمة المرور.
                </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
                <form onSubmit={handleUpdateInfo} className="space-y-4">
                    <div className="space-y-2">
                        <Label>الاسم الكامل</Label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="اسمك الكامل"
                            required
                            className="bg-white/50"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>البريد الإلكتروني</Label>
                        <Input
                            value={user?.email || ""}
                            disabled
                            className="bg-slate-50 text-slate-500 cursor-not-allowed"
                            title="لا يمكن تغيير البريد الإلكتروني"
                        />
                    </div>
                    {/* Example of disabled field based on strict rules */}
                    <div className="space-y-2">
                        <Label className="text-slate-400">الرقم الوظيفي (للقراءة فقط)</Label>
                        <Input
                            value={user?.employeeCode || "N/A"}
                            disabled
                            className="bg-slate-50 text-slate-400"
                        />
                    </div>

                    <Button type="submit" disabled={loadingInfo} className="w-full sm:w-auto mt-4 rounded-xl shadow-md">
                        {loadingInfo ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Save className="ml-2 h-4 w-4" />}
                        حفظ التغييرات
                    </Button>
                </form>
            </CardContent>
        </Card>
    )
}
