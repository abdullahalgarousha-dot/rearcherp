/**
 * Pure payroll calculation utilities — no DB imports.
 * Safe for use in both server (payroll-engine) and client (edit-staff-dialog) contexts.
 */

export interface SalaryComponents {
    basicSalary: number
    housingAllowance: number
    transportAllowance: number
    otherAllowance: number
    gosiDeduction: number
}

/**
 * Total Monthly Cost = sum of all salary components minus the GOSI employee deduction.
 * This is the single source of truth for the cost preview in the edit modal
 * and the net payroll baseline on the profile page.
 */
export function computeMonthlyCost(c: SalaryComponents): number {
    const gross = (c.basicSalary || 0)
        + (c.housingAllowance || 0)
        + (c.transportAllowance || 0)
        + (c.otherAllowance || 0)
    return gross - (c.gosiDeduction || 0)
}
