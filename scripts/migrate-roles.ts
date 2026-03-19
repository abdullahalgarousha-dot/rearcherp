import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const MATRIX_SUPER_ADMIN = {
    projects: { view: 'ALL', createEdit: true, approve: true, delete: true, canAccessDrive: true },
    supervision: { view: 'ALL', manageDSR: true, manageIR: true, manageNCR: true, deleteReports: true },
    hr: { view: 'ALL_BRANCHES', createEdit: true, approveLeaves: true, delete: true, viewOfficialDocs: true, viewMedicalLeaves: true },
    finance: { masterVisible: true, viewContracts: true, viewVATReports: true, viewSalarySheets: true, manageLoans: true }
};

const MATRIX_HR_MANAGER = {
    projects: { view: 'NONE', createEdit: false, approve: false, delete: false, canAccessDrive: false },
    supervision: { view: 'NONE', manageDSR: false, manageIR: false, manageNCR: false, deleteReports: false },
    hr: { view: 'ALL_BRANCHES', createEdit: true, approveLeaves: true, delete: false, viewOfficialDocs: true, viewMedicalLeaves: true },
    finance: { masterVisible: true, viewContracts: false, viewVATReports: false, viewSalarySheets: false, manageLoans: true }
};

const MATRIX_ACCOUNTANT = {
    projects: { view: 'ASSIGNED', createEdit: false, approve: false, delete: false, canAccessDrive: false },
    supervision: { view: 'NONE', manageDSR: false, manageIR: false, manageNCR: false, deleteReports: false },
    hr: { view: 'NONE', createEdit: false, approveLeaves: false, delete: false, viewOfficialDocs: false, viewMedicalLeaves: false },
    finance: { masterVisible: true, viewContracts: true, viewVATReports: true, viewSalarySheets: true, manageLoans: true }
};

const MATRIX_ENGINEER = {
    projects: { view: 'ASSIGNED', createEdit: true, approve: false, delete: false, canAccessDrive: true },
    supervision: { view: 'ASSIGNED', manageDSR: true, manageIR: true, manageNCR: true, deleteReports: false },
    hr: { view: 'ASSIGNED_BRANCH', createEdit: false, approveLeaves: false, delete: false, viewOfficialDocs: false, viewMedicalLeaves: false },
    finance: { masterVisible: false, viewContracts: false, viewVATReports: false, viewSalarySheets: false, manageLoans: false }
};

const ROLES_TO_SEED = [
    { name: 'SUPER_ADMIN', desc: 'Highest system access.', matrix: MATRIX_SUPER_ADMIN },
    { name: 'HR_MANAGER', desc: 'Manages HR & Balances.', matrix: MATRIX_HR_MANAGER },
    { name: 'ACCOUNTANT', desc: 'Manages overall Finance.', matrix: MATRIX_ACCOUNTANT },
    { name: 'SITE_ENGINEER', desc: 'Core engineer assigned to projects.', matrix: MATRIX_ENGINEER },
    { name: 'PROJECT_MANAGER', desc: 'Manages assigned projects.', matrix: MATRIX_SUPER_ADMIN } // Simplified for now
];

async function main() {
    console.log("Starting Migration...");

    // 1. Create the base roles
    for (const r of ROLES_TO_SEED) {
        await prisma.role.upsert({
            where: { name: r.name },
            create: {
                name: r.name,
                description: r.desc,
                permissionMatrix: JSON.stringify(r.matrix)
            },
            update: {
                // Keep description, update matrix to ensure fresh defaults
                permissionMatrix: JSON.stringify(r.matrix)
            }
        });
        console.log(`Upserted Role ${r.name}`);
    }

    // 2. Fetch Users
    const users = await prisma.user.findMany({ include: { profile: true } });

    // 3. Map Users to Dynamic Roles
    for (const user of users) {
        let targetRoleName = user.role; // Default fallback to their static role string
        if (targetRoleName === 'ADMIN') targetRoleName = 'SUPER_ADMIN';
        if (targetRoleName === 'HR') targetRoleName = 'HR_MANAGER';

        // Attempt resolving by position if available in new HR
        if (user.profile && user.profile.position) {
            const pos = user.profile.position.toUpperCase().replace(/\s+/g, '_');

            // Check if this physical position exists as a Role object yet
            const existingRole = await prisma.role.findUnique({ where: { name: pos } });

            if (existingRole) {
                targetRoleName = pos;
            } else {
                // Auto-create a template Role based on their position for later editing
                const defaultMatrix = targetRoleName === 'SUPER_ADMIN' ? MATRIX_SUPER_ADMIN : targetRoleName === 'HR_MANAGER' ? MATRIX_HR_MANAGER : targetRoleName === 'ACCOUNTANT' ? MATRIX_ACCOUNTANT : MATRIX_ENGINEER;

                await prisma.role.create({
                    data: {
                        name: pos,
                        description: `Auto-generated role for position ${user.profile.position}`,
                        permissionMatrix: JSON.stringify(defaultMatrix)
                    }
                });
                console.log(`Created new custom Job Title Role: ${pos}`);
                targetRoleName = pos;
            }
        }

        const resolvedRole = await prisma.role.findUnique({ where: { name: targetRoleName } });
        if (resolvedRole) {
            await prisma.user.update({
                where: { id: user.id },
                data: { roleId: resolvedRole.id }
            });
            console.log(`Linked user ${user.email} to Role ${targetRoleName}`);
        }
    }

    console.log("Migration Complete.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
