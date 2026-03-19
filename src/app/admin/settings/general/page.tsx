import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { checkPermission } from "@/lib/rbac"
import { getSystemSettings, getSystemLookups } from "@/app/actions/settings"
import { getBranches } from "@/app/actions/branches"
import { SettingsClient } from "./settings-client"
import { BackButton } from "@/components/ui/back-button"

export default async function MasterSettingsPage() {
    const session = await auth()
    const canManageSettings = await checkPermission('SETTINGS', 'write')
    if (!canManageSettings) {
        redirect('/')
    }

    // Fetch master config and lookups server-side
    const settings = await getSystemSettings()

    const lookups = await getSystemLookups(undefined, true)
    const branches = await getBranches()

    return (
        <div className="space-y-8 max-w-5xl mx-auto pb-20">
            <div className="flex items-center gap-4">
                <BackButton />
                <div>
                    <h1 className="text-4xl font-black tracking-tight text-slate-900">
                        General Settings
                    </h1>
                    <p className="text-slate-500 font-medium tracking-wide">
                        Master configuration and white-label preferences
                    </p>
                </div>
            </div>

            <SettingsClient initialSettings={settings} lookups={lookups} branches={branches} />
        </div>
    )
}
