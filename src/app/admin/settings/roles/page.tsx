import { redirect } from "next/navigation"

export default function DeprecatedRolesPage() {
    redirect("/admin/roles")
}
