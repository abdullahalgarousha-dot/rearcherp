export function formatRoleName(roleName: string) {
    if (!roleName) return "Unknown Role"
    // Handle specific hardcoded roles if needed, otherwise title case it
    switch (roleName) {
        case "SUPER_ADMIN": return "Super Admin"
        case "ADMIN": return "Admin"
        case "PM": return "Project Manager"
        case "HR": return "Human Resources"
        default:
            return roleName.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')
    }
}
