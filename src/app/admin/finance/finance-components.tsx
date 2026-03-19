"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Calculator } from "lucide-react"

export function TaxCalculator({ systemVat = 15 }: { systemVat?: number }) {
    const [amount, setAmount] = useState<string>("")
    const taxRate = systemVat / 100

    const calcInclusive = (val: number) => {
        const base = val / (1 + taxRate)
        const vat = val - base
        return { base, vat, total: val }
    }

    const calcExclusive = (val: number) => {
        const vat = val * taxRate
        const total = val + vat
        return { base: val, vat, total }
    }

    const numAmount = parseFloat(amount) || 0

    return (
        <Card className="border-none shadow-xl bg-slate-900 text-white rounded-3xl overflow-hidden">
            <CardHeader className="bg-primary/20 pb-4">
                <CardTitle className="text-lg font-black flex items-center gap-2">
                    <Calculator className="text-primary" size={20} />
                    Tax Calculator | حاسبة الضريبة
                </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
                <Tabs defaultValue="exclusive" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 bg-slate-800 rounded-xl p-1 mb-4">
                        <TabsTrigger value="exclusive" className="rounded-lg font-bold data-[state=active]:bg-primary">Exclusive</TabsTrigger>
                        <TabsTrigger value="inclusive" className="rounded-lg font-bold data-[state=active]:bg-primary">Inclusive</TabsTrigger>
                    </TabsList>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase font-black text-slate-400">Enter Amount (SAR)</Label>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                className="w-full bg-slate-800 border-none rounded-xl p-4 text-2xl font-black focus:ring-2 focus:ring-primary outline-none"
                            />
                        </div>

                        <TabsContent value="exclusive" className="mt-0 space-y-3">
                            <ResultRow label="Base Amount" value={numAmount} />
                            <ResultRow label={`VAT (${systemVat}%)`} value={numAmount * taxRate} color="text-primary" />
                            <div className="pt-2 mt-2 border-t border-slate-800">
                                <ResultRow label="Total" value={numAmount * (1 + taxRate)} highlight />
                            </div>
                        </TabsContent>

                        <TabsContent value="inclusive" className="mt-0 space-y-3">
                            <ResultRow label="Base Amount" value={numAmount / (1 + taxRate)} />
                            <ResultRow label={`VAT (${systemVat}%)`} value={numAmount - (numAmount / (1 + taxRate))} color="text-primary" />
                            <div className="pt-2 mt-2 border-t border-slate-800">
                                <ResultRow label="Total" value={numAmount} highlight />
                            </div>
                        </TabsContent>
                    </div>
                </Tabs>
            </CardContent>
        </Card>
    )
}

function ResultRow({ label, value, color = "text-white", highlight = false }: { label: string, value: number, color?: string, highlight?: boolean }) {
    return (
        <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-400">{label}</span>
            <span className={`${highlight ? 'text-xl' : 'text-sm'} font-black ${color}`}>
                {value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
        </div>
    )
}

export function FinancialChart({ data }: { data: { name: string, income: number, expense: number }[] }) {
    const maxVal = Math.max(...data.flatMap(d => [d.income, d.expense])) || 1

    return (
        <div className="h-[200px] flex items-end gap-4 px-4 pb-4">
            {data.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative">
                    <div className="w-full flex justify-center gap-1 items-end h-[160px]">
                        {/* Income Bar */}
                        <div
                            className="w-1/3 bg-emerald-500 rounded-t-lg transition-all group-hover:bg-emerald-400 relative"
                            style={{ height: `${(d.income / maxVal) * 100}%` }}
                        >
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-black text-emerald-600 opacity-0 group-hover:opacity-100 whitespace-nowrap">+{d.income}</div>
                        </div>
                        {/* Expense Bar */}
                        <div
                            className="w-1/3 bg-red-500 rounded-t-lg transition-all group-hover:bg-red-400 relative"
                            style={{ height: `${(d.expense / maxVal) * 100}%` }}
                        >
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-black text-red-600 opacity-0 group-hover:opacity-100 whitespace-nowrap">-{d.expense}</div>
                        </div>
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase">{d.name}</span>
                </div>
            ))}
        </div>
    )
}
