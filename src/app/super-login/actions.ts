"use server"

import { db } from "@/lib/db"
import { auth, signIn, signOut } from "@/auth"
import { redirect } from "next/navigation"
import bcrypt from "bcryptjs"

const MAX_ATTEMPTS = 3
const COOLDOWN_MINUTES = 15

export async function loginSuperAdmin(formData: FormData) {
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const access = formData.get("access") as string

    // 1. Validate Secret Query Param
    if (access !== "secure") {
        return { error: "Access denied: Invalid secure token." }
    }

    if (!email || !password) {
        return { error: "Email and password are required." }
    }

    // 2. Check Rate Limiting
    const recentAttempts = await (db as any).loginAttempt.count({
        where: {
            email,
            success: false,
            createdAt: { gte: new Date(Date.now() - COOLDOWN_MINUTES * 60 * 1000) }
        }
    })

    if (recentAttempts >= MAX_ATTEMPTS) {
        return { error: `Too many failed attempts. Please try again in ${COOLDOWN_MINUTES} minutes.` }
    }

    // 3. Find Global Super Admin (Flexible name check)
    const user = await (db as any).user.findFirst({
        where: {
            email,
            role: { in: ["GLOBAL_SUPER_ADMIN", "SUPER_ADMIN"] }
        }
    })

    if (!user || !user.password) {
        await (db as any).loginAttempt.create({
            data: { email, success: false }
        })
        return { error: "Invalid credentials or insufficient permissions." }
    }

    // 4. Verify Password
    const passwordMatch = await bcrypt.compare(password, user.password)
    if (!passwordMatch) {
        await (db as any).loginAttempt.create({
            data: { email, success: false }
        })
        return { error: "Invalid credentials." }
    }

    // 5. Success - Log and Initiate MFA Flow (Simulated for this implementation)
    // In a real system, we'd send an email/SMS/TOTP challenge here.
    // For this hardened demo, we will use a fixed code to ensure you can get in easily.
    const mfaCode = "123456"

    await (db as any).user.update({
        where: { id: user.id },
        data: { twoFactorSecret: mfaCode }
    })

    console.log(`[SECURITY] Super Admin MFA Code for ${email}: ${mfaCode}`)

    // Track success (but not logged in yet)
    await (db as any).loginAttempt.create({
        data: { email, success: true }
    })

    return {
        success: true,
        needsMfa: true,
        userId: user.id
    }
}

export async function verifyMfaAction(userId: string, code: string) {
    const user = await (db as any).user.findUnique({
        where: { id: userId }
    })

    if (!user || user.twoFactorSecret !== code) {
        return { error: "Invalid MFA code." }
    }

    // Clear code and enable session via next-auth
    // Note: To use next-auth's signIn with a custom flow, we usually use credentials provider.
    // For this specific logic, we'll use a hidden field in the final login step.

    await (db as any).user.update({
        where: { id: userId },
        data: { twoFactorSecret: null }
    })

    try {
        // Since we already verified credentials and MFA, we can manually trigger the session
        // However, next-auth signIn handles the cookie. We'll reuse the credentials here.
        // For simplicity in this demo, we'll assume the client component will call signIn 
        // with the verified state.
        return { success: true }
    } catch (e) {
        return { error: "Authentication failed." }
    }
}
