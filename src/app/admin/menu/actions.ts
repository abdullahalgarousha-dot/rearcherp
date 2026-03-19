"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import { redirect } from "next/navigation"

export async function createMenuLink(formData: FormData) {
    const session = await auth()
    if (!session /* || session.user.role !== 'ADMIN' */) {
        // TODO: Enforce Admin
    }

    const label = formData.get("label") as string
    const href = formData.get("href") as string
    const icon = formData.get("icon") as string
    const order = parseInt(formData.get("order") as string)

    await (db as any).menuLink.create({
        data: { label, href, icon, order }
    })

    revalidatePath("/")
}

export async function updateMenuLink(formData: FormData) {
    const id = formData.get("id") as string
    const label = formData.get("label") as string
    const href = formData.get("href") as string
    const icon = formData.get("icon") as string
    const order = parseInt(formData.get("order") as string)

    await (db as any).menuLink.update({
        where: { id },
        data: { label, href, icon, order }
    })

    revalidatePath("/")
}

export async function deleteMenuLink(id: string) {
    await (db as any).menuLink.delete({ where: { id } })
    revalidatePath("/")
}
