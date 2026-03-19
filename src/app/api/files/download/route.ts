import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { getDrive } from "@/lib/google-drive"
import { checkPermission } from "@/lib/rbac"

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams
    const fileId = searchParams.get('fileId')
    const entityType = searchParams.get('type') // 'DRAWING', 'HR', 'FINANCE', 'GENERAL'
    const entityId = searchParams.get('entityId') // e.g. drawingId or projectId

    if (!fileId) {
        return new NextResponse("File ID missing", { status: 400 })
    }

    const session = await auth()
    const user = session?.user

    if (!user) {
        return new NextResponse("Unauthorized", { status: 401 })
    }

    let isAuthorized = false
    let auditDetails = `Attempted to access fileId: ${fileId}`

    try {
        // DOUBLE VERIFICATION ENGINE
        const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes((user as any).role)

        if (isAdmin) {
            isAuthorized = true
            auditDetails = `Admin access granted to fileId: ${fileId}`
        } else if (entityType === 'DRAWING' && entityId) {
            // Check Engineering Access
            const drawing = await (db as any).drawing.findFirst({
                where: { id: entityId },
                include: { project: { include: { engineers: true } } }
            })

            if (!drawing) {
                auditDetails = `Drawing entity not found for fileId: ${fileId}`
            } else {
                const project = drawing.project
                const isAssigned = project.engineers.some((e: any) => e.id === user.id) || project.leadEngineerId === user.id
                if (isAssigned) {
                    isAuthorized = true
                    auditDetails = `Assigned engineer access granted to drawing fileId: ${fileId} in project ${project.code}`
                } else {
                    auditDetails = `Access denied: User not assigned to project ${project.code} for drawing fileId: ${fileId}`
                }
            }
        } else if (entityType === 'PROJECT' && entityId) {
            // Check Project Access
            const project = await (db as any).project.findUnique({
                where: { id: entityId },
                include: { engineers: true }
            })
            if (!project) {
                auditDetails = `Project entity not found for fileId: ${fileId}`
            } else {
                const isAssigned = project.engineers.some((e: any) => e.id === user.id) || project.leadEngineerId === user.id
                if (isAssigned) {
                    isAuthorized = true
                    auditDetails = `Assigned engineer access granted to project fileId: ${fileId} in project ${project.code}`
                } else {
                    auditDetails = `Access denied: User not assigned to project ${project.code} for project fileId: ${fileId}`
                }
            }
        } else if (entityType === 'FINANCE') {
            // Check Finance Access
            const canViewFinance = await checkPermission('FINANCE', 'read')
            if (canViewFinance) {
                isAuthorized = true
                auditDetails = `Finance access granted to fileId: ${fileId}`
            } else {
                auditDetails = `Access denied: Missing Finance permission for fileId: ${fileId}`
            }
        } else if (entityType === 'HR') {
            // Check HR Access
            const canViewHR = await checkPermission('HR', 'read')
            if (canViewHR) {
                isAuthorized = true
                auditDetails = `HR access granted to fileId: ${fileId}`
            } else {
                auditDetails = `Access denied: Missing HR permission for fileId: ${fileId}`
            }
        } else {
            auditDetails = `Unknown entity type or missing entityId for fileId: ${fileId}`
        }

        if (!isAuthorized) {
            await (db as any).auditLog.create({
                data: {
                    userId: user.id,
                    action: "UNAUTHORIZED_FILE_ACCESS",
                    details: auditDetails,
                    ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown"
                }
            })
            // Redirect to a specific unauthorized visual page if they pasted the URL
            return NextResponse.redirect(new URL('/unauthorized', req.url))
        }

        // FETCH RAW STREAM FROM GOOGLE DRIVE
        const tenantId = (user as any).tenantId
        const drive = await getDrive(tenantId)
        const meta = await drive.files.get({ fileId, fields: 'name, mimeType, size' })
        const response = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'stream' })

        // PIPE STREAM TO CLIENT
        const headers = new Headers()
        headers.set('Content-Disposition', `inline; filename="${meta.data.name || 'document'}"`)
        headers.set('Content-Type', meta.data.mimeType || 'application/octet-stream')
        if (meta.data.size) {
            headers.set('Content-Length', meta.data.size)
        }

        // Cast response.data to any because googleapis types for streams can clash with native ReadableStream
        return new NextResponse(response.data as any, {
            status: 200,
            headers,
        })

    } catch (e: any) {
        console.error("Secure Proxy Error:", e)
        return new NextResponse("Failed to fetch file securely.", { status: 500 })
    }
}
