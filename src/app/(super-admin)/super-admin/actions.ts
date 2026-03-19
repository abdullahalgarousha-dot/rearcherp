"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"
import { seedDemoTenant } from "@/lib/demo-seeder"

export async function getAllTenants() {
    const session = await auth()
    if ((session?.user as any)?.role !== 'GLOBAL_SUPER_ADMIN') {
        throw new Error("Unauthorized")
    }

    return await (db as any).tenant.findMany({
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

    return await (db as any).subscriptionPlan.findMany({
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
            await (db as any).subscriptionPlan.update({ where: { id: data.id }, data: planData })
        } else {
            await (db as any).subscriptionPlan.create({ data: planData })
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
        const count = await (db as any).tenant.count({
            where: { planId }
        })

        if (count > 0) {
            return { error: `Cannot delete plan. It is assigned to ${count} tenants.` }
        }

        await (db as any).subscriptionPlan.delete({
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

        // ── 1. Create Tenant ──────────────────────────────────────────
        const tenant = await (db as any).tenant.create({
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
        const branch = await (db as any).branch.create({
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
        await (db as any).brand.create({
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
        await (db as any).companyProfile.create({
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
            await (db as any).systemSetting.upsert({
                where: { key: s.key },
                update: { value: s.value, tenantId: tenant.id },
                create: { tenantId: tenant.id, key: s.key, value: s.value, description: s.description },
            })
        }

        // ── 6. Default RBAC Roles ─────────────────────────────────────
        const fullPerms = JSON.stringify({
            DASHBOARD: { read: true,  write: true,  approve: true  },
            PROJECTS:  { read: true,  write: true,  approve: true  },
            HR:        { read: true,  write: true,  approve: true  },
            FINANCE:   { read: true,  write: true,  approve: true  },
            SUPERVISION:{ read: true, write: true,  approve: true  },
            USERS:     { read: true,  write: true,  approve: true  },
            SETTINGS:  { read: true,  write: true,  approve: true  },
            REPORTS:   { read: true,  write: true,  approve: true  },
        })
        const siteEngPerms = JSON.stringify({
            DASHBOARD:  { read: true,  write: false, approve: false },
            PROJECTS:   { read: true,  write: false, approve: false },
            SUPERVISION:{ read: true,  write: true,  approve: false },
            REPORTS:    { read: true,  write: true,  approve: false },
            HR:         { read: false, write: false, approve: false },
            FINANCE:    { read: false, write: false, approve: false },
            USERS:      { read: false, write: false, approve: false },
            SETTINGS:   { read: false, write: false, approve: false },
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
                const role = await (db as any).role.create({
                    data: { tenantId: tenant.id, name: r.name, description: r.description, permissionMatrix: r.matrix }
                })
                if (!adminRole) adminRole = role
            } catch {
                // Role name collision — fetch existing
                const existing = await (db as any).role.findFirst({ where: { name: r.name } })
                if (!adminRole && existing) adminRole = existing
            }
        }

        // ── 7. Admin User + Employee Profile ──────────────────────────
        const tempPassword = data.adminPassword || `REARCH-${Math.random().toString(36).slice(-8).toUpperCase()}`
        const hashedPassword = await bcrypt.hash(tempPassword, 10)

        const admin = await (db as any).user.create({
            data: {
                email: data.adminEmail.toLowerCase().trim(),
                name: data.adminName,
                password: hashedPassword,
                role: 'ADMIN',
                tenantId: tenant.id,
                roleId: adminRole?.id || undefined,
            }
        })

        await (db as any).employeeProfile.create({
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

        revalidatePath('/super-admin/dashboard')

        return {
            success: true,
            tenantId: tenant.id,
            adminEmail: admin.email,
            tempPassword,
            provisioned: ['branch', 'brand', 'companyProfile', 'systemSettings', '5 RBAC roles', 'adminUser', 'employeeProfile'],
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

    await (db as any).tenant.update({
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
        await (db as any).tenant.update({
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
        await (db as any).tenant.update({
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
        await (db as any).tenant.update({
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
        const tenant = await (db as any).tenant.findUnique({
            where: { id: tenantId },
            include: { users: true }
        })

        if (!tenant) return { error: "Tenant not found" }

        // Logic check: Protect system admin
        if (tenant.slug === 'fts') {
            return { error: "Cannot delete the core system tenant." }
        }

        // Deletion cascading handles child records if schema is configured
        await (db as any).tenant.delete({
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

        await (db as any).auditLog.create({
            data: {
                tenantId: 'system', // Logs to system tenant
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
