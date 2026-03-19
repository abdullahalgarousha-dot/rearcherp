import { getEmployeeDashboardData } from "@/app/actions/employee-dashboard"
import { Employee360View } from "@/components/hr/Employee360View"
import { redirect } from "next/navigation"

export default async function EmployeeDashboardPage() {
    const res = await getEmployeeDashboardData()

    if ("error" in res) {
        if (res.error === "Unauthorized") {
            redirect("/login")
        }
        return (
            <div className="p-8 text-center bg-white rounded-3xl shadow-sm border border-slate-100 max-w-md mx-auto mt-20">
                <h2 className="text-2xl font-black text-slate-900 mb-2">Notice</h2>
                <p className="text-slate-500">{res.error}</p>
            </div>
        )
    }

    return <Employee360View data={res.data} />
}
