"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Trash2 } from "lucide-react"
import {
    updateSystemSettings,
    upsertSystemLookup,
    toggleSystemLookup,
    deleteSystemLookup,
    testDriveConnection
} from "@/app/actions/settings"
import { generateAllMissingDriveFolders } from "@/app/admin/projects/actions"
import { BranchesTab } from "./branches-tab"

interface LookupItem {
    id: string
    category: string
    value: string
    labelAr: string
    labelEn: string
    isActive: boolean
}

export function SettingsClient({ initialSettings, lookups, branches }: { initialSettings: any, lookups: LookupItem[], branches: any[] }) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
    const [testMessage, setTestMessage] = useState('')
    const [selectedCategory, setSelectedCategory] = useState("PROJECT_TYPE")
    const [isGeneratingAll, setIsGeneratingAll] = useState(false)

    const filteredLookups = lookups.filter(l => l.category === selectedCategory)

    async function handleSettingsSubmit(formData: FormData) {
        setLoading(true)
        await updateSystemSettings(formData)
        setLoading(false)
        router.refresh()
    }

    async function handleLookupSubmit(formData: FormData) {
        setLoading(true)
        formData.set("category", selectedCategory)
        await upsertSystemLookup(formData)
        setLoading(false)
        // Reset form inputs after submitting
        const form = document.getElementById("lookup-form") as HTMLFormElement
        if (form) form.reset()
        router.refresh()
    }

    async function handleToggleLookup(id: string, currentStatus: boolean) {
        await toggleSystemLookup(id, currentStatus)
        router.refresh()
    }

    async function handleDeleteLookup(id: string, label: string) {
        if (!confirm(`Delete "${label}"? This cannot be undone.`)) return
        await deleteSystemLookup(id)
        router.refresh()
    }

    async function handleTestConnection() {
        setTestStatus('testing')
        setTestMessage('Testing connection...')
        const result = await testDriveConnection()
        if (result.success) {
            setTestStatus('success')
            setTestMessage(result.message || 'Connected successfully!')
        } else {
            setTestStatus('error')
            setTestMessage(result.message || 'Connection failed')
        }
    }

    async function handleGenerateAllFolders() {
        if (!confirm("Are you sure you want to generate Drive folders for ALL missing projects? This could take a while based on the number of projects.")) return;

        setIsGeneratingAll(true)
        const res = await generateAllMissingDriveFolders()
        if (res.error) {
            alert("Error: " + res.error)
        } else {
            alert(`Success! Generated Drive folders for ${res.count} projects.${res.errors?.length ? '\\nSome errors occurred: ' + res.errors.join(', ') : ''}`)
            router.refresh()
        }
        setIsGeneratingAll(false)
    }

    return (
        <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="bg-slate-100 p-1 rounded-xl">
                <TabsTrigger value="profile" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Company Profile</TabsTrigger>
                <TabsTrigger value="financial" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Financial Rules</TabsTrigger>
                <TabsTrigger value="cloud" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Cloud Storage</TabsTrigger>
                <TabsTrigger value="branches" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Branches & Currencies</TabsTrigger>
                <TabsTrigger value="work" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Work Settings</TabsTrigger>
                <TabsTrigger value="lookups" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">System Lookups</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-6">
                <Card className="border-none shadow-xl rounded-3xl">
                    <CardHeader>
                        <CardTitle>Company Profile | ملف الشركة</CardTitle>
                        <CardDescription>Brand identity and contact information.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form action={handleSettingsSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label>Company Name (English)</Label>
                                    <Input name="companyNameEn" defaultValue={initialSettings?.companyNameEn || ""} className="rounded-xl" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Company Name (Arabic)</Label>
                                    <Input name="companyNameAr" defaultValue={initialSettings?.companyNameAr || ""} className="rounded-xl text-right" dir="rtl" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Contact Email</Label>
                                    <Input name="contactEmail" defaultValue={initialSettings?.contactEmail || ""} className="rounded-xl" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Contact Phone</Label>
                                    <Input name="contactPhone" defaultValue={initialSettings?.contactPhone || ""} className="rounded-xl" />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label>Office Address</Label>
                                    <Input name="address" defaultValue={initialSettings?.address || ""} className="rounded-xl" />
                                </div>
                            </div>

                            {/* Hidden fields to preserve other settings when updating this tab */}
                            <input type="hidden" name="vatPercentage" value={initialSettings?.vatPercentage || ""} />
                            <input type="hidden" name="defaultCurrency" value={initialSettings?.defaultCurrency || ""} />
                            <input type="hidden" name="taxNumber" value={initialSettings?.taxNumber || ""} />
                            <input type="hidden" name="driveClientId" value={initialSettings?.driveClientId || ""} />
                            <input type="hidden" name="driveClientSecret" value={initialSettings?.driveClientSecret || ""} />
                            <input type="hidden" name="driveRefreshToken" value={initialSettings?.driveRefreshToken || ""} />
                            <input type="hidden" name="driveFolderId" value={initialSettings?.driveFolderId || ""} />
                            <input type="hidden" name="workingHoursPerDay" value={initialSettings?.workingHoursPerDay || ""} />
                            <input type="hidden" name="workingDaysPerWeek" value={initialSettings?.workingDaysPerWeek || ""} />
                            <input type="hidden" name="weekendDays" value={initialSettings?.weekendDays || ""} />

                            <div className="flex justify-end">
                                <Button type="submit" disabled={loading} className="rounded-xl bg-primary px-8">
                                    {loading ? 'Saving...' : 'Save Profile'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="financial" className="space-y-6">
                <Card className="border-none shadow-xl rounded-3xl">
                    <CardHeader>
                        <CardTitle>Financial Rules | القواعد المالية</CardTitle>
                        <CardDescription>Configure VAT percentages and default currency for the system.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form action={handleSettingsSubmit} className="space-y-6 max-w-lg">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Corporate Tax / VAT Number</Label>
                                    <Input name="taxNumber" defaultValue={initialSettings?.taxNumber || ""} className="rounded-xl font-mono" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Standard VAT Percentage (%)</Label>
                                    <Input name="vatPercentage" type="number" step="0.1" defaultValue={initialSettings?.vatPercentage || ""} className="rounded-xl font-mono" />
                                    <p className="text-xs text-slate-400">Used dynamically across all invoice generations and financial reports.</p>
                                </div>
                                <div className="space-y-2">
                                    <Label>Default Currency</Label>
                                    <Select name="defaultCurrency" defaultValue={initialSettings?.defaultCurrency || 'SAR'}>
                                        <SelectTrigger className="rounded-xl">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="SAR">Saudi Riyal (SAR)</SelectItem>
                                            <SelectItem value="AED">UAE Dirham (AED)</SelectItem>
                                            <SelectItem value="USD">US Dollar (USD)</SelectItem>
                                            <SelectItem value="EGP">Egyptian Pound (EGP)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Hidden fields to preserve Profile settings */}
                            <input type="hidden" name="companyNameEn" value={initialSettings?.companyNameEn || ""} />
                            <input type="hidden" name="companyNameAr" value={initialSettings?.companyNameAr || ""} />
                            <input type="hidden" name="contactEmail" value={initialSettings?.contactEmail || ""} />
                            <input type="hidden" name="contactPhone" value={initialSettings?.contactPhone || ""} />
                            <input type="hidden" name="address" value={initialSettings?.address || ""} />
                            <input type="hidden" name="driveClientId" value={initialSettings?.driveClientId || ""} />
                            <input type="hidden" name="driveClientSecret" value={initialSettings?.driveClientSecret || ""} />
                            <input type="hidden" name="driveRefreshToken" value={initialSettings?.driveRefreshToken || ""} />
                            <input type="hidden" name="driveFolderId" value={initialSettings?.driveFolderId || ""} />
                            <input type="hidden" name="workingHoursPerDay" value={initialSettings?.workingHoursPerDay || ""} />
                            <input type="hidden" name="workingDaysPerWeek" value={initialSettings?.workingDaysPerWeek || ""} />
                            <input type="hidden" name="weekendDays" value={initialSettings?.weekendDays || ""} />

                            <Button type="submit" disabled={loading} className="rounded-xl bg-primary px-8">
                                {loading ? 'Saving...' : 'Save Financial Rules'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="cloud" className="space-y-6">
                <Card className="border-none shadow-xl rounded-3xl">
                    <CardHeader>
                        <CardTitle>Cloud Storage (Google Drive) | التخزين السحابي</CardTitle>
                        <CardDescription>Configure the OAuth2 credentials for automated file indexing.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form action={handleSettingsSubmit} className="space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>OAuth2 Client ID</Label>
                                    <Input name="driveClientId" defaultValue={initialSettings?.driveClientId || ""} placeholder="1066174...apps.googleusercontent.com" className="rounded-xl font-mono" />
                                </div>
                                <div className="space-y-2">
                                    <Label>OAuth2 Client Secret</Label>
                                    <Input name="driveClientSecret" type="password" defaultValue={initialSettings?.driveClientSecret || ""} placeholder="GOCSPX-..." className="rounded-xl font-mono" />
                                </div>
                                <div className="space-y-2">
                                    <Label>OAuth2 Refresh Token</Label>
                                    <Input name="driveRefreshToken" type="password" defaultValue={initialSettings?.driveRefreshToken || ""} placeholder="1//04..." className="rounded-xl font-mono" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Root Folder ID</Label>
                                    <Input name="driveFolderId" defaultValue={initialSettings?.driveFolderId || ""} placeholder="1RNZA6..." className="rounded-xl font-mono" />
                                </div>
                            </div>

                            {/* Hidden fields to preserve other settings */}
                            <input type="hidden" name="companyNameEn" value={initialSettings?.companyNameEn || ""} />
                            <input type="hidden" name="companyNameAr" value={initialSettings?.companyNameAr || ""} />
                            <input type="hidden" name="contactEmail" value={initialSettings?.contactEmail || ""} />
                            <input type="hidden" name="contactPhone" value={initialSettings?.contactPhone || ""} />
                            <input type="hidden" name="address" value={initialSettings?.address || ""} />
                            <input type="hidden" name="vatPercentage" value={initialSettings?.vatPercentage || ""} />
                            <input type="hidden" name="defaultCurrency" value={initialSettings?.defaultCurrency || ""} />
                            <input type="hidden" name="taxNumber" value={initialSettings?.taxNumber || ""} />
                            <input type="hidden" name="workingHoursPerDay" value={initialSettings?.workingHoursPerDay || ""} />
                            <input type="hidden" name="workingDaysPerWeek" value={initialSettings?.workingDaysPerWeek || ""} />
                            <input type="hidden" name="weekendDays" value={initialSettings?.weekendDays || ""} />

                            <div className="flex items-center gap-4">
                                <Button type="submit" disabled={loading || isGeneratingAll} className="rounded-xl bg-primary px-8">
                                    {loading ? 'Saving...' : 'Save Cloud Settings'}
                                </Button>
                                <Button type="button" variant="outline" onClick={handleTestConnection} disabled={testStatus === 'testing' || loading || isGeneratingAll} className="rounded-xl">
                                    {testStatus === 'testing' ? 'Testing...' : 'Test Connection'}
                                </Button>
                                <Button type="button" variant="secondary" onClick={handleGenerateAllFolders} disabled={loading || isGeneratingAll} className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white">
                                    {isGeneratingAll ? 'Generating Folders...' : 'Generate All Project Folders'}
                                </Button>

                                {testStatus === 'success' && (
                                    <span className="text-emerald-500 font-medium text-sm flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm"></span>
                                        {testMessage}
                                    </span>
                                )}
                                {testStatus === 'error' && (
                                    <span className="text-rose-500 font-medium text-sm flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm relative"><span className="absolute inset-0 rounded-full bg-rose-500 animate-ping opacity-75"></span></span>
                                        {testMessage}
                                    </span>
                                )}
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="work" className="space-y-6">
                <Card className="border-none shadow-xl rounded-3xl">
                    <CardHeader>
                        <CardTitle>Work Configuration | إعدادات العمل</CardTitle>
                        <CardDescription>Define standard working hours and weekly schedule.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form action={handleSettingsSubmit} className="space-y-6 max-w-lg">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Daily Working Hours Goal (Target)</Label>
                                    <Input name="workingHoursPerDay" type="number" step="0.5" defaultValue={initialSettings?.workingHoursPerDay || 8} className="rounded-xl font-mono" />
                                    <p className="text-xs text-slate-400">Used for timesheet validation and hourly rate derivation.</p>
                                </div>
                                <div className="space-y-2">
                                    <Label>Working Days Per Week</Label>
                                    <Input name="workingDaysPerWeek" type="number" defaultValue={initialSettings?.workingDaysPerWeek || 5} className="rounded-xl font-mono" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Weekend Days (Comma separated)</Label>
                                    <Input name="weekendDays" defaultValue={initialSettings?.weekendDays || "Friday,Saturday"} className="rounded-xl" placeholder="Friday,Saturday" />
                                    <p className="text-xs text-slate-400">e.g. "Friday,Saturday" or "Sunday".</p>
                                </div>
                            </div>

                            {/* Hidden fields to preserve other settings */}
                            <input type="hidden" name="companyNameEn" value={initialSettings?.companyNameEn || ""} />
                            <input type="hidden" name="companyNameAr" value={initialSettings?.companyNameAr || ""} />
                            <input type="hidden" name="contactEmail" value={initialSettings?.contactEmail || ""} />
                            <input type="hidden" name="contactPhone" value={initialSettings?.contactPhone || ""} />
                            <input type="hidden" name="address" value={initialSettings?.address || ""} />
                            <input type="hidden" name="vatPercentage" value={initialSettings?.vatPercentage || ""} />
                            <input type="hidden" name="defaultCurrency" value={initialSettings?.defaultCurrency || ""} />
                            <input type="hidden" name="taxNumber" value={initialSettings?.taxNumber || ""} />
                            <input type="hidden" name="driveClientId" value={initialSettings?.driveClientId || ""} />
                            <input type="hidden" name="driveClientSecret" value={initialSettings?.driveClientSecret || ""} />
                            <input type="hidden" name="driveRefreshToken" value={initialSettings?.driveRefreshToken || ""} />
                            <input type="hidden" name="driveFolderId" value={initialSettings?.driveFolderId || ""} />

                            <Button type="submit" disabled={loading} className="rounded-xl bg-primary px-8">
                                {loading ? 'Saving...' : 'Save Work Configuration'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="lookups" className="space-y-6">
                <Card className="border-none shadow-xl rounded-3xl overflow-hidden">
                    <CardHeader className="bg-slate-50 border-b border-slate-100 flex flex-row justify-between items-center sm:min-h-[80px]">
                        <div>
                            <CardTitle>System Lookups (Dropdowns)</CardTitle>
                            <CardDescription>Dynamically manage the options available across the platform menus.</CardDescription>
                        </div>
                        <div className="w-[200px]">
                            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                <SelectTrigger className="rounded-xl bg-white border-primary shadow-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PROJECT_TYPE">Project Types</SelectItem>
                                    <SelectItem value="ENGINEERING_DISCIPLINE">Engineering Disciplines</SelectItem>
                                    <SelectItem value="EXPENSE_CATEGORY">Expense Categories</SelectItem>
                                    <SelectItem value="DOCUMENT_TYPE">Document Types</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {/* Add New Row */}
                        <div className="p-6 bg-slate-50/50 border-b border-slate-100">
                            <form id="lookup-form" action={handleLookupSubmit} className="flex gap-4 items-end">
                                <div className="space-y-2 flex-1">
                                    <Label className="text-xs">System Value (Unique Code)</Label>
                                    <Input name="value" required placeholder="e.g., URBAN_PLANNING" className="rounded-xl font-mono uppercase" />
                                </div>
                                <div className="space-y-2 flex-1">
                                    <Label className="text-xs">English Label</Label>
                                    <Input name="labelEn" required placeholder="Urban Planning" className="rounded-xl" />
                                </div>
                                <div className="space-y-2 flex-1">
                                    <Label className="text-xs">Arabic Label</Label>
                                    <Input name="labelAr" required placeholder="تخطيط حضري" className="rounded-xl text-right" dir="rtl" />
                                </div>
                                <div className="space-y-2 pb-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" name="isActive" value="true" defaultChecked className="w-4 h-4 rounded text-primary" />
                                        <span className="text-sm font-medium">Active</span>
                                    </label>
                                </div>
                                <Button type="submit" disabled={loading} className="rounded-xl w-[120px]">
                                    {loading ? 'Adding...' : 'Add Option'}
                                </Button>
                            </form>
                        </div>

                        {/* Data Table */}
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>System Code</TableHead>
                                    <TableHead>English Label</TableHead>
                                    <TableHead>Arabic Label</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredLookups.map((lookup) => (
                                    <TableRow key={lookup.id}>
                                        <TableCell className="font-mono text-xs">{lookup.value}</TableCell>
                                        <TableCell className="font-medium">{lookup.labelEn}</TableCell>
                                        <TableCell className="text-right font-medium" dir="rtl">{lookup.labelAr}</TableCell>
                                        <TableCell>
                                            <Badge variant={lookup.isActive ? 'default' : 'secondary'} className={lookup.isActive ? 'bg-emerald-500 hover:bg-emerald-600' : ''}>
                                                {lookup.isActive ? 'Active' : 'Disabled'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Switch
                                                    checked={lookup.isActive}
                                                    onCheckedChange={() => handleToggleLookup(lookup.id, lookup.isActive)}
                                                />
                                                <button
                                                    onClick={() => handleDeleteLookup(lookup.id, lookup.labelEn)}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {filteredLookups.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                            No dropdown options created for this category yet.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="branches" className="space-y-6">
                <BranchesTab branches={branches} />
            </TabsContent>
        </Tabs>
    )
}
