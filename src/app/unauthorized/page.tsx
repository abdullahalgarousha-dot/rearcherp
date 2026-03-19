"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ShieldAlert, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function UnauthorizedPage() {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <Card className="max-w-md w-full border-rose-200 shadow-xl overflow-hidden">
                <div className="h-2 w-full bg-rose-500"></div>
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto bg-rose-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                        <ShieldAlert className="h-8 w-8 text-rose-600" />
                    </div>
                    <CardTitle className="text-2xl font-black text-slate-900">Access Denied</CardTitle>
                    <CardDescription className="text-base text-slate-500 mt-2">
                        You do not have the required permissions to view this secure file or folder.
                    </CardDescription>
                </CardHeader>
                <CardContent className="text-center space-y-6 pt-4">
                    <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-600 border border-slate-100">
                        <p className="font-bold text-slate-800 mb-1">Zero-Trust Security Protocol</p>
                        This access attempt has been blocked and logged. If you believe you should have access to this document, please contact your Project Manager or System Administrator to request elevated privileges or project assignment.
                    </div>

                    <Link href="/dashboard" className="inline-block w-full">
                        <Button className="w-full bg-slate-900 text-white hover:bg-slate-800 h-12 rounded-xl">
                            <ArrowLeft className="mr-2 h-4 w-4" /> Return to Secure Dashboard
                        </Button>
                    </Link>
                </CardContent>
            </Card>
        </div>
    )
}
