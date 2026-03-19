import { auth } from "@/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { checkPermission } from "@/lib/rbac"
import { HRInboxClient } from "./client"

export default async function HRRequestsInboxPage() {
    const session = await auth()
    const userId = (session?.user as any)?.id

    if (!userId) redirect('/login')

    const isHR = await checkPermission('HR', 'approve')
    const isFinance = await checkPermission('FINANCE', 'approve')

    // Fetch current user's profile to get their profile ID
    const myProfile = await db.employeeProfile.findUnique({
        where: { userId }
    })

    // A manager is anyone who has subordinates pointing to their profile ID
    const subordinateCount = myProfile ? await db.employeeProfile.count({
        where: { directManagerId: myProfile.id }
    }) : 0

    const isManager = subordinateCount > 0

    if (!isHR && !isManager && !isFinance && session?.user?.email !== "admin@fts.com") {
        redirect("/dashboard/employee")
    }

    // 1. Fetch Leaves
    const leaves = await db.leaveRequest.findMany({
        where: {
            // Managers see only their subordinates. HR sees everything.
            ...(isHR ? {} : { user: { profile: { directManagerId: myProfile?.id } } }),
            status: { notIn: ['APPROVED', 'REJECTED'] }
        },
        include: {
            user: { select: { name: true, profile: { select: { department: true, employeeCode: true } } } }
        },
        orderBy: { createdAt: 'desc' }
    })

    // 2. Fetch Loans
    const loans = await db.loanRequest.findMany({
        where: {
            ...(isHR || isFinance ? {} : { profile: { directManagerId: myProfile?.id } }),
            status: { notIn: ['APPROVED', 'REJECTED'] }
        },
        include: {
            profile: { select: { user: { select: { name: true } }, department: true, employeeCode: true } }
        },
        orderBy: { createdAt: 'desc' }
    })

    // 3. Fetch Documents
    const documents = await db.documentRequest.findMany({
        where: {
            ...(isHR ? {} : { profile: { directManagerId: myProfile?.id } }),
            status: { notIn: ['APPROVED', 'REJECTED'] }
        },
        include: {
            profile: { select: { user: { select: { name: true } }, department: true } }
        },
        orderBy: { createdAt: 'desc' }
    })


    return (
        <div className="p-4 md:p-8 rtl:text-right max-w-7xl mx-auto pb-24 font-sans">
            <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-2">صندوق الطلبات والموافقات</h1>
            <p className="text-slate-500 font-medium mb-8">إدارة واعتماد طلبات الإجازات، السلف، والخطابات الخاصة بالموظفين.</p>

            <HRInboxClient
                leaves={leaves}
                loans={loans}
                documents={documents}
                isHR={isHR || session?.user?.email === "admin@fts.com"}
                isFinance={isFinance || session?.user?.email === "admin@fts.com"}
            />
        </div>
    )
}
