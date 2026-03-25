"use client"

import { useState, useTransition } from "react"
import { purgeAllTenantData } from "@/app/actions/purge-tenant"
import { Trash2, AlertTriangle, Loader2 } from "lucide-react"

export function DangerZone() {
    const [confirmed, setConfirmed] = useState("")
    const [result, setResult] = useState<{ success?: boolean; error?: string } | null>(null)
    const [isPending, startTransition] = useTransition()

    const CONFIRM_PHRASE = "purge all data"

    function handlePurge() {
        if (confirmed !== CONFIRM_PHRASE) return
        startTransition(async () => {
            const res = await purgeAllTenantData()
            setResult(res)
            if (res.success) setConfirmed("")
        })
    }

    return (
        <div className="border border-red-200 rounded-2xl p-6 bg-red-50/50 space-y-4">
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-red-100 flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                    <h3 className="font-bold text-red-900">Danger Zone</h3>
                    <p className="text-sm text-red-600">Irreversible destructive operations</p>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-red-200 p-5 space-y-4">
                <div>
                    <p className="font-semibold text-slate-800">Purge All Tenant Data</p>
                    <p className="text-sm text-slate-500 mt-1">
                        Permanently deletes all Projects, Clients, Brands, Tasks, Invoices, Expenses,
                        and related records for this tenant. Users, roles, and company settings are
                        preserved. Use this to reset for a fresh lifecycle experiment.
                    </p>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                        Type <span className="font-mono text-red-600">{CONFIRM_PHRASE}</span> to confirm
                    </label>
                    <input
                        type="text"
                        value={confirmed}
                        onChange={(e) => { setConfirmed(e.target.value); setResult(null) }}
                        placeholder={CONFIRM_PHRASE}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-400 font-mono"
                    />
                </div>

                {result && (
                    <p className={`text-sm font-medium ${result.success ? "text-emerald-600" : "text-red-600"}`}>
                        {result.success ? "All tenant data purged successfully." : `Error: ${result.error}`}
                    </p>
                )}

                <button
                    onClick={handlePurge}
                    disabled={confirmed !== CONFIRM_PHRASE || isPending}
                    className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                    {isPending
                        ? <><Loader2 className="h-4 w-4 animate-spin" /> Purging...</>
                        : <><Trash2 className="h-4 w-4" /> Purge All Tenant Data</>
                    }
                </button>
            </div>
        </div>
    )
}
