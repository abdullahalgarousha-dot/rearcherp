'use server'

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { checkPermission, hasPermission } from "@/lib/rbac"
import bcrypt from "bcryptjs"
import fs from "fs/promises"
import path from "path"

/**
 * PHASE 1: UNIFIED HR LOGIC
 */

import { checkAuth } from "@/lib/auth-guard"
import { initializeEmployeeDriveStructure, uploadSmartFileToDrive } from "@/lib/google-drive"

/**
 * PHASE 1: UNIFIED HR LOGIC
 */

export async function submitRequest(type: 'LEAVE' | 'LOAN' | 'DOCUMENT' | 'COMPLAINT', data: any) {
    const user = await checkAuth(['ALL']) // Allow any authenticated employee
    const userId = user.id

    try {
        const profile = await (db as any).employeeProfile.findUnique({
            where: { userId },
            include: { directManager: true }
        })

        if (!profile) return { error: "Employee Profile not found. Please contact HR." }

        const initialStatus = profile.directManagerId ? "PENDING_MANAGER" : "PENDING_HR"

        if (type === 'LEAVE') {
            const { startDate, endDate, leaveType, reason } = data

            // Check Balance
            const days = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
            if (leaveType === 'ANNUAL' && profile.leaveBalance < days) {
                return { error: `Insufficient leave balance (${profile.leaveBalance} days left)` }
            }

            await (db as any).leaveRequest.create({
                data: {
                    userId,
                    type: leaveType,
                    startDate: new Date(startDate),
                    endDate: new Date(endDate),
                    reason,
                    status: leaveType === 'SICK' ? 'PENDING_ATTACHMENT' : initialStatus
                }
            })
        } else if (type === 'LOAN') {
            const { amount, installments, reason } = data
            const parsedInstallments = parseInt(installments)
            const parsedAmount = parseFloat(amount)
            if (parsedInstallments <= 0) return { error: "Installments must be at least 1" }
            if (parsedAmount <= 0) return { error: "Loan amount must be greater than zero" }
            await (db as any).loanRequest.create({
                data: {
                    profileId: profile.id,
                    amount: parsedAmount,
                    installments: parsedInstallments,
                    monthlyDeduction: parsedAmount / parsedInstallments,
                    reason,
                    status: initialStatus
                }
            })
        } else if (type === 'DOCUMENT') {
            const { docType, details } = data
            await (db as any).documentRequest.create({
                data: {
                    profileId: profile.id,
                    type: docType,
                    details,
                    status: initialStatus
                }
            })
        } else if (type === 'COMPLAINT') {
            const { subject, details } = data
            await (db as any).complaint.create({
                data: {
                    profileId: profile.id,
                    subject,
                    details,
                    status: "PENDING"
                }
            })
        }

        revalidatePath('/dashboard/employee')
        revalidatePath('/admin/hr/requests')
        return { success: true }
    } catch (e) {
        console.error(e)
        return { error: "Submission failed" }
    }
}

export const submitUnifiedRequest = submitRequest;


export async function processRequest(requestId: string, decision: 'APPROVE' | 'REJECT', role: 'MANAGER' | 'HR' | 'FINANCE', reason?: string) {
    const user = await checkAuth(['ADMIN', 'HR_MANAGER', 'FINANCE_MANAGER', 'PM'])
    const isAdmin = ['GLOBAL_SUPER_ADMIN', 'SUPER_ADMIN', 'ADMIN'].includes(user.role)

    // Fine-grained permission checks
    if (role === 'HR') {
        const canApprove = await hasPermission('hr', 'approveLeaves')
        if (!canApprove && !isAdmin) return { error: "Unauthorized: Requires HR approval permission" }
    }
    if (role === 'FINANCE') {
        const canFin = await hasPermission('finance', 'canApproveFinance')
        if (!canFin && !isAdmin) return { error: "Unauthorized: Requires Finance approval permission" }
    }

    try {
        await (db as any).$transaction(async (tx: any) => {
            // Find request in any table (Leave, Loan, or Doc)
            const [leave, loan, doc] = await Promise.all([
                tx.leaveRequest.findUnique({ where: { id: requestId }, include: { user: { include: { profile: true } } } }),
                tx.loanRequest.findUnique({ where: { id: requestId }, include: { profile: true } }),
                tx.documentRequest.findUnique({ where: { id: requestId }, include: { profile: true } })
            ])

            const request = leave || loan || doc
            const type = leave ? 'LEAVE' : loan ? 'LOAN' : 'DOCUMENT'
            if (!request) throw new Error("Request not found")

            if (decision === 'REJECT') {
                const update = { status: 'REJECTED', rejectionReason: reason || "Rejected by " + role }
                if (leave) await tx.leaveRequest.update({ where: { id: requestId }, data: update })
                if (loan) await tx.loanRequest.update({ where: { id: requestId }, data: update })
                if (doc) await tx.documentRequest.update({ where: { id: requestId }, data: update })
                return
            }

            // APPROVAL STATE MACHINE
            let nextStatus = request.status
            const now = new Date()
            const auditTrail: any = {}

            // GOD MODE: Admins and Global HR bypass all checks
            const canApproveLeaves = await hasPermission('hr', 'approveLeaves')
            const isSuperAdmin = ['GLOBAL_SUPER_ADMIN', 'SUPER_ADMIN', 'ADMIN'].includes(user.role)

            if (isSuperAdmin || canApproveLeaves) {
                nextStatus = 'APPROVED'
                auditTrail.adminApprovedAt = now
                auditTrail.note = "Admin/HR Override"
            }
            // STANDARD WORKFLOW
            else if (request.status === 'PENDING_MANAGER') {
                nextStatus = 'PENDING_HR'
                auditTrail.managerApprovedAt = now
            } else if (request.status === 'PENDING_HR') {
                auditTrail.hrApprovedAt = now
                if (type === 'LOAN') {
                    nextStatus = 'PENDING_FINANCE'
                } else {
                    nextStatus = 'APPROVED'
                }
            } else if (request.status === 'PENDING_FINANCE') {
                auditTrail.financeApprovedAt = now
                nextStatus = 'APPROVED'
            }

            // Side Effects for APPROVED requests (Admin or Normal)
            // CRITICAL: Only run if status is CHANGING to APPROVED to avoid double deductions
            if (nextStatus === 'APPROVED' && request.status !== 'APPROVED') {
                // Deduct Leave Balance / Increment Used
                if (type === 'LEAVE' && leave) {
                    const days = Math.ceil((new Date(leave.endDate).getTime() - new Date(leave.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
                    const leaveType = leave.type as string // e.g. ANNUAL, SICK

                    const updateStats: any = {}
                    if (leaveType === 'ANNUAL') {
                        updateStats.annualLeaveUsed = { increment: days }
                        updateStats.annualLeaveTotal = { decrement: days }
                    } else if (leaveType === 'SICK') {
                        updateStats.sickLeaveUsed = { increment: days }
                        updateStats.sickLeaveTotal = { decrement: days }
                    } else if (leaveType === 'EMERGENCY') {
                        updateStats.emergencyLeaveUsed = { increment: days }
                        updateStats.emergencyLeaveTotal = { decrement: days }
                    }

                    await tx.employeeHRStats.update({
                        where: { profileId: leave.user.profile.id },
                        data: updateStats
                    })
                }

                // Create Active Loan record when fully approved
                if (type === 'LOAN' && loan) {
                    await tx.loan.create({
                        data: {
                            profileId: loan.profileId,
                            totalAmount: loan.amount,
                            paidAmount: 0,
                            monthlyInstallment: loan.monthlyDeduction,
                            status: 'ACTIVE'
                        }
                    })

                    // Financial Integration: Auto-create Debit (Expense) in Finance Ledger
                    await tx.expense.create({
                        data: {
                            category: "Active Loans",
                            description: `Loan Disbursement for ${loan.profile.user?.name || "Employee"} (Loan #${loan.id})`,
                            amountBeforeTax: loan.amount,
                            taxRate: 0, // No VAT on loans
                            taxAmount: 0,
                            totalAmount: loan.amount, // Full amount is disbursed
                            isTaxRecoverable: false,
                        }
                    });
                }
            }

            const updateData = { status: nextStatus, ...auditTrail }
            if (leave) await tx.leaveRequest.update({ where: { id: requestId }, data: updateData })
            if (loan) await tx.loanRequest.update({ where: { id: requestId }, data: updateData })
            if (doc) await tx.documentRequest.update({ where: { id: requestId }, data: updateData })
        })

        revalidatePath('/admin/hr/requests')
        revalidatePath('/dashboard/employee')
        return { success: true }

    } catch (e: any) {
        console.error("Process Request Error:", e)
        return { error: e.message || "Processing failed" }
    }
}



export async function createLeaveRequest(formData: FormData) {
    const user = await checkAuth(['ALL'])
    const userId = user.id

    const type = formData.get("type") as string
    const startStr = formData.get("startDate") as string
    const endStr = formData.get("endDate") as string
    const reason = formData.get("reason") as string

    if (!startStr || !endStr) {
        return { error: "Dates are required" }
    }

    const startDate = new Date(startStr)
    const endDate = new Date(endStr)

    // 1. Validate Dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return { error: "Invalid dates provided" }
    }

    // Normalize to YYYY-MM-DD for comparison to avoid time issues
    const startValue = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).getTime()
    const endValue = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()).getTime()

    if (endValue < startValue) {
        return { error: "End date cannot be before start date" }
    }

    const requestedDays = Math.ceil((endValue - startValue) / (1000 * 60 * 60 * 24)) + 1

    try {
        // 2. Fetch User with HR Stats to check balance
        const user = await (db as any).user.findUnique({
            where: { id: userId },
            include: { profile: { include: { hrStats: true } } }
        })

        if (!user) return { error: "User not found" }
        if (!user.profile) return { error: "Employee profile not found" }
        if (!user.profile.hrStats) return { error: "HR Statistics not found" }

        // 3. Check Balance for Annual Leave
        if (type === 'ANNUAL') {
            const balance = user.profile.hrStats.annualLeaveTotal // Assuming this represents remaining if we decrement it
            if (balance < requestedDays) {
                return { error: `Insufficient leave balance. You have ${balance} days, but requested ${requestedDays} days.` }
            }
        } else if (type === 'SICK') {
            const balance = user.profile.hrStats.sickLeaveTotal
            if (balance < requestedDays) {
                return { error: `Insufficient sick leave balance. You have ${balance} days left.` }
            }
        }

        // 4. Create Request
        const initialStatus = type === 'SICK' ? 'PENDING_ATTACHMENT' : 'PENDING'

        await (db as any).leaveRequest.create({
            data: {
                userId,
                type,
                startDate,
                endDate,
                reason,
                status: initialStatus
            }
        })
        revalidatePath('/admin/hr/leaves')
        return { success: true }
    } catch (e) {
        console.error(e)
        return { error: "Failed to create request" }
    }
}

export async function uploadMedicalReport(requestId: string, formData: FormData) {
    const user = await checkAuth(['ALL']); // Must be the user themselves or HR

    try {
        const file = formData.get("file") as File;
        if (!file || file.size === 0) return { error: "No file provided" };

        const request = await (db as any).leaveRequest.findUnique({
            where: { id: requestId },
            include: { user: { include: { profile: { include: { assignedBranch: true } } } } }
        });

        if (!request) return { error: "Request not found" };
        if (request.status !== 'PENDING_ATTACHMENT') return { error: "Request is not waiting for an attachment" };

        // Authorization: Only the requester or HR/Admin can upload
        const canManageHR = await hasPermission('hr', 'createEdit')
        const isSuperAdmin = ['GLOBAL_SUPER_ADMIN', 'SUPER_ADMIN', 'ADMIN'].includes(user.role)
        if (request.userId !== user.id && !canManageHR && !isSuperAdmin) {
            return { error: "Unauthorized to upload for this request" };
        }

        const profile = request.user?.profile;
        if (!profile) return { error: "Employee profile not found" };

        const branchName = profile.assignedBranch?.nameEn || profile.legacyBranch || "Unassigned";
        const employeeName = request.user.name || "Unknown";

        // Path matches the hierarchy: Employees > Branch > Employee > Medical folder
        const targetPath = [
            'Employees - الموظفين',
            branchName,
            employeeName,
            'الإجازات والتقارير الطبية'
        ];

        const buffer = Buffer.from(await file.arrayBuffer());
        const safeFileName = `Medical_Report_${requestId}_${file.name}`;

        // Upload to Drive
        const tenantId = (user as any).tenantId
        const uploadResult = await uploadSmartFileToDrive(
            tenantId,
            buffer,
            safeFileName,
            file.type,
            targetPath
        );

        if (!uploadResult.webViewLink) throw new Error("Drive upload failed, no link returned.");

        // Update DB: attach link and progress status to normal PENDING (or PENDING_MANAGER)
        const newStatus = profile.directManagerId ? "PENDING_MANAGER" : "PENDING_HR";

        await (db as any).leaveRequest.update({
            where: { id: requestId },
            data: {
                attachmentLink: uploadResult.webViewLink,
                status: newStatus
            }
        });

        revalidatePath('/dashboard/employee');
        revalidatePath('/admin/hr/requests');
        return { success: true };
    } catch (error: any) {
        console.error("Medical Report Upload Error:", error);
        return { error: "Failed to upload report to Drive" };
    }
}

export async function updateLeaveStatus(requestId: string, status: string, rejectionReason?: string) {
    // Permission logic is complex here, keeping checkAuth generally and specific checks below
    const currentUser = await checkAuth(['ADMIN', 'HR', 'PM'])

    try {
        const request = await (db as any).leaveRequest.findUnique({
            where: { id: requestId },
            include: { user: { include: { profile: { include: { hrStats: true } } } } }
        })

        if (!request) return { error: "Request not found" }

        const updateData: any = { status }
        const userRole = currentUser.role

        if (status === 'REVIEWED') {
            updateData.reviewerId = currentUser.id
        } else if (status === 'APPROVED') {
            const canApprove = await hasPermission('hr', 'approveLeaves')
            const isSuperAdmin = ['GLOBAL_SUPER_ADMIN', 'SUPER_ADMIN', 'ADMIN'].includes(userRole)
            // Allow ADMIN, HR, and PM to approve
            if (!canApprove && !isSuperAdmin) {
                return { error: "Unauthorized to approve" }
            }
            updateData.approverId = currentUser.id

            // Subtract days from balance and update statistics
            const startValue = new Date(request.startDate).getTime()
            const endValue = new Date(request.endDate).getTime()
            const days = Math.ceil((endValue - startValue) / (1000 * 60 * 60 * 24)) + 1
            const leaveType = request.type as string

            if (request.user?.profile?.id) {
                const updateStats: any = {}
                if (leaveType === 'ANNUAL') {
                    updateStats.annualLeaveUsed = { increment: days }
                    updateStats.annualLeaveTotal = { decrement: days }
                } else if (leaveType === 'SICK') {
                    updateStats.sickLeaveUsed = { increment: days }
                    updateStats.sickLeaveTotal = { decrement: days }
                } else if (leaveType === 'EMERGENCY') {
                    updateStats.emergencyLeaveUsed = { increment: days }
                    updateStats.emergencyLeaveTotal = { decrement: days }
                }

                await (db as any).employeeHRStats.upsert({
                    where: { profileId: request.user.profile.id },
                    create: {
                        profileId: request.user.profile.id,
                        ...updateStats,
                        annualLeaveTotal: 30, // Default for new records
                        sickLeaveTotal: 12,
                        emergencyLeaveTotal: 5,
                        remoteDaysTotal: 12,
                        exitPermitsTotal: 10,
                    },
                    update: updateStats
                })

                // Also update legacy field if still used for anything
                await (db as any).employeeProfile.update({
                    where: { id: request.user.profile.id },
                    data: { leaveBalance: { decrement: days } }
                })
            }
        } else if (status === 'REJECTED') {
            if (rejectionReason) {
                updateData.rejectionReason = rejectionReason
            }
        }

        await (db as any).leaveRequest.update({
            where: { id: requestId },
            data: updateData
        })

        revalidatePath('/admin/hr/leaves')
        return { success: true }
    } catch (e) {
        console.error(e)
        return { error: "Failed to update status" }
    }
}

export async function updateStaffProfile(staffId: string, formData: FormData) {
    const isAllowed = await hasPermission('hr', 'createEdit')
    if (!isAllowed) return { error: "Unauthorized: Requires HR Write Permission" }

    const session = await auth()
    const currentUser = session?.user as any
    const isSuperAdmin = ['GLOBAL_SUPER_ADMIN', 'SUPER_ADMIN'].includes(currentUser?.role ?? '')

    const data: any = {}

    // Helper to safely parse dates
    const safeDate = (val: FormDataEntryValue | null) => {
        if (!val || val === '') return null
        const d = new Date(val as string)
        return isNaN(d.getTime()) ? null : d
    }

    // Helper to safely parse floats
    const safeFloat = (val: FormDataEntryValue | null) => {
        if (!val || val === '') return 0
        const n = parseFloat(val as string)
        return isNaN(n) ? 0 : n
    }

    // Helper to safely parse ints
    const safeInt = (val: FormDataEntryValue | null) => {
        if (!val || val === '') return 0
        const n = parseInt(val as string)
        return isNaN(n) ? 0 : n
    }

    // Identity
    if (formData.has("name")) data.name = formData.get("name")
    if (formData.has("nationality")) data.nationality = formData.get("nationality")
    if (formData.has("googleEmail")) data.googleEmail = formData.get("googleEmail")
    if (formData.has("branchId")) data.branchId = formData.get("branchId")

    // Photo: handle file upload
    const photoEntry = formData.get("photo")
    if (photoEntry && typeof photoEntry !== "string" && (photoEntry as File).size > 0) {
        const file = photoEntry as File
        const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
        const filename = `${Date.now()}-${staffId}.${ext}`
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'avatars')
        await fs.mkdir(uploadDir, { recursive: true })
        const buffer = Buffer.from(await file.arrayBuffer())
        await fs.writeFile(path.join(uploadDir, filename), buffer)
        data.photo = `/uploads/avatars/${filename}`
    }
    if (formData.has("directManagerId")) {
        const val = formData.get("directManagerId") as string
        if (val && val !== "NONE") data.directManagerId = val
        if (val === "NONE") data.directManagerId = null
    }

    // Role & Access Scope — SUPER_ADMIN only; silently ignored for everyone else.
    // Also blocked if the admin is editing their own account (prevents self-demotion / lockout).
    const isSelfEdit = currentUser?.id === staffId
    if (isSuperAdmin && !isSelfEdit) {
        if (formData.has("roleId")) {
            const val = formData.get("roleId") as string
            data.roleId = val || null
        }
        if (formData.has("accessScope")) {
            const val = formData.get("accessScope") as string
            if (val === 'BRANCH' || val === 'ALL') data.accessScope = val
        }
    }

    // Legal
    if (formData.has("passportNumber")) data.passportNumber = formData.get("passportNumber")
    if (formData.has("passportIssueDate")) data.passportIssueDate = safeDate(formData.get("passportIssueDate"))
    if (formData.has("passportExpiryDate")) data.passportExpiryDate = safeDate(formData.get("passportExpiryDate"))
    if (formData.has("iqamaNumber")) data.iqamaNumber = formData.get("iqamaNumber")
    if (formData.has("iqamaExpiryDate")) data.iqamaExpiryDate = safeDate(formData.get("iqamaExpiryDate"))

    // Insurance
    if (formData.has("insuranceCompany")) data.insuranceCompany = formData.get("insuranceCompany")
    if (formData.has("policyNumber")) data.policyNumber = formData.get("policyNumber")
    if (formData.has("insuranceExpiryDate")) data.insuranceExpiryDate = safeDate(formData.get("insuranceExpiryDate"))

    // Contractual
    if (formData.has("basicSalary")) data.basicSalary = safeFloat(formData.get("basicSalary"))
    if (formData.has("housingAllowance")) data.housingAllowance = safeFloat(formData.get("housingAllowance"))
    if (formData.has("transportAllowance")) data.transportAllowance = safeFloat(formData.get("transportAllowance"))
    if (formData.has("otherAllowance")) data.otherAllowance = safeFloat(formData.get("otherAllowance"))
    if (formData.has("gosiDeduction")) data.gosiDeduction = safeFloat(formData.get("gosiDeduction"))
    if (formData.has("hireDate")) data.hireDate = safeDate(formData.get("hireDate"))
    if (formData.has("leaveBalance")) data.leaveBalance = safeInt(formData.get("leaveBalance"))

    try {
        const userUpdateData: any = { name: data.name }
        if (isSuperAdmin) {
            if (data.roleId !== undefined) userUpdateData.roleId = data.roleId
            if (data.accessScope !== undefined) userUpdateData.accessScope = data.accessScope
        }
        await (db as any).user.update({
            where: { id: staffId },
            data: userUpdateData,
        })

        // Update Profile
        await (db as any).employeeProfile.update({
            where: { userId: staffId },
            data: {
                nationality: data.nationality,
                googleEmail: data.googleEmail,
                branchId: data.branchId,
                directManagerId: data.directManagerId !== undefined ? data.directManagerId : undefined,
                photo: data.photo,
                passportNum: data.passportNumber,
                passportExpiry: data.passportExpiryDate,   // was missing
                idNumber: data.iqamaNumber,
                idExpiry: data.iqamaExpiryDate,
                insuranceProvider: data.insuranceCompany,
                insurancePolicy: data.policyNumber,
                insuranceExpiry: data.insuranceExpiryDate,
                basicSalary: data.basicSalary,
                housingAllowance: data.housingAllowance,
                transportAllowance: data.transportAllowance,
                otherAllowance: data.otherAllowance,
                gosiDeduction: data.gosiDeduction,
                hireDate: data.hireDate,
                leaveBalance: data.leaveBalance,
                // Derived computed field — kept in sync on every save
                totalSalary: (data.basicSalary || 0) + (data.housingAllowance || 0)
                    + (data.transportAllowance || 0) + (data.otherAllowance || 0)
            }
        })

        revalidatePath(`/admin/hr/staff/${staffId}`)
        revalidatePath('/admin/hr')
        return { success: true }
    } catch (e) {
        console.error("Update Staff Error:", e)
        return { error: "Update failed. Check server logs." }
    }
}

export async function createStaff(formData: FormData) {
    const session = await auth()
    const canCreate = await hasPermission('hr', 'createEdit')
    if (!canCreate) return { error: "Unauthorized: Requires HR Create Permission" }

    const tenantId = (session?.user as any).tenantId
    const name = formData.get("name") as string
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const branchId = formData.get("branchId") as string
    const salary = parseFloat(formData.get("salary") as string || "0")
    const roleId = formData.get("roleId") as string
    // department stores the SystemLookup `value` for the selected ENGINEERING_DISCIPLINE
    const department = formData.get("department") as string || "General"
    const directManagerId = formData.get("directManagerId") as string

    if (!roleId) return { error: "Role is required" }

    // Fetch Role to get correct names
    const roleRecord = await (db as any).role.findUnique({ where: { id: roleId } })
    if (!roleRecord) return { error: "Invalid role selected" }

    // Real password hashing with bcryptjs
    const hashedPassword = await bcrypt.hash(password, 10)

    try {
        const newUser = await (db as any).user.create({
            data: {
                tenantId,
                name,
                email,
                password: hashedPassword,
                role: roleRecord.name,
                roleId: roleRecord.id,
                profile: {
                    create: {
                        tenantId,
                        branchId,
                        department,
                        position: roleRecord.name,
                        basicSalary: salary,
                        directManagerId: directManagerId && directManagerId !== "NONE" ? directManagerId : undefined,
                        // Defaults
                        housingAllowance: 0,
                        transportAllowance: 0,
                        otherAllowance: 0,
                        totalSalary: salary,
                        leaveBalance: 21
                    }
                }
            }
        })
        // Fetch the created user to get the Branch name for Drive Init
        const createdUser = await (db as any).user.findUnique({
            where: { id: newUser.id },
            include: { profile: { include: { assignedBranch: true } } }
        });

        if (createdUser && createdUser.profile) {
            const branchName = createdUser.profile.assignedBranch?.nameEn || "Unassigned";
            try {
                await initializeEmployeeDriveStructure(tenantId, branchName, createdUser.name);
            } catch (err) {
                console.error("Failed to initialize Google Drive structure for new employee:", err);
                // Non-blocking error
            }

            // ── DEPARTMENTAL RULES HOOK ───────────────────────────────────────────
            // TODO: Apply department-specific defaults based on `department` value.
            // When this is implemented, look up a DepartmentRule record keyed by
            // (tenantId + department) and apply:
            //   - Default Drive subfolder path (e.g. "Architectural" → /Drive/Arch/)
            //   - Default PermissionMatrix overrides for the role
            //   - Default project assignment filters
            // Example entry point:
            //   const deptRule = await db.departmentRule.findFirst({ where: { tenantId, department } })
            //   if (deptRule) { await applyDepartmentDefaults(createdUser.profile.id, deptRule) }
            // ─────────────────────────────────────────────────────────────────────
        }

        revalidatePath('/admin/hr')
        return { success: true }
    } catch (e: any) {
        console.error(e)
        return { error: e.message || "Failed to create staff" }
    }
}

export async function deleteStaff(userId: string) {
    const currentUser = await checkAuth(['ADMIN', 'HR_MANAGER'])

    if (userId === currentUser.id) {
        return { error: "Cannot delete your own account" }
    }

    try {
        await (db as any).user.delete({
            where: { id: userId }
        })
        revalidatePath('/admin/hr')
        return { success: true }
    } catch (e: any) {
        console.error("Delete Error:", e)
        // Check for specific Prisma error codes if needed, mainly FK violations
        if (e.code === 'P2003') {
            return { error: "Cannot delete user: Associated data exists (Reports, Tasks, etc.)" }
        }
        return { error: "Failed to delete user" }
    }
}

/**
 * PHASE 2: HR BRAIN ACTIVATION (CONTROL ACTIONS)
 */

export async function updateAttendance(profileId: string, data: { workHoursMonth: number, lateMinutes: number, absentDays: number }) {
    const isAllowed = await checkPermission('HR', 'write')
    if (!isAllowed) return { error: "Unauthorized: Requires HR Write Permission" }

    try {
        await (db as any).employeeHRStats.upsert({
            where: { profileId },
            create: {
                profileId,
                workHoursMonth: data.workHoursMonth,
                lateMinutes: data.lateMinutes,
                absentDays: data.absentDays,
                targetHours: 180, // Default
                maxLateAllowed: 60
            },
            update: {
                workHoursMonth: data.workHoursMonth,
                lateMinutes: data.lateMinutes,
                absentDays: data.absentDays
            }
        })

        revalidatePath('/admin/hr')
        revalidatePath('/dashboard/employee')
        return { success: true }
    } catch (e) {
        console.error(e)
        return { error: "Failed to update attendance" }
    }
}

export async function issuePenalty(profileId: string, data: { type: string, amount: number, reason: string }) {
    const isAllowed = await checkPermission('HR', 'write')
    if (!isAllowed) return { error: "Unauthorized: Requires HR Write Permission" }

    try {
        // 1. Create Penalty record
        await (db as any).penalty.create({
            data: {
                profileId,
                type: data.type,
                amount: data.amount,
                reason: data.reason,
                status: 'APPLIED'
            }
        })

        // 2. Increment Penalty count in stats (upsert for robustness)
        await (db as any).employeeHRStats.upsert({
            where: { profileId },
            create: {
                profileId,
                penaltiesCount: 1,
                targetHours: 180, // Defaults required by schema if not nullable
                maxLateAllowed: 60
            },
            update: {
                penaltiesCount: { increment: 1 }
            }
        })

        // 3. Revalidate
        revalidatePath('/admin/hr')
        revalidatePath('/dashboard/employee')
        return { success: true }
    } catch (e) {
        console.error(e)
        return { error: "Failed to issue penalty" }
    }
}

export async function manageLoan(profileId: string, data: { amount: number, installments: number, reason: string }) {
    const isAllowed = await checkPermission('HR', 'write')
    if (!isAllowed) return { error: "Unauthorized: Requires HR Write Permission" }

    try {
        await (db as any).loan.create({
            data: {
                profileId,
                totalAmount: data.amount,
                paidAmount: 0,
                monthlyInstallment: data.amount / data.installments,
                status: 'ACTIVE'
            }
        })

        revalidatePath('/admin/hr')
        revalidatePath('/dashboard/employee')
        return { success: true }
    } catch (e) {
        console.error(e)
        return { error: "Failed to manage loan" }
    }
}

export async function deductLoanInstallment(loanId: string, amount: number) {
    const isAllowed = await checkPermission('HR', 'write');
    // Also allow FINANCE to deduct
    const session = await auth();
    const role = (session?.user as any)?.role;
    if (!isAllowed && role !== 'FINANCE' && role !== 'ADMIN') {
        return { error: "Unauthorized" };
    }

    try {
        const loan = await (db as any).loan.findUnique({
            where: { id: loanId },
            include: { profile: { include: { assignedBranch: true, user: true } } }
        });

        if (!loan) return { error: "Loan not found" };
        if (loan.status === 'COMPLETED') return { error: "Loan is already completed" };

        const newPaidAmount = loan.paidAmount + amount;
        let newStatus = loan.status;

        if (newPaidAmount >= loan.totalAmount) {
            newStatus = 'COMPLETED';
        }

        await (db as any).$transaction(async (tx: any) => {
            // 1. Update Loan
            await tx.loan.update({
                where: { id: loanId },
                data: {
                    paidAmount: newPaidAmount,
                    status: newStatus
                }
            });

            // 2. Financial Integration: Create Credit (Income) for repayment
            await tx.invoice.create({
                data: {
                    projectId: "internal", // Needs a dummy project or optional relation in production. We use a mock or bypass if schema allows null.
                    baseAmount: amount,
                    taxRate: 0,
                    vatAmount: 0,
                    totalAmount: amount,
                    status: 'PAID',
                    description: `Loan Repayment from ${loan.profile.user?.name || "Employee"} (Loan #${loan.id})`,
                }
            }).catch(() => {
                // Ignore if Invoice strictly requires a real Project ID in this schema context.
                // Ideally, a generic 'JournalEntry' or 'Income' model would be used.
                console.log("Invoice creation skipped due to strict Project ID requirement. Use Journal Ledger for pure accounting.");
            });

            // Note: If 'Invoice' is strictly tied to 'Project', we will just log the repayment on the Loan model for now.
        });

        // 3. Generate Digital Receipt to Drive
        const profile = loan.profile;
        const branchName = profile.assignedBranch?.nameEn || profile.legacyBranch || "Unassigned";
        const employeeName = profile.user?.name || "Unknown";

        const receiptContent = `
--- OFFICIAL LOAN REPAYMENT RECEIPT ---
Type: Loan Repayment Deduction
Date: ${new Date().toISOString()}
Employee: ${employeeName}
Loan ID: ${loan.id}
Deducted Amount: ${amount} SAR
Remaining Balance: ${loan.totalAmount - newPaidAmount} SAR
Status: ${newStatus}
---------------------------------------
Generated automatically by the ERP System.
        `.trim();

        const buffer = Buffer.from(receiptContent, 'utf-8');
        const fileName = `Receipt_Loan_Repayment_${loan.id}_${Date.now()}.txt`;
        const targetPath = [
            'Employees - الموظفين',
            branchName,
            employeeName,
            'القروض والعمليات المالية'
        ];

        try {
            const tenantId = (session?.user as any).tenantId
            await uploadSmartFileToDrive(tenantId, buffer, fileName, 'text/plain', targetPath);
        } catch (driveErr) {
            console.error("Failed to upload receipt to Drive:", driveErr);
            // Non-blocking error
        }

        revalidatePath('/admin/hr');
        return { success: true };
    } catch (e: any) {
        console.error("Loan Deduction Error:", e);
        return { error: "Failed to deduct installment" };
    }
}

export async function updateFinancials(profileId: string, data: { basicSalary: number, housingAllowance: number, transportAllowance: number }) {
    const isAllowed = await checkPermission('HR', 'write')
    if (!isAllowed) return { error: "Unauthorized: Requires HR Write Permission" }

    try {
        await (db as any).employeeProfile.update({
            where: { id: profileId },
            data: {
                basicSalary: data.basicSalary,
                housingAllowance: data.housingAllowance,
                transportAllowance: data.transportAllowance,
                totalSalary: data.basicSalary + data.housingAllowance + data.transportAllowance
            }
        })

        revalidatePath('/admin/hr')
        return { success: true }
    } catch (e) {
        console.error(e)
        return { error: "Failed to update financials" }
    }
}

export async function getUnifiedRequests() {
    const session = await auth()
    const userRole = (session?.user as any)?.role

    if (!userRole) return { error: "Unauthorized" }

    try {
        const [leaves, loans, docs] = await Promise.all([
            (db as any).leaveRequest.findMany({
                include: { user: { include: { profile: true } } },
                orderBy: { createdAt: 'desc' }
            }),
            (db as any).loanRequest.findMany({
                include: { profile: { include: { user: true } } },
                orderBy: { createdAt: 'desc' }
            }),
            (db as any).documentRequest.findMany({
                include: { profile: { include: { user: true } } },
                orderBy: { createdAt: 'desc' }
            })
        ])

        const unified = [
            ...leaves.map((r: any) => ({
                id: r.id,
                type: 'LEAVE',
                subType: r.type,
                requester: {
                    name: r.user.name,
                    image: r.user.image,
                    position: r.user.profile?.position || "Employee"
                },
                details: `${r.type} Leave (${new Date(r.startDate).toLocaleDateString()} - ${new Date(r.endDate).toLocaleDateString()})`,
                status: r.status,
                date: r.createdAt,
                raw: r
            })),
            ...loans.map((r: any) => ({
                id: r.id,
                type: 'LOAN',
                subType: 'FINANCIAL',
                requester: {
                    name: r.profile.user.name,
                    image: r.profile.user.image,
                    position: r.profile.position
                },
                details: `Loan Request: ${r.amount} SAR (${r.installments} months)`,
                status: r.status,
                date: r.createdAt,
                raw: r
            })),
            ...docs.map((r: any) => ({
                id: r.id,
                type: 'DOCUMENT',
                subType: r.type,
                requester: {
                    name: r.profile.user.name,
                    image: r.profile.user.image,
                    position: r.profile.position
                },
                details: `${r.type} Request - ${r.details || "No details"}`,
                status: r.status,
                date: r.createdAt,
                raw: r
            }))
        ]

        return unified.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    } catch (e) {
        console.error("Unified Fetch Error:", e)
        return []
    }
}

export async function adminForcePasswordChange(staffId: string, newPass: string) {
    try {
        const session = await auth()
        const currentUser = session?.user as any
        if (!currentUser) return { error: "Not authenticated" }

        const isAllowed = await checkPermission('HR', 'write')
        const currentUserRole = currentUser.role
        const isSelf = currentUser.id === staffId

        // Allow if user has HR write permission, is an ADMIN, or is resetting their own password
        const hasAdminRole = ['GLOBAL_SUPER_ADMIN', 'SUPER_ADMIN', 'ADMIN'].includes(currentUserRole)

        if (!isAllowed && !hasAdminRole && !isSelf) {
            return { error: "Unauthorized: You don't have permission to reset this password" }
        }

        const hashedNew = await bcrypt.hash(newPass, 10)

        await (db as any).user.update({
            where: { id: staffId },
            data: { password: hashedNew }
        })

        await (db as any).systemLog.create({
            data: {
                userId: currentUser.id,
                action: "ADMIN_PASSWORD_RESET",
                details: JSON.stringify({ targetUserId: staffId, isSelf })
            }
        })

        return { success: true, message: "تم تغيير كلمة المرور للموظف بنجاح" }
    } catch (e: any) {
        console.error("Admin Password Reset Error:", e)
        return { error: e.message || "Failed to reset password" }
    }
}
