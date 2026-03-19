import { auth } from "@/auth"
import { NextResponse } from "next/server"

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN', 'GLOBAL_SUPER_ADMIN']

export async function GET() {
    const session = await auth()
    const role = (session?.user as any)?.role

    if (!session || !ADMIN_ROLES.includes(role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json({
        isLoggedIn: true,
        user: {
            id: (session.user as any).id,
            role,
            tenantId: (session.user as any).tenantId,
        },
        timestamp: new Date().toISOString()
    })
}
