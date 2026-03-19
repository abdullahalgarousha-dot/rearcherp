"use server"

import { db } from "@/lib/db"
import bcrypt from "bcryptjs"

const MAX_ATTEMPTS = 5
const COOLDOWN_MINUTES = 15

// Emergency super admin credentials (plain-text bypass — no bcrypt)
const EMERGENCY_EMAIL = (process.env.SUPER_ADMIN_EMAIL || "super@rearch.sa").toLowerCase().trim()
const EMERGENCY_PASS = process.env.SUPER_ADMIN_PASSWORD || "password"

export async function loginSuperAdmin({
    email: rawEmail,
    password,
}: {
    email: string
    password: string
}) {
    try {
        const email = rawEmail.toLowerCase().trim()

        if (!email || !password) {
            return { error: "Email and password are required." }
        }

        // ── Emergency bypass: plain-text comparison, no DB lookup ─────────────
        if (email === EMERGENCY_EMAIL && password === EMERGENCY_PASS) {
            return { success: true, requiresMfa: false }
        }

        // ── Rate limiting (DB users only) ─────────────────────────────────────
        const recentAttempts = await (db as any).loginAttempt.count({
            where: {
                email,
                success: false,
                createdAt: { gte: new Date(Date.now() - COOLDOWN_MINUTES * 60 * 1000) },
            },
        })

        if (recentAttempts >= MAX_ATTEMPTS) {
            return { error: `Too many failed attempts. Try again in ${COOLDOWN_MINUTES} minutes.` }
        }

        // ── DB super admin lookup ─────────────────────────────────────────────
        const user = await (db as any).user.findFirst({
            where: { email, role: { in: ["GLOBAL_SUPER_ADMIN", "SUPER_ADMIN"] } },
        })

        if (!user || !user.password) {
            await (db as any).loginAttempt.create({ data: { email, success: false } })
            return { error: "Invalid credentials or insufficient permissions." }
        }

        const passwordMatch = await bcrypt.compare(password, user.password)
        if (!passwordMatch) {
            await (db as any).loginAttempt.create({ data: { email, success: false } })
            return { error: "Invalid credentials." }
        }

        // Store fixed MFA code against the user row
        const mfaCode = "123456"
        await (db as any).user.update({
            where: { id: user.id },
            data: { twoFactorSecret: mfaCode },
        })

        await (db as any).loginAttempt.create({ data: { email, success: true } })

        // tempToken = userId so verifyMfaAction can look the user back up
        return { success: true, requiresMfa: true, tempToken: user.id }
    } catch (e) {
        console.error("[loginSuperAdmin] error:", e)
        return { error: "An unexpected error occurred. Please try again." }
    }
}

export async function verifyMfaAction({
    tempToken,
    code,
}: {
    tempToken: string
    code: string
}) {
    try {
        const user = await (db as any).user.findUnique({ where: { id: tempToken } })

        if (!user || user.twoFactorSecret !== code) {
            return { error: "Invalid MFA code." }
        }

        await (db as any).user.update({
            where: { id: user.id },
            data: { twoFactorSecret: null },
        })

        return { success: true }
    } catch (e) {
        console.error("[verifyMfaAction] error:", e)
        return { error: "Verification failed. Please try again." }
    }
}
