'use server'

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import fs from "node:fs/promises"
import path from "node:path"

export async function createBrand(formData: FormData) {
    const session = await auth()
    const user = session?.user as any
    if (user?.role !== 'ADMIN') {
        return { error: "Unauthorized" }
    }

    const nameEn = formData.get("nameEn") as string
    const nameAr = formData.get("nameAr") as string
    const acronym = formData.get("acronym") as string
    const email = formData.get("email") as string
    const phone = formData.get("phone") as string
    const address = formData.get("address") as string
    const crNumber = formData.get("crNumber") as string
    const vatNumber = formData.get("vatNumber") as string
    const bankName = formData.get("bankName") as string
    const iban = formData.get("iban") as string
    const accountHolder = formData.get("accountHolder") as string
    const logoFile = formData.get("logo") as File

    let logo = ""

    if (logoFile && logoFile.size > 0) {
        // ... (existing upload logic)
        const buffer = Buffer.from(await logoFile.arrayBuffer())
        const filename = `${Date.now()}-${logoFile.name.replace(/\s/g, '_')}`
        const uploadDir = path.join(process.cwd(), "public", "uploads")
        try {
            await fs.writeFile(path.join(uploadDir, filename), buffer)
            logo = `/uploads/${filename}`
        } catch (e) {
            console.error("Upload failed", e)
            return { error: "File upload failed" }
        }
    }

    try {
        await (db as any).brand.create({
            data: {
                nameEn,
                nameAr,
                acronym,
                shortName: acronym, // Map to legacy field
                email,
                phone,
                address,
                crNumber,
                vatNumber,
                bankName,
                iban,
                accountHolder,
                logo
            }
        })
    } catch (e) {
        console.error(e)
        return { error: "Database error" }
    }

    return { success: true }
}

export async function updateBrand(brandId: string, formData: FormData) {
    const session = await auth()
    const user = session?.user as any
    if (user?.role !== 'ADMIN') {
        return { error: "Unauthorized" }
    }

    const nameEn = formData.get("nameEn") as string
    const nameAr = formData.get("nameAr") as string
    const acronym = formData.get("acronym") as string
    const email = formData.get("email") as string
    const phone = formData.get("phone") as string
    const address = formData.get("address") as string
    const crNumber = formData.get("crNumber") as string
    const vatNumber = formData.get("vatNumber") as string
    const bankName = formData.get("bankName") as string
    const iban = formData.get("iban") as string
    const accountHolder = formData.get("accountHolder") as string
    const logoFile = formData.get("logo") as File

    const existing = await db.brand.findUnique({ where: { id: brandId } })
    if (!existing) return { error: "Brand not found" }

    let logo = existing.logoUrl

    if (logoFile && logoFile.size > 0) {
        // ... (same upload logic)
        const buffer = Buffer.from(await logoFile.arrayBuffer())
        const filename = `${Date.now()}-${logoFile.name.replace(/\s/g, '_')}`
        const uploadDir = path.join(process.cwd(), "public", "uploads")
        try {
            await fs.writeFile(path.join(uploadDir, filename), buffer)
            logo = `/uploads/${filename}`
        } catch (e) {
            console.error("Upload failed", e)
            return { error: "File upload failed" }
        }
    }

    try {
        await (db as any).brand.update({
            where: { id: brandId },
            data: {
                nameEn,
                nameAr,
                acronym,
                shortName: acronym,
                email,
                phone,
                address,
                crNumber,
                vatNumber,
                bankName,
                iban,
                accountHolder,
                logo
            }
        })
    } catch (e) {
        console.error(e)
        return { error: "Database error" }
    }

    return { success: true }
}

