'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createProject } from "./actions"

interface ProjectFormProps {
    brands: any[]
    engineers: any[]
    initialData?: any
    systemVat?: number
    projectTypes?: any[]
    disciplines?: any[]
    branches?: any[]
    clients?: any[]
}

export function ProjectForm({ brands, engineers, initialData, systemVat = 15, projectTypes = [], disciplines = [], clients = [] }: ProjectFormProps) {
    const router = useRouter()
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [selectedBrand, setSelectedBrand] = useState(initialData?.brandId || '')
    const [selectedBranch, setSelectedBranch] = useState(initialData?.branchId || '')
    const [projectType, setProjectType] = useState(initialData?.type || initialData?.serviceType || 'DESIGN')
    const [contractValue, setContractValue] = useState(initialData?.contractValue?.toString() || '')

    // Client State + Auto-fill
    // legacyClientName is mapped to "client" in the new update response, or just initialData.legacyClientName
    const [clientName, setClientName] = useState(initialData?.legacyClientName || initialData?.client || '')
    const [clientVat, setClientVat] = useState(initialData?.legacyClientVat || initialData?.clientVat || '')
    const [clientAddr, setClientAddr] = useState(initialData?.legacyClientAddr || initialData?.clientAddress || '')
    const [clientBio, setClientBio] = useState(initialData?.legacyClientBio || initialData?.clientBio || '')

    const handleClientNameChange = (val: string) => {
        setClientName(val)
        const match = clients.find(c => c.name.toLowerCase() === val.toLowerCase())
        if (match) {
            if (match.taxNumber) setClientVat(match.taxNumber)
            if (match.address) setClientAddr(match.address)
        }
    }

    // Financial State
    const [designValue, setDesignValue] = useState(initialData?.designValue?.toString() || '')
    const [supervisionType, setSupervisionType] = useState(initialData?.supervisionPaymentType || 'MONTHLY')
    const [supervisionMonthlyValue, setSupervisionMonthlyValue] = useState(initialData?.supervisionMonthlyValue?.toString() || '')
    const [supervisionDuration, setSupervisionDuration] = useState(initialData?.supervisionDuration?.toString() || initialData?.contractDuration?.toString() || '')
    const [supervisionPackageValue, setSupervisionPackageValue] = useState(initialData?.supervisionPackageValue?.toString() || '')

    const totalContractValue = useMemo(() => {
        let total = 0
        if (projectType === 'DESIGN' || projectType === 'BOTH') {
            total += parseFloat(designValue) || 0
        }
        if (projectType === 'SUPERVISION' || projectType === 'BOTH') {
            if (supervisionType === 'MONTHLY') {
                const monthly = parseFloat(supervisionMonthlyValue) || 0
                const dur = parseInt(supervisionDuration) || 0
                total += monthly * dur
            } else {
                total += parseFloat(supervisionPackageValue) || 0
            }
        }
        return total
    }, [projectType, designValue, supervisionType, supervisionMonthlyValue, supervisionDuration, supervisionPackageValue])

    // Parse engineerIds safely
    const initialEngineers = initialData?.engineers?.map((u: any) => u.id) || []
    const [selectedEngineers, setSelectedEngineers] = useState<string[]>(initialEngineers)

    const [leadEngineerId, setLeadEngineerId] = useState(initialData?.leadEngineerId || '')

    // Parse disciplines safely
    let initialDisciplines = []
    try {
        initialDisciplines = JSON.parse(initialData?.disciplines || "[]")
    } catch (e) {
        initialDisciplines = []
    }
    const [selectedDisciplines, setSelectedDisciplines] = useState<string[]>(initialDisciplines)

    const toggleEngineer = (id: string) => {
        setSelectedEngineers(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        )
    }

    const toggleDiscipline = (name: string) => {
        setSelectedDisciplines(prev =>
            prev.includes(name) ? prev.filter(x => x !== name) : [...prev, name]
        )
    }

    const vatAmountValue = useMemo(() => {
        return totalContractValue * (systemVat / 100)
    }, [totalContractValue, systemVat])

    async function onSubmit(formData: FormData) {
        setLoading(true)
        setError('')

        formData.set('brandId', selectedBrand)
        if (selectedBranch) formData.set('branchId', selectedBranch)
        formData.set('type', projectType)
        formData.set('engineerIds', JSON.stringify(selectedEngineers))
        formData.set('leadEngineerId', leadEngineerId)
        formData.set('disciplines', JSON.stringify(selectedDisciplines))
        formData.set('vatAmount', vatAmountValue.toString())

        let res;
        if (initialData) {
            const { updateProject } = await import("./actions")
            res = await updateProject(initialData.id, formData)
        } else {
            res = await createProject(formData)
        }

        if (res?.error) {
            setError(res.error)
            setLoading(false)
        } else {
            router.push('/admin/projects')
            router.refresh()
        }
    }

    return (
        <Card className="border-none shadow-xl bg-white/60 backdrop-blur-xl">
            <CardContent className="pt-6">
                <form action={onSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="font-bold">Project Name *</Label>
                            <Input id="name" name="name" defaultValue={initialData?.name} required className="rounded-xl border-primary/10 focus:border-primary" />
                        </div>

                        <div className="space-y-2">
                            <Label className="font-bold">Brand *</Label>
                            <Select onValueChange={setSelectedBrand} defaultValue={selectedBrand} required disabled={!!initialData}>
                                <SelectTrigger className="rounded-xl">
                                    <SelectValue placeholder="Select Brand" />
                                </SelectTrigger>
                                <SelectContent>
                                    {brands.map(b => (
                                        <SelectItem key={b.id} value={b.id}>{b.nameEn}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="font-bold">Project Type *</Label>
                            <Select onValueChange={setProjectType} defaultValue={projectType} required>
                                <SelectTrigger className="rounded-xl">
                                    <SelectValue placeholder="Select Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {projectTypes.length > 0 ? projectTypes.map(pt => (
                                        <SelectItem key={pt.value} value={pt.value}>{pt.labelEn}</SelectItem>
                                    )) : (
                                        <>
                                            <SelectItem value="DESIGN">Design Project</SelectItem>
                                            <SelectItem value="SUPERVISION">Supervision Project</SelectItem>
                                            <SelectItem value="BOTH">تصميم وإشراف (Design & Supervision)</SelectItem>
                                        </>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2 relative">
                            <Label htmlFor="client" className="font-bold">Client Name *</Label>
                            <Input
                                id="client"
                                name="client"
                                value={clientName}
                                onChange={e => handleClientNameChange(e.target.value)}
                                required
                                list="clients-list"
                                className="rounded-xl border-primary/10"
                                placeholder="Type to search or create new..."
                            />
                            <datalist id="clients-list">
                                {clients.map(c => (
                                    <option key={c.id} value={c.name} />
                                ))}
                            </datalist>
                            <p className="text-[10px] text-muted-foreground italic">Type a new name to automatically create a new client record.</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="clientVat" className="font-bold">Client VAT Number (ZATCA)</Label>
                            <Input
                                id="clientVat"
                                name="clientVat"
                                value={clientVat}
                                onChange={e => setClientVat(e.target.value)}
                                className="rounded-xl border-primary/10"
                            />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="clientAddress" className="font-bold">Client Office Address</Label>
                            <Input
                                id="clientAddress"
                                name="clientAddress"
                                value={clientAddr}
                                onChange={e => setClientAddr(e.target.value)}
                                className="rounded-xl border-primary/10"
                            />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="clientBio" className="font-bold">Client Bio / Notes</Label>
                            <Textarea
                                id="clientBio"
                                name="clientBio"
                                value={clientBio}
                                onChange={e => setClientBio(e.target.value)}
                                placeholder="Internal notes about the client..."
                                className="rounded-xl min-h-[40px]"
                            />
                        </div>
                    </div>

                    <div className="space-y-6 pt-6 border-t border-primary/5">
                        <h3 className="font-bold text-lg text-primary">Financial Details</h3>

                        {/* Design Value */}
                        {(projectType === 'DESIGN' || projectType === 'BOTH') && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <div className="space-y-2">
                                    <Label htmlFor="designValue" className="font-bold">Design Contract Value (SAR)</Label>
                                    <Input
                                        id="designValue"
                                        name="designValue"
                                        type="number"
                                        step="0.01"
                                        value={designValue}
                                        onChange={(e) => setDesignValue(e.target.value)}
                                        className="rounded-xl font-mono bg-white"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Supervision Value */}
                        {(projectType === 'SUPERVISION' || projectType === 'BOTH') && (
                            <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <div className="space-y-2">
                                    <Label className="font-bold">Supervision Payment Type</Label>
                                    <div className="flex gap-4">
                                        <div className="flex items-center space-x-2">
                                            <input
                                                type="radio"
                                                id="monthly"
                                                name="paymentType"
                                                value="MONTHLY"
                                                checked={supervisionType === 'MONTHLY'}
                                                onChange={() => setSupervisionType('MONTHLY')}
                                                className="w-4 h-4 text-primary"
                                            />
                                            <Label htmlFor="monthly">Monthly</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <input
                                                type="radio"
                                                id="package"
                                                name="paymentType"
                                                value="PACKAGE"
                                                checked={supervisionType === 'PACKAGE'}
                                                onChange={() => setSupervisionType('PACKAGE')}
                                                className="w-4 h-4 text-primary"
                                            />
                                            <Label htmlFor="package">Full Package</Label>
                                        </div>
                                    </div>
                                    <input type="hidden" name="supervisionPaymentType" value={supervisionType} />
                                </div>

                                {supervisionType === 'MONTHLY' ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label htmlFor="supervisionMonthlyValue" className="font-bold">Monthly Value (SAR)</Label>
                                            <Input
                                                id="supervisionMonthlyValue"
                                                name="supervisionMonthlyValue"
                                                type="number"
                                                step="0.01"
                                                value={supervisionMonthlyValue}
                                                onChange={(e) => setSupervisionMonthlyValue(e.target.value)}
                                                className="rounded-xl font-mono bg-white"
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="supervisionDuration" className="font-bold">Duration (Months)</Label>
                                            <Input
                                                id="supervisionDuration"
                                                name="supervisionDuration"
                                                type="number"
                                                value={supervisionDuration}
                                                onChange={(e) => setSupervisionDuration(e.target.value)}
                                                className="rounded-xl font-mono bg-white"
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label htmlFor="supervisionPackageValue" className="font-bold">Total Package Value (SAR)</Label>
                                            <Input
                                                id="supervisionPackageValue"
                                                name="supervisionPackageValue"
                                                type="number"
                                                step="0.01"
                                                value={supervisionPackageValue}
                                                onChange={(e) => setSupervisionPackageValue(e.target.value)}
                                                className="rounded-xl font-mono bg-white"
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-200">
                            <div className="space-y-2">
                                <Label className="font-bold text-lg">Grand Total Contract Value</Label>
                                <div className="text-2xl font-black font-mono text-primary tracking-tight">
                                    {totalContractValue.toLocaleString()} SAR
                                </div>
                                <input type="hidden" name="contractValue" value={totalContractValue} />
                            </div>
                            <div className="space-y-2">
                                <Label className="font-bold text-amber-600">VAT ({systemVat}%)</Label>
                                <div className="text-xl font-bold font-mono text-amber-700">
                                    {vatAmountValue.toLocaleString()} SAR
                                </div>
                                <input type="hidden" name="vatAmount" value={vatAmountValue} />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-primary/5">
                        <h3 className="font-bold text-lg text-primary">Engineering Team</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="font-bold">Lead Engineer</Label>
                                <Select onValueChange={setLeadEngineerId} defaultValue={leadEngineerId}>
                                    <SelectTrigger className="rounded-xl">
                                        <SelectValue placeholder="Select Lead" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {engineers.map(u => (
                                            <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="font-bold">Participating Engineers</Label>
                                <div className="flex flex-wrap gap-2 border p-3 rounded-xl bg-white/40">
                                    {engineers.map(u => (
                                        <Button
                                            key={u.id}
                                            type="button"
                                            variant={selectedEngineers.includes(u.id) ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => toggleEngineer(u.id)}
                                            className="rounded-lg h-8 text-xs"
                                        >
                                            {u.name}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="font-bold">Disciplines / Specialties</Label>
                        <div className="flex flex-wrap gap-2 border p-3 rounded-xl bg-white/40">
                            {disciplines.length > 0 ? disciplines.map(d => (
                                <Button
                                    key={d.value}
                                    type="button"
                                    variant={selectedDisciplines.includes(d.value) ? "secondary" : "outline"}
                                    size="sm"
                                    onClick={() => toggleDiscipline(d.value)}
                                    className={`rounded-lg h-8 text-xs ${selectedDisciplines.includes(d.value) ? 'bg-emerald-500 text-white hover:bg-emerald-600' : ''}`}
                                >
                                    {d.labelEn}
                                </Button>
                            )) : (
                                <div className="text-xs text-slate-400 p-2">No disciplines configured in system settings.</div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-sm font-medium opacity-70 italic">Project Code Preview</Label>
                        <div className="text-xl font-mono text-primary/40">
                            {selectedBrand ? `${brands.find(b => b.id === selectedBrand)?.shortName || 'XXX'}-2026-001` : 'Select a brand...'}
                        </div>
                    </div>

                    {error && <p className="text-red-500 font-medium bg-red-50 p-3 rounded-xl">{error}</p>}

                    <div className="flex justify-end gap-3 pt-6">
                        <Button type="button" variant="outline" onClick={() => router.back()} className="rounded-xl px-8">Cancel</Button>
                        <Button type="submit" disabled={loading || !selectedBrand} className="rounded-xl px-12 shadow-lg shadow-primary/20">
                            {loading ? 'Creating Project...' : 'Finalize & Create'}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    )
}
