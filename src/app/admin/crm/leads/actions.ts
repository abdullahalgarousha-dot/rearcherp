'use server'

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { hasPermission } from "@/lib/rbac"

const REVALIDATE = () => {
    revalidatePath('/admin/crm/leads')
}

// ── Helpers ───────────────────────────────────────────────────────────────

async function getSession() {
    const session = await auth()
    const user = session?.user as any
    if (!user) throw new Error('Unauthorized')
    return { tenantId: user.tenantId as string, userId: user.id as string }
}

async function triggerLeadDriveFolder(tenantId: string, leadId: string, brandName: string, leadName: string) {
    try {
        const { getDriveSettings, findOrCreateFolder } = await import('@/lib/google-drive')
        const { driveFolderId: rootId } = await getDriveSettings(tenantId)
        const salesFolder = await findOrCreateFolder(tenantId, 'Sales', rootId)
        const brandFolder = await findOrCreateFolder(tenantId, brandName, salesFolder)
        const leadFolder = await findOrCreateFolder(tenantId, leadName, brandFolder)
        await (db as any).lead.update({ where: { id: leadId }, data: { driveFolderId: leadFolder } })
        console.log(`[Drive] Lead folder created: Sales/${brandName}/${leadName}`)
    } catch (err) {
        console.warn(`[Drive] Failed to create lead folder (non-blocking):`, err)
    }
}

/**
 * Uploads a proposal PDF to the lead's Google Drive folder.
 * Falls back to finding/creating Sales/Brand/Lead hierarchy if driveFolderId is not yet set.
 * Returns the webViewLink, or null if Drive is not configured / upload fails.
 */
async function uploadProposalPdf(
    tenantId: string,
    leadId: string,
    file: File
): Promise<string | null> {
    try {
        const { getDriveSettings, findOrCreateFolder, uploadToDrive } = await import('@/lib/google-drive')

        const lead = await (db as any).lead.findUnique({
            where: { id: leadId },
            include: { brand: true },
        })

        let folderId: string
        if (lead?.driveFolderId) {
            folderId = lead.driveFolderId
        } else {
            // Folder wasn't created yet — build Sales/Brand/Lead path now
            const { driveFolderId: rootId } = await getDriveSettings(tenantId)
            const salesFolder = await findOrCreateFolder(tenantId, 'Sales', rootId)
            const brandFolder = await findOrCreateFolder(tenantId, lead?.brand?.nameEn || 'Unknown Brand', salesFolder)
            folderId = await findOrCreateFolder(tenantId, lead?.name || 'Unknown Lead', brandFolder)
            // Persist for future uploads
            await (db as any).lead.update({ where: { id: leadId }, data: { driveFolderId: folderId } })
        }

        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        const result = await uploadToDrive(tenantId, file.name, buffer, 'application/pdf', folderId)
        return result.webViewLink ?? `https://drive.google.com/file/d/${result.fileId}/view`
    } catch (err) {
        console.warn('[Drive] Proposal PDF upload failed (non-blocking):', err)
        return null
    }
}

// ── Leads ─────────────────────────────────────────────────────────────────

export async function createLead(data: {
    name: string
    company?: string
    email?: string
    phone?: string
    brandId: string
    notes?: string
}) {
    const { tenantId } = await getSession()
    const canCreate = await hasPermission('crm', 'createEdit')
    if (!canCreate) return { error: 'Unauthorized' }

    if (!data.name?.trim() || !data.brandId) return { error: 'Name and brand are required' }

    const brand = await (db as any).brand.findUnique({ where: { id: data.brandId } })
    if (!brand) return { error: 'Brand not found' }

    try {
        const lead = await (db as any).lead.create({
            data: {
                tenantId,
                brandId: data.brandId,
                name: data.name.trim(),
                company: data.company?.trim() || null,
                email: data.email?.trim() || null,
                phone: data.phone?.trim() || null,
                notes: data.notes?.trim() || null,
                status: 'ACTIVE',
            }
        })
        // Non-blocking Drive folder
        triggerLeadDriveFolder(tenantId, lead.id, brand.nameEn, data.name.trim())
        REVALIDATE()
        return { success: true, lead }
    } catch (e: any) {
        return { error: e.message }
    }
}

export async function updateLeadStatus(leadId: string, status: 'ACTIVE' | 'ARCHIVED') {
    const { tenantId } = await getSession()
    const canEdit = await hasPermission('crm', 'createEdit')
    if (!canEdit) return { error: 'Unauthorized' }

    try {
        await (db as any).lead.update({
            where: { id: leadId, tenantId },
            data: { status }
        })
        REVALIDATE()
        revalidatePath(`/admin/crm/leads/${leadId}`)
        return { success: true }
    } catch (e: any) {
        return { error: e.message }
    }
}

// ── Proposals ─────────────────────────────────────────────────────────────

/**
 * Creates a new proposal. Accepts FormData so the client can pass a PDF file
 * directly — the server uploads it to Google Drive and saves the resulting URL.
 *
 * Required FormData fields: title, leadId, brandId
 * Optional:  initialAmount (number), notes (string), pdfFile (File)
 */
export async function createProposal(formData: FormData) {
    const { tenantId } = await getSession()
    const canCreate = await hasPermission('crm', 'createEdit')
    if (!canCreate) return { error: 'Unauthorized' }

    const leadId = formData.get('leadId') as string
    const brandId = formData.get('brandId') as string
    const title = (formData.get('title') as string)?.trim()
    const notes = (formData.get('notes') as string)?.trim() || undefined
    const amountRaw = formData.get('initialAmount') as string
    const initialAmount = amountRaw ? parseFloat(amountRaw) : undefined
    const pdfFile = formData.get('pdfFile') as File | null

    if (!title || !leadId || !brandId) {
        return { error: 'Title, lead, and brand are required' }
    }

    // Upload PDF to Drive (non-blocking on failure)
    let fileUrl: string | null = null
    if (pdfFile && pdfFile.size > 0) {
        fileUrl = await uploadProposalPdf(tenantId, leadId, pdfFile)
    }

    try {
        const proposal = await (db as any).proposal.create({
            data: {
                tenantId,
                leadId,
                brandId,
                title,
                notes: notes || null,
                currentStatus: 'DRAFT',
                revisions: (initialAmount !== undefined || fileUrl) ? {
                    create: {
                        tenantId,
                        revNumber: 0,
                        totalAmount: initialAmount || 0,
                        fileUrl,
                        notes: 'Initial version',
                    }
                } : undefined
            }
        })
        REVALIDATE()
        revalidatePath(`/admin/crm/leads/${leadId}`)
        return { success: true, proposal }
    } catch (e: any) {
        return { error: e.message }
    }
}

export async function updateProposalStatus(proposalId: string, status: string) {
    const { tenantId } = await getSession()
    const canEdit = await hasPermission('crm', 'createEdit')
    if (!canEdit) return { error: 'Unauthorized' }

    const valid = ['DRAFT', 'SENT', 'REVISION', 'ACCEPTED', 'REJECTED']
    if (!valid.includes(status)) return { error: 'Invalid status' }

    try {
        const proposal = await (db as any).proposal.update({
            where: { id: proposalId, tenantId },
            data: { currentStatus: status }
        })
        // If accepted, mark lead as converted
        if (status === 'ACCEPTED') {
            await (db as any).lead.update({
                where: { id: proposal.leadId },
                data: { status: 'CONVERTED' }
            })
        }
        REVALIDATE()
        revalidatePath(`/admin/crm/leads/${proposal.leadId}`)
        return { success: true }
    } catch (e: any) {
        return { error: e.message }
    }
}

/**
 * Adds a new revision to an existing proposal. Accepts FormData so the client
 * can pass a PDF file directly — the server uploads it to Google Drive.
 *
 * Required FormData fields: proposalId, leadId, totalAmount
 * Optional:  notes (string), pdfFile (File)
 */
export async function addProposalRevision(formData: FormData) {
    const { tenantId } = await getSession()
    const canEdit = await hasPermission('crm', 'createEdit')
    if (!canEdit) return { error: 'Unauthorized' }

    const proposalId = formData.get('proposalId') as string
    const leadId = formData.get('leadId') as string
    const totalAmount = parseFloat(formData.get('totalAmount') as string)
    const notes = (formData.get('notes') as string)?.trim() || undefined
    const pdfFile = formData.get('pdfFile') as File | null

    if (!proposalId || !leadId || isNaN(totalAmount)) {
        return { error: 'proposalId, leadId, and totalAmount are required' }
    }

    // Upload PDF to Drive (non-blocking on failure)
    let fileUrl: string | null = null
    if (pdfFile && pdfFile.size > 0) {
        fileUrl = await uploadProposalPdf(tenantId, leadId, pdfFile)
    }

    try {
        // Auto-increment revNumber
        const lastRev = await (db as any).proposalRevision.findFirst({
            where: { proposalId },
            orderBy: { revNumber: 'desc' }
        })
        const nextRev = (lastRev?.revNumber ?? -1) + 1

        await (db as any).proposalRevision.create({
            data: {
                tenantId,
                proposalId,
                revNumber: nextRev,
                fileUrl,
                totalAmount,
                notes: notes || null,
            }
        })
        // Auto-promote to REVISION status if it was SENT
        const proposal = await (db as any).proposal.findUnique({ where: { id: proposalId } })
        if (proposal?.currentStatus === 'SENT' && nextRev > 0) {
            await (db as any).proposal.update({
                where: { id: proposalId },
                data: { currentStatus: 'REVISION' }
            })
        }
        REVALIDATE()
        revalidatePath(`/admin/crm/leads/${leadId}`)
        return { success: true, revNumber: nextRev }
    } catch (e: any) {
        return { error: e.message }
    }
}

// ── Convert to Project ────────────────────────────────────────────────────

export async function convertToProject(proposalId: string) {
    const { tenantId } = await getSession()
    const canCreate = await hasPermission('projects', 'createEdit')
    if (!canCreate) return { error: 'Unauthorized' }

    try {
        // Load proposal with latest revision and lead
        const proposal = await (db as any).proposal.findUnique({
            where: { id: proposalId, tenantId },
            include: {
                lead: true,
                brand: true,
                revisions: { orderBy: { revNumber: 'desc' }, take: 1 }
            }
        })
        if (!proposal) return { error: 'Proposal not found' }
        if (proposal.currentStatus !== 'ACCEPTED') return { error: 'Only ACCEPTED proposals can be converted' }

        const lead = proposal.lead
        const brand = proposal.brand
        const latestRevision = proposal.revisions[0]
        const contractValue = latestRevision?.totalAmount || 0

        // 1. Find or create Client from Lead data
        const { findOrCreateClient } = await import('@/app/admin/crm/actions')
        const client = await findOrCreateClient(lead.name, {
            address: undefined,
            taxNumber: undefined,
        })

        // 2. Generate project code
        const year = new Date().getFullYear()
        const brandCode = brand.shortName || brand.nameEn.substring(0, 3).toUpperCase()
        const lastProject = await (db as any).project.findFirst({
            where: { brandId: brand.id, year },
            orderBy: { sequence: 'desc' }
        })
        const sequence = (lastProject?.sequence || 0) + 1
        const code = `${brandCode}-${year}-${sequence.toString().padStart(3, '0')}`

        // 3. Create Project
        const project = await (db as any).project.create({
            data: {
                tenantId,
                name: proposal.title,
                code,
                brandId: brand.id,
                clientId: client.id,
                legacyClientName: lead.name,
                contractValue,
                year,
                sequence,
                serviceType: 'DESIGN',
                status: 'ACTIVE',
            }
        })

        // 4. Mark lead as CONVERTED
        await (db as any).lead.update({
            where: { id: lead.id },
            data: { status: 'CONVERTED' }
        })

        REVALIDATE()
        revalidatePath('/admin/projects')
        return { success: true, projectId: project.id, projectCode: code }
    } catch (e: any) {
        return { error: e.message }
    }
}
