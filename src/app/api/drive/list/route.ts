import { NextRequest, NextResponse } from "next/server";
import { listDriveFiles } from "@/lib/google-drive";
import { auth } from "@/auth";

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const folderId = searchParams.get("folderId");

    if (!folderId) return NextResponse.json({ error: "Missing folderId" }, { status: 400 });

    try {
        const tenantId = (session.user as any).tenantId
        const files = await listDriveFiles(tenantId, folderId);
        return NextResponse.json({ files });
    } catch (error) {
        console.error("Error listing Drive files:", error);
        return NextResponse.json({ error: "Failed to list files" }, { status: 500 });
    }
}
