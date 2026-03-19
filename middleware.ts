import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// TEMPORARY: All middleware logic commented out for debugging.
// If /super-admin loads now, the issue was in the middleware logic.
// If it still 500s, the issue is inside the page/layout itself.
export function middleware(req: NextRequest) {
    return NextResponse.next()
}

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
