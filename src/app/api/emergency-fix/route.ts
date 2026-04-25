import { NextResponse } from "next/server"
import { db } from "@/lib/db"

/**
 * EMERGENCY RECOVERY ROUTE
 * Visit GET /api/emergency-fix once to repair a locked-out database.
 * DELETE THIS FILE immediately after regaining access.
 */
export async function GET() {
    if (
        process.env.NODE_ENV === "production" &&
        process.env.ALLOW_EMERGENCY_FIX !== "true"
    ) {
        return NextResponse.json(
            { error: "Disabled in production. Set ALLOW_EMERGENCY_FIX=true to enable." },
            { status: 403 }
        )
    }

    try {
        // ── 1. Grab the very first user — no orderBy, no where ───────────────
        const user = await (db as any).user.findFirst()
        if (!user) {
            return NextResponse.json({ error: "No users found in the database at all." }, { status: 404 })
        }

        // ── 2. Resolve tenantId — prefer user's own, fall back to first tenant ─
        let tenantId = user.tenantId && user.tenantId !== "t_undefined"
            ? user.tenantId
            : null

        if (!tenantId) {
            const tenant = await (db as any).tenant.findFirst()
            if (!tenant) {
                return NextResponse.json({ error: "No tenants found in the database." }, { status: 404 })
            }
            tenantId = tenant.id
        }

        // ── 3. Full PermissionMatrix — matches src/lib/rbac.ts exactly ────────
        const fullMatrix = JSON.stringify({
            projects:    { view: "ALL",          createEdit: true,  approve: true,  delete: true,  canAccessDrive: true },
            supervision: { view: "ALL",          manageDSR: true,   manageIR: true, manageNCR: true, approve: true, deleteReports: true },
            hr:          { view: "ALL_BRANCHES", createEdit: true,  approveLeaves: true, delete: true, viewOfficialDocs: true, viewMedicalLeaves: true },
            finance:     { masterVisible: true,  viewContracts: true, viewVATReports: true, viewSalarySheets: true, manageLoans: true, canApproveFinance: true },
            system:      { manageSettings: true, manageRoles: true, viewLogs: true, viewAnalytics: true },
            crm:         { view: true,           createEdit: true,  delete: true },
        })

        // ── 4. Find or create the Emergency Admin role for this tenant ────────
        let role = await (db as any).role.findFirst({
            where: { tenantId, name: "Emergency Admin" }
        })
        if (!role) {
            role = await (db as any).role.create({
                data: {
                    tenantId,
                    name: "Emergency Admin",
                    description: "Auto-created by emergency recovery. Delete after use.",
                    permissionMatrix: fullMatrix,
                }
            })
        } else {
            role = await (db as any).role.update({
                where: { id: role.id },
                data: { permissionMatrix: fullMatrix }
            })
        }

        // ── 5. Promote the user ───────────────────────────────────────────────
        await (db as any).user.update({
            where: { id: user.id },
            data: {
                role: "GLOBAL_SUPER_ADMIN",
                roleId: role.id,
                tenantId,
            }
        })

        return NextResponse.json({
            success: true,
            message: "Emergency fix applied. DELETE src/app/api/emergency-fix/route.ts immediately after logging in.",
            fixed: {
                user:  { id: user.id, email: user.email, newRole: "GLOBAL_SUPER_ADMIN" },
                role:  { id: role.id, name: role.name },
                tenantId,
            }
        })
    } catch (e: any) {
        console.error("[Emergency Fix] Error:", e)
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
