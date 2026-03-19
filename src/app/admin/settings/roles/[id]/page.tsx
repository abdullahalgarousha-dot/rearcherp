import { redirect } from "next/navigation"

export default function DeprecatedRolesIdPage() {
    redirect("/admin/roles")
}
