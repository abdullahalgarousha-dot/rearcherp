'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createBrand } from "./actions"

export default function NewBrandPage() {
    const router = useRouter()
    const [error, setError] = useState('')

    async function onSubmit(formData: FormData) {
        const res = await createBrand(formData)
        if (res?.error) {
            setError(res.error)
        } else {
            router.push('/admin/brands')
            router.refresh()
        }
    }

    return (
        <div className="max-w-2xl mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle>Create New Brand</CardTitle>
                </CardHeader>
                <CardContent>
                    <form action={onSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="nameEn">English Name *</Label>
                                <Input id="nameEn" name="nameEn" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="nameAr">Arabic Name *</Label>
                                <Input id="nameAr" name="nameAr" required className="text-right" dir="rtl" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="logo">Logo (Image File)</Label>
                            <Input id="logo" name="logo" type="file" accept="image/*" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="acronym">Acronym (e.g. FTS) *</Label>
                                <Input id="acronym" name="acronym" required placeholder="FTS" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input id="email" name="email" type="email" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone</Label>
                                <Input id="phone" name="phone" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="address">Address</Label>
                                <Input id="address" name="address" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="crNumber">CR Number</Label>
                                    <Input id="crNumber" name="crNumber" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="vatNumber">VAT Number</Label>
                                    <Input id="vatNumber" name="vatNumber" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="bankName">Bank Name</Label>
                                <Input id="bankName" name="bankName" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="iban">IBAN</Label>
                                <Input id="iban" name="iban" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="accountHolder">Account Holder</Label>
                                <Input id="accountHolder" name="accountHolder" />
                            </div>
                        </div>

                        {error && <p className="text-red-500">{error}</p>}

                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
                            <Button type="submit">Create Brand</Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
