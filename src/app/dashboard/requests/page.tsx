import { auth } from "@/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { RequestsClient } from "./client"

export default async function EmployeeRequestsPage() {
    const session = await auth()
    const userId = (session?.user as any)?.id

    if (!userId) redirect('/login')

    // Fetch user's profile and current pending requests
    const user = await db.user.findUnique({
        where: { id: userId },
        include: {
            profile: true,
            leaveRequests: {
                orderBy: { createdAt: 'desc' },
                take: 5
            }
        }
    })

    if (!user || !user.profile) {
        return <div className="p-8 text-center text-red-500 font-bold">يرجى استكمال ملف الموظف الخاص بك أولاً.</div>
    }

    const loans = await db.loanRequest.findMany({
        where: { profileId: user.profile.id },
        orderBy: { createdAt: 'desc' },
        take: 5
    })

    const documents = await db.documentRequest.findMany({
        where: { profileId: user.profile.id },
        orderBy: { createdAt: 'desc' },
        take: 5
    })

    return (
        <RequestsClient
            leaves={user.leaveRequests}
            loans={loans}
            documents={documents}
            leaveBalance={user.profile.leaveBalance}
        />
    )
}
