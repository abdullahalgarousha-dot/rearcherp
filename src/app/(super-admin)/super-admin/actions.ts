"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"
import { seedDemoTenant } from "@/lib/demo-seeder"
import { getDriveSettings, initializeMasterHierarchy } from "@/lib/google-drive"

// ─────────────────────────────────────────────────────────────────────────────
// PLACEHOLDER: Replace with a real email provider (Resend, SendGrid, SES…)
// ─────────────────────────────────────────────────────────────────────────────
async function sendWelcomeEmail(payload: {
    email: string
    name: string
    password: string
    portalUrl: string
}): Promise<void> {
    // TODO: integrate transactional email service
    console.log("[Welcome Email] Would send to:", payload.email, {
        name: payload.name,
        portalUrl: payload.portalUrl,
        // password intentionally omitted from log — pass via secure channel only
    })
}

export async function getAllTenants() {
    const session = await auth()
    if ((session?.user as any)?.role !== 'GLOBAL_SUPER_ADMIN') {
        throw new Error("Unauthorized")
    }

    return await db.tenant.findMany({
        include: {
            plan: true,
            _count: {
                select: {
                    users: true,
                    projects: true
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    })
}

export async function getAllPlans() {
    const session = await auth()
    if ((session?.user as any)?.role !== 'GLOBAL_SUPER_ADMIN') {
        throw new Error("Unauthorized")
    }

    return await db.subscriptionPlan.findMany({
        orderBy: { createdAt: 'asc' }
    })
}

export async function upsertPlan(data: {
    id?: string
    name: string
    description?: string
    price: number
    currency: string
    allowedModules: string[]
    maxUsers?: number
}) {
    const session = await auth()
    if ((session?.user as any)?.role !== 'GLOBAL_SUPER_ADMIN') {
        return { error: "Unauthorized" }
    }

    try {
        const planData = {
            name: data.name,
            description: data.description,
            price: data.price,
            currency: data.currency,
            allowedModules: data.allowedModules,
            maxUsers: data.maxUsers ?? 0,  // 0 = unlimited
        }

        if (data.id) {
            await db.subscriptionPlan.update({ where: { id: data.id }, data: planData })
        } else {
            await db.subscriptionPlan.create({ data: planData })
        }

        revalidatePath('/super-admin/plans')
        revalidatePath('/super-admin/dashboard')
        return { success: true }
    } catch (e: any) {
        return { error: e.message || "Failed to save plan" }
    }
}

export async function deletePlan(planId: string) {
    const session = await auth()
    if ((session?.user as any)?.role !== 'GLOBAL_SUPER_ADMIN') {
        return { error: "Unauthorized" }
    }

    try {
        // Check if tenants are assigned to this plan
        const count = await db.tenant.count({
            where: { planId }
        })

        if (count > 0) {
            return { error: `Cannot delete plan. It is assigned to ${count} tenants.` }
        }

        await db.subscriptionPlan.delete({
            where: { id: planId }
        })

        revalidatePath('/super-admin/plans')
        return { success: true }
    } catch (e: any) {
        return { error: e.message || "Failed to delete plan" }
    }
}

export async function onboardTenant(data: {
    name: string
    slug: string
    adminEmail: string
    adminName: string
    adminPassword?: string
    planId?: string
    subscriptionTier?: string
    subscriptionStart?: Date
    subscriptionEnd?: Date
}) {
    const session = await auth()
    if ((session?.user as any)?.role !== 'GLOBAL_SUPER_ADMIN') {
        return { error: "Unauthorized: Requires Super Admin privileges" }
    }

    try {
        const slug = data.slug.toLowerCase().trim()
        const prefix = slug.toUpperCase().slice(0, 6)

        // bcrypt is CPU-bound — must run BEFORE the transaction to avoid blocking
        // the DB connection pool for the duration of the hash computation.
        const tempPassword = data.adminPassword || `TOPO-${Math.random().toString(36).slice(-8).toUpperCase()}`
        const hashedPassword = await bcrypt.hash(tempPassword, 10)

        // TARGET 1: Single atomic transaction — if any step fails (e.g. duplicate
        // admin email), ALL prior writes (tenant, branch, brand, roles …) roll back
        // automatically.  No orphaned tenant records are left in the database.
        const { tenant, admin } = await db.$transaction(async (tx: any) => {

            // ── 1. Create Tenant ──────────────────────────────────────────
            const tenant = await tx.tenant.create({
                data: {
                    name: data.name,
                    slug,
                    planId: data.planId || null,
                    subscriptionTier: data.subscriptionTier || 'STANDARD',
                    status: 'ACTIVE',
                    setupCompleted: true,
                    subscriptionStart: data.subscriptionStart || new Date(),
                    subscriptionEnd: data.subscriptionEnd || null,
                }
            })

            // ── 2. Default Branch ─────────────────────────────────────────
            const branch = await tx.branch.create({
                data: {
                    tenantId: tenant.id,
                    nameEn: 'Main Office',
                    nameAr: 'المكتب الرئيسي',
                    currencyCode: 'SAR',
                    exchangeRateToBase: 1.0,
                    isMainBranch: true,
                }
            })

            // ── 3. Default Brand ──────────────────────────────────────────
            await tx.brand.create({
                data: {
                    tenantId: tenant.id,
                    nameEn: data.name,
                    nameAr: data.name,
                    shortName: prefix,
                    abbreviation: prefix,
                    isDefault: true,
                    primaryColor: '#1e40af',
                    accentColor: '#3b82f6',
                }
            })

            // ── 4. Default Company Profile ────────────────────────────────
            await tx.companyProfile.create({
                data: {
                    tenantId: tenant.id,
                    companyNameEn: data.name,
                    companyNameAr: data.name,
                    vatPercentage: 15,
                    defaultCurrency: 'SAR',
                    workingHoursPerDay: 8,
                    workingDaysPerWeek: 5,
                    weekendDays: 'Friday,Saturday',
                }
            })

            // ── 5. Default System Settings ────────────────────────────────
            const defaultSettings = [
                { key: `${tenant.id}_CURRENCY`,          value: 'SAR',   description: 'Default currency' },
                { key: `${tenant.id}_VAT_RATE`,           value: '0.15',  description: 'VAT rate (15%)' },
                { key: `${tenant.id}_WORKING_HOURS`,      value: '8',     description: 'Working hours/day' },
                { key: `${tenant.id}_WORKING_DAYS`,       value: '5',     description: 'Working days/week' },
                { key: `${tenant.id}_WEEKEND`,            value: 'Friday,Saturday', description: 'Weekend days' },
                { key: `${tenant.id}_RETENTION`,          value: '10',    description: 'Retention %' },
                { key: `${tenant.id}_ANNUAL_LEAVE`,       value: '21',    description: 'Annual leave days' },
                { key: `${tenant.id}_INVOICE_DUE_DAYS`,   value: '30',    description: 'Invoice due days' },
            ]
            for (const s of defaultSettings) {
                await tx.systemSetting.upsert({
                    where: { key: s.key },
                    update: { value: s.value, tenantId: tenant.id },
                    create: { tenantId: tenant.id, key: s.key, value: s.value, description: s.description },
                })
            }

            // ── 6. Default RBAC Roles ─────────────────────────────────────
            // JSON must match the PermissionMatrix interface in src/lib/rbac.ts exactly.
            // hasPermission() reads these fields by name — legacy keys (SETTINGS, PROJECTS…)
            // are silently ignored, causing lockouts.
            const fullPerms = JSON.stringify({
                projects:    { view: 'ALL',          createEdit: true,  approve: true,  delete: true,  canAccessDrive: true },
                supervision: { view: 'ALL',          manageDSR: true,   manageIR: true, manageNCR: true, approve: true, deleteReports: true },
                hr:          { view: 'ALL_BRANCHES', createEdit: true,  approveLeaves: true, delete: true, viewOfficialDocs: true, viewMedicalLeaves: true },
                finance:     { masterVisible: true,  viewContracts: true, viewVATReports: true, viewSalarySheets: true, manageLoans: true, canApproveFinance: true },
                system:      { manageSettings: true, manageRoles: true, viewLogs: true, viewAnalytics: true },
                crm:         { view: true,           createEdit: true,  delete: true },
            })
            const siteEngPerms = JSON.stringify({
                projects:    { view: 'ASSIGNED',     createEdit: false, approve: false, delete: false, canAccessDrive: true },
                supervision: { view: 'ALL',          manageDSR: true,   manageIR: true, manageNCR: true, approve: false, deleteReports: false },
                hr:          { view: 'NONE',         createEdit: false, approveLeaves: false, delete: false, viewOfficialDocs: false, viewMedicalLeaves: false },
                finance:     { masterVisible: false, viewContracts: false, viewVATReports: false, viewSalarySheets: false, manageLoans: false, canApproveFinance: false },
                system:      { manageSettings: false, manageRoles: false, viewLogs: false, viewAnalytics: false },
                crm:         { view: false,          createEdit: false, delete: false },
            })

            const roleNames = [
                { name: `${prefix} Admin`,            description: 'Full tenant admin access',           matrix: fullPerms },
                { name: `${prefix} Project Manager`,  description: 'Manages projects & supervision',     matrix: fullPerms },
                { name: `${prefix} HR Manager`,       description: 'Manages HR & payroll',               matrix: fullPerms },
                { name: `${prefix} Senior Accountant`,description: 'Manages finance & invoicing',        matrix: fullPerms },
                { name: `${prefix} Site Engineer`,    description: 'Creates reports, NCRs, and IRs',     matrix: siteEngPerms },
            ]
            let adminRole: any = null
            for (const r of roleNames) {
                try {
                    const role = await tx.role.create({
                        data: { tenantId: tenant.id, name: r.name, description: r.description, permissionMatrix: r.matrix }
                    })
                    if (!adminRole) adminRole = role
                } catch {
                    // TARGET 2: Role name collision — scope lookup to this tenant to avoid
                    // returning a same-named role that belongs to a different tenant.
                    const existing = await tx.role.findFirst({ where: { name: r.name, tenantId: tenant.id } })
                    if (!adminRole && existing) adminRole = existing
                }
            }

            // ── 7. Admin User + Employee Profile ──────────────────────────
            const admin = await tx.user.create({
                data: {
                    email: data.adminEmail.toLowerCase().trim(),
                    name: data.adminName,
                    password: hashedPassword,
                    role: 'ADMIN',
                    tenantId: tenant.id,
                    roleId: adminRole?.id || undefined,
                }
            })

            await tx.employeeProfile.create({
                data: {
                    userId: admin.id,
                    tenantId: tenant.id,
                    branchId: branch.id,
                    department: 'Management',
                    position: 'General Manager',
                    employeeCode: `${prefix}-001`,
                    basicSalary: 0,
                    totalSalary: 0,
                }
            })

            return { tenant, admin }
        })

        // ── TARGET 1: Google Drive root initialization ─────────────────────
        // Non-blocking: Drive failure must never roll back the tenant record.
        // Credentials are set after onboarding via the tenant settings screen,
        // so this step is a best-effort initializer for tenants whose credentials
        // are pre-configured or injected at creation time.
        const driveProvisioned: string[] = []
        try {
            const driveSettings = await getDriveSettings(tenant.id)
            const masterFolders = await initializeMasterHierarchy(tenant.id, driveSettings.driveFolderId)

            // Store the tenant-level Drive root and the master project folder on the
            // brand, so project-folder creation has a well-known starting point.
            await (db as any).brand.updateMany({
                where: { tenantId: tenant.id, isDefault: true },
                data: { driveFolderId: masterFolders.projects },
            })

            // Also stamp the root folder ID on the tenant for Drive health checks
            await db.tenant.update({
                where: { id: tenant.id },
                data: { driveRootFolderId: driveSettings.driveFolderId },
            })

            driveProvisioned.push('masterHierarchy', 'projectsFolder')
            console.log(`[Onboarding] Drive initialized for tenant "${tenant.id}": projects folder = ${masterFolders.projects}`)
        } catch (driveErr: any) {
            // Expected for new tenants that haven't configured Drive credentials yet.
            // Log and continue — the admin can connect Drive later via Settings.
            console.warn(`[Onboarding] Drive initialization skipped for "${tenant.id}": ${driveErr.message}`)
        }

        // ── TARGET 2: Welcome email ────────────────────────────────────────
        // Runs after Drive so a Drive failure cannot delay the email.
        // sendWelcomeEmail is fire-and-forget — do NOT await in the critical path
        // once a real provider is wired up; for now we await the mock (it's instant).
        const portalUrl = process.env.NEXT_PUBLIC_APP_URL
            ? `${process.env.NEXT_PUBLIC_APP_URL}/login`
            : `https://${data.slug}.app.example.com/login`

        await sendWelcomeEmail({
            email: admin.email,
            name: admin.name,
            password: tempPassword,
            portalUrl,
        })

        revalidatePath('/super-admin/dashboard')

        return {
            success: true,
            tenantId: tenant.id,
            adminEmail: admin.email,
            tempPassword,
            provisioned: [
                'branch', 'brand', 'companyProfile', 'systemSettings',
                '5 RBAC roles', 'adminUser', 'employeeProfile',
                ...(driveProvisioned.length ? [`drive:${driveProvisioned.join('+')}` ] : []),
                'welcomeEmail',
            ],
        }
    } catch (e: any) {
        console.error("Onboarding Error:", e)
        if (e.code === 'P2002') {
            return { error: "Tenant slug or admin email already exists." }
        }
        return { error: e.message || "Failed to onboard tenant" }
    }
}

export async function toggleTenantStatus(tenantId: string, currentStatus: string) {
    const session = await auth()
    if ((session?.user as any)?.role !== 'GLOBAL_SUPER_ADMIN') {
        return { error: "Unauthorized" }
    }

    const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'

    await db.tenant.update({
        where: { id: tenantId },
        data: { status: newStatus }
    })

    revalidatePath('/super-admin/dashboard')
    return { success: true }
}

export async function updateTenantDomain(tenantId: string, customDomain: string | null) {
    const session = await auth()
    if ((session?.user as any)?.role !== 'GLOBAL_SUPER_ADMIN') {
        return { error: "Unauthorized" }
    }

    try {
        await db.tenant.update({
            where: { id: tenantId },
            data: { customDomain: customDomain?.toLowerCase().trim() || null }
        })

        revalidatePath('/super-admin/dashboard')
        return { success: true }
    } catch (e: any) {
        if (e.code === 'P2002') {
            return { error: "This custom domain is already assigned to another tenant." }
        }
        return { error: e.message || "Failed to update domain" }
    }
}

export async function changeTenantPlan(tenantId: string, planId: string | null) {
    const session = await auth()
    if ((session?.user as any)?.role !== 'GLOBAL_SUPER_ADMIN') {
        return { error: "Unauthorized" }
    }

    try {
        await db.tenant.update({
            where: { id: tenantId },
            data: { planId: planId }
        })

        revalidatePath('/super-admin/dashboard')
        return { success: true }
    } catch (e: any) {
        return { error: e.message || "Failed to update plan" }
    }
}

export async function updateTenant(tenantId: string, data: { name: string, status: string, subscriptionTier: 'STANDARD' | 'PROFESSIONAL' | 'ENTERPRISE' }) {
    const session = await auth()
    if ((session?.user as any)?.role !== 'GLOBAL_SUPER_ADMIN') {
        return { error: "Unauthorized" }
    }

    try {
        await db.tenant.update({
            where: { id: tenantId },
            data: {
                name: data.name,
                status: data.status,
                subscriptionTier: data.subscriptionTier
            }
        })

        revalidatePath('/super-admin/dashboard')
        return { success: true }
    } catch (e: any) {
        return { error: e.message || "Failed to update tenant" }
    }
}

export async function deleteTenant(tenantId: string) {
    const session = await auth()
    if ((session?.user as any)?.role !== 'GLOBAL_SUPER_ADMIN') {
        return { error: "Unauthorized" }
    }

    try {
        // Find tenant and associated data
        const tenant = await db.tenant.findUnique({
            where: { id: tenantId },
            include: { users: true }
        })

        if (!tenant) return { error: "Tenant not found" }

        // Logic check: Protect system admin
        if (tenant.slug === 'fts') {
            return { error: "Cannot delete the core system tenant." }
        }

        // Deletion cascading handles child records if schema is configured
        await db.tenant.delete({
            where: { id: tenantId }
        })

        revalidatePath('/super-admin/dashboard')
        return { success: true }
    } catch (e: any) {
        return { error: e.message || "Failed to delete tenant" }
    }
}

export async function resetDemoTenant() {
    const session = await auth()
    if ((session?.user as any)?.role !== 'GLOBAL_SUPER_ADMIN') {
        return { error: "Unauthorized" }
    }

    try {
        // 1. Wipe existing demo data (In a real system, you'd target tenant-specific logs)
        // Here we just re-run the seeder which uses upsert
        const result = await seedDemoTenant()

        revalidatePath('/super-admin/dashboard')
        return result
    } catch (e: any) {
        return { error: e.message || "Failed to reset demo" }
    }
}

export async function logImpersonation(tenantId: string, tenantSlug: string) {
    const session = await auth()
    if ((session?.user as any)?.role !== 'GLOBAL_SUPER_ADMIN') {
        return { error: "Unauthorized" }
    }

    try {
        if (!session?.user?.id) throw new Error("User session invalid")

        // TARGET 3: Use the impersonated tenant's ID as the FK.  The previous
        // hardcoded 'system' string is not a valid Tenant record and throws a
        // P2003 foreign-key constraint violation at runtime.
        await db.auditLog.create({
            data: {
                tenantId: tenantId,
                userId: session.user.id,
                action: "TENANT_IMPERSONATION",
                details: `Super Admin impersonated tenant: ${tenantSlug} (${tenantId})`,
            }
        })
        return { success: true }
    } catch (e: any) {
        console.error("Audit log error:", e)
        return { error: "Failed to log event" }
    }
}
