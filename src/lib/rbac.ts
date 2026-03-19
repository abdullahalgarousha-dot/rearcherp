import { auth } from "@/auth"
import { db } from "@/lib/db"

export interface PermissionMatrix {
    projects: {
        view: 'ALL' | 'ASSIGNED' | 'NONE';
        createEdit: boolean;
        approve: boolean;
        delete: boolean;
        canAccessDrive: boolean;
    };
    supervision: {
        view: 'ALL' | 'ASSIGNED' | 'NONE';
        manageDSR: boolean;
        manageIR: boolean;
        manageNCR: boolean;
        approve: boolean;
        deleteReports: boolean;
    };
    hr: {
        view: 'ALL_BRANCHES' | 'ASSIGNED_BRANCH' | 'NONE';
        createEdit: boolean;
        approveLeaves: boolean;
        delete: boolean;
        viewOfficialDocs: boolean;
        viewMedicalLeaves: boolean;
    };
    finance: {
        masterVisible: boolean;
        viewContracts: boolean;
        viewVATReports: boolean;
        viewSalarySheets: boolean;
        manageLoans: boolean;
        canApproveFinance: boolean; // New: Authorization toggle for VOs, Petty Cash, Vendor payments
    };
    system: {
        manageSettings: boolean;
        manageRoles: boolean;
        viewLogs: boolean;
        viewAnalytics: boolean;
    };
    crm: {
        view: boolean;
        createEdit: boolean;
        delete: boolean;
    };
}

export const SUPER_ADMIN_PERMISSIONS: PermissionMatrix = {
    projects: { view: 'ALL', createEdit: true, approve: true, delete: true, canAccessDrive: true },
    supervision: { view: 'ALL', manageDSR: true, manageIR: true, manageNCR: true, approve: true, deleteReports: true },
    hr: { view: 'ALL_BRANCHES', createEdit: true, approveLeaves: true, delete: true, viewOfficialDocs: true, viewMedicalLeaves: true },
    finance: { masterVisible: true, viewContracts: true, viewVATReports: true, viewSalarySheets: true, manageLoans: true, canApproveFinance: true },
    system: { manageSettings: true, manageRoles: true, viewLogs: true, viewAnalytics: true },
    crm: { view: true, createEdit: true, delete: true }
};

export const DEFAULT_DENY_PERMISSIONS: PermissionMatrix = {
    projects: { view: 'NONE', createEdit: false, approve: false, delete: false, canAccessDrive: false },
    supervision: { view: 'NONE', manageDSR: false, manageIR: false, manageNCR: false, approve: false, deleteReports: false },
    hr: { view: 'NONE', createEdit: false, approveLeaves: false, delete: false, viewOfficialDocs: false, viewMedicalLeaves: false },
    finance: { masterVisible: false, viewContracts: false, viewVATReports: false, viewSalarySheets: false, manageLoans: false, canApproveFinance: false },
    system: { manageSettings: false, manageRoles: false, viewLogs: false, viewAnalytics: false },
    crm: { view: false, createEdit: false, delete: false }
};

export const PROJECT_MANAGER_PERMISSIONS: PermissionMatrix = {
    ...DEFAULT_DENY_PERMISSIONS,
    projects: { view: 'ALL', createEdit: true, approve: true, delete: false, canAccessDrive: true },
    supervision: { view: 'ALL', manageDSR: true, manageIR: true, manageNCR: true, approve: true, deleteReports: false },
    hr: { view: 'ASSIGNED_BRANCH', createEdit: false, approveLeaves: false, delete: false, viewOfficialDocs: false, viewMedicalLeaves: false },
    crm: { view: true, createEdit: true, delete: false },
};

export const SITE_ENGINEER_PERMISSIONS: PermissionMatrix = {
    ...DEFAULT_DENY_PERMISSIONS,
    projects: { view: 'ASSIGNED', createEdit: false, approve: false, delete: false, canAccessDrive: true },
    supervision: { view: 'ALL', manageDSR: true, manageIR: true, manageNCR: true, approve: false, deleteReports: false },
};

export const FINANCE_PERMISSIONS: PermissionMatrix = {
    ...DEFAULT_DENY_PERMISSIONS,
    finance: { masterVisible: true, viewContracts: true, viewVATReports: true, viewSalarySheets: true, manageLoans: true, canApproveFinance: true },
};

export const HR_PERMISSIONS: PermissionMatrix = {
    ...DEFAULT_DENY_PERMISSIONS,
    hr: { view: 'ALL_BRANCHES', createEdit: true, approveLeaves: true, delete: false, viewOfficialDocs: true, viewMedicalLeaves: true },
};

const ROLE_PERMISSIONS_MAP: Record<string, PermissionMatrix> = {
    'ADMIN': SUPER_ADMIN_PERMISSIONS,
    'SUPER_ADMIN': SUPER_ADMIN_PERMISSIONS,
    'GLOBAL_SUPER_ADMIN': SUPER_ADMIN_PERMISSIONS,
    'PROJECT_MANAGER': PROJECT_MANAGER_PERMISSIONS,
    'PM': PROJECT_MANAGER_PERMISSIONS,
    'SITE_ENGINEER': SITE_ENGINEER_PERMISSIONS,
    'FINANCE': FINANCE_PERMISSIONS,
    'ACCOUNTANT': FINANCE_PERMISSIONS,
    'HR': HR_PERMISSIONS,
    'HR_MANAGER': HR_PERMISSIONS,
};

// --- NEW DYNAMIC PERMISSION CHECKER ---
export async function hasPermission<K extends keyof PermissionMatrix>(
    module: K,
    action: keyof PermissionMatrix[K]
): Promise<PermissionMatrix[K][keyof PermissionMatrix[K]]> {
    const session = await auth()

    if (!session || !session.user) {
        return DEFAULT_DENY_PERMISSIONS[module][action];
    }

    const user = session.user as any
    const role = user.role

    // Check custom permissions first if they exist
    const perms = user.permissions as PermissionMatrix | null
    if (perms && perms[module] && perms[module][action] !== undefined) {
        return perms[module][action]
    }

    // Role-based defaults
    const roleDefault = ROLE_PERMISSIONS_MAP[role as string]
    if (roleDefault && roleDefault[module] && roleDefault[module][action] !== undefined) {
        return roleDefault[module][action]
    }

    // Default deny if matrix not found
    return DEFAULT_DENY_PERMISSIONS[module][action]
}

// --- LEGACY BACKWARDS COMPATIBILITY ---
export type ModuleName = 'HR' | 'FINANCE' | 'PROJECTS' | 'SUPERVISION' | 'USERS' | 'ROLES' | 'SETTINGS' | 'LOGS' | 'ANALYTICS'
export type ActionType = 'read' | 'write' | 'approve'

export async function checkPermission(module: ModuleName, action: ActionType): Promise<boolean> {
    const session = await auth()
    if (!session || !session.user) return false

    const user = session.user as any
    const role = user.role

    // Check custom permissions first
    let perms = user.permissions as PermissionMatrix | null

    // If no custom perms, use role-based defaults
    if (!perms) {
        perms = ROLE_PERMISSIONS_MAP[role as string] || DEFAULT_DENY_PERMISSIONS
    }

    if (perms) {
        switch (module) {
            case 'FINANCE':
                if (action === 'read') return perms.finance?.masterVisible === true;
                if (action === 'approve') return perms.finance?.canApproveFinance === true || perms.finance?.manageLoans === true;
                if (action === 'write') return perms.finance?.masterVisible === true;
                break;
            case 'HR':
                if (action === 'read') return perms.hr?.view !== 'NONE';
                if (action === 'write') return perms.hr?.createEdit === true;
                if (action === 'approve') return perms.hr?.approveLeaves === true;
                break;
            case 'PROJECTS':
                if (action === 'read') return perms.projects?.view !== 'NONE';
                if (action === 'write') return perms.projects?.createEdit === true;
                if (action === 'approve') return perms.projects?.approve === true;
                break;
            case 'SUPERVISION':
                if (action === 'read') return perms.supervision?.view !== 'NONE';
                if (action === 'write') return perms.supervision?.manageDSR === true;
                if (action === 'approve') return perms.supervision?.manageDSR === true;
                break;
            case 'SETTINGS':
                return perms.system?.manageSettings === true;
            case 'ROLES':
            case 'USERS':
                return perms.system?.manageRoles === true;
            case 'LOGS':
                return perms.system?.viewLogs === true;
            case 'ANALYTICS':
                return perms.system?.viewAnalytics === true;
        }
    }

    try {
        const permission = await (db as any).rolePermission.findUnique({
            where: {
                roleName_module: {
                    roleName: role,
                    module: module
                }
            }
        })

        if (!permission) return false

        switch (action) {
            case 'read': return permission.canRead
            case 'write': return permission.canWrite
            case 'approve': return permission.canApprove
            default: return false
        }
    } catch {
        return false;
    }
}

export async function hasAnyPermission(modules: ModuleName[], action: ActionType): Promise<boolean> {
    for (const module of modules) {
        if (await checkPermission(module, action)) return true
    }
    return false
}
