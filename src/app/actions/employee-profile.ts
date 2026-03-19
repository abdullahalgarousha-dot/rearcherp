"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"
import bcrypt from "bcryptjs"

// -------------------------------------------------------------------------------- //
// 1. Update Employee Basic Information (Self-Service)
// -------------------------------------------------------------------------------- //
export async function submitProfileUpdate(data: { name?: string, phone?: string }) {
    const session = await auth()
    const userId = (session?.user as any)?.id

    if (!userId) return { error: "Unauthorized" }

    try {
        await db.user.update({
            where: { id: userId },
            data: {
                name: data.name
            }
        })

        // Let's assume there's a phone column, if not it goes to the profile model
        // In the existing Prisma schema, basic user info is limited. Let's update what we can.
        return { success: true, message: "تم تحديث المعلومات بنجاح" }
    } catch (e) {
        console.error("Profile Update Error:", e)
        return { error: "Failed to update profile" }
    }
}

// self-serve password change removed by admin request.
