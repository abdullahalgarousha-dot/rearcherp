'use server'

import { db } from "@/lib/db"

export async function getProjectSupervisionData(projectId: string) {

    const ncrs = await (db as any).nCR.findMany({
        where: { projectId },
        include: { contractor: true, project: true },
        orderBy: { createdAt: 'desc' }
    })

    const reports = await (db as any).dailyReport.findMany({
        where: { projectId },
        include: { createdBy: true, contractor: true },
        orderBy: { date: 'desc' }
    })

    const project = await (db as any).project.findUnique({
        where: { id: projectId },
        select: { driveFolderId: true, driveLink: true }
    })

    const irs = await (db as any).inspectionRequest.findMany({
        where: { projectId },
        include: { project: true },
        orderBy: { date: 'desc' }
    })

    // Fetch via ProjectContractor join table
    const projectContractors = await (db as any).projectContractor.findMany({
        where: { projectId },
        include: { contractor: true }
    })

    // Fallback to legacy check if ProjectContractor is empty (migration safety)
    let contractors: any[] = []
    if (projectContractors.length > 0) {
        contractors = projectContractors.map((pc: any) => ({
            ...pc.contractor,
            joinedAt: pc.startDate,
            contractValue: pc.contractValue
        }))
    }

    const siteVisits = await (db as any).workLog.findMany({
        where: { projectId, type: 'SITE' },
        include: { user: true },
        orderBy: { date: 'desc' }
    })

    // Safety check for contractorData and other JSON-stored fields
    const processedReports = reports.map((r: any) => ({
        ...r,
        contractorData: typeof r.contractorData === 'string' ? JSON.parse(r.contractorData) : (Array.isArray(r.contractorData) ? r.contractorData : []),
        consultantStaff: typeof r.consultantStaff === 'string' ? JSON.parse(r.consultantStaff) : (Array.isArray(r.consultantStaff) ? r.consultantStaff : []),
        sitePhotos: typeof r.sitePhotos === 'string' ? JSON.parse(r.sitePhotos) : (Array.isArray(r.sitePhotos) ? r.sitePhotos : [])
    }))

    return { ncrs, reports: processedReports, contractors, driveFolderId: project?.driveFolderId, driveLink: project?.driveLink, siteVisits, irs }
}
