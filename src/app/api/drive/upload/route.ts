import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getEdcPendingFolder, getResumableSessionURI } from "@/lib/google-drive"

export async function POST(req: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await req.json()
        const { projectId, fileName, mimeType } = body

        if (!projectId || !fileName || !mimeType) {
            return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
        }

        // 1. Get the target Pending_Review folder for this project
        const tenantId = (session.user as any).tenantId
        const pendingFolderId = await getEdcPendingFolder(tenantId, projectId)

        // 2. Generate a Resumable Session URI directly from Google Drive
        const uploadUrl = await getResumableSessionURI(tenantId, pendingFolderId, fileName, mimeType)

        // 3. Return this special URL to the client. 
        // The client will use pure fetch(uploadUrl, { method: 'PUT', body: FILE }) directly to Google.
        return NextResponse.json({ uploadUrl })
    } catch (e: any) {
        console.error("Failed to initiate resumable upload", e)
        return NextResponse.json({ error: e.message || "Failed to initiate upload" }, { status: 500 })
    }
}
