import { getSystemSettings } from "@/app/actions/settings"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { LoginForm } from "./login-form"

export default async function LoginPage() {
    const settings = await getSystemSettings()
    const companyName = settings.companyNameEn || "TO-PO Engineering"
    const companyNameAr = settings.companyNameAr || ""

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900 px-4">
            <Card className="w-full max-w-md shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-primary to-indigo-600" />
                <CardHeader className="pt-8">
                    <div className="flex justify-center mb-6">
                        {settings.logoUrl ? (
                            <img src={settings.logoUrl} alt={`${companyName} Logo`} className="h-16 object-contain" />
                        ) : (
                            <div className="h-16 w-16 bg-primary rounded-xl flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-primary/20">
                                {companyName.substring(0, 2).toUpperCase()}
                            </div>
                        )}
                    </div>
                    <CardTitle className="text-2xl text-center font-black text-slate-900">{companyName} System</CardTitle>
                    {companyNameAr && <p className="text-center font-bold text-slate-500 text-sm">{companyNameAr}</p>}
                    <CardDescription className="text-center mt-2">
                        Enter your credentials to access the workspace.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <LoginForm />
                </CardContent>
                <CardFooter className="text-center text-xs text-gray-400 justify-center pb-6">
                    Powered by Core - {new Date().getFullYear()} ©
                </CardFooter>
            </Card>
        </div>
    )
}
