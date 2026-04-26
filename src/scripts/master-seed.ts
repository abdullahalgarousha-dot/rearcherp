import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const d = (daysOffset: number) => {
  const dt = new Date()
  dt.setDate(dt.getDate() + daysOffset)
  return dt
}
const rnd = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min

async function main() {
  console.log('🚀 MASTER SEED: Booting FTS Demo ERP — Full Population...\n')
  const password = await bcrypt.hash('Demo@1234', 10)

  // ════════════════════════════════════════════════════════
  // PHASE 0 — CLEAR EXISTING DEMO DATA
  // ════════════════════════════════════════════════════════
  const existing = await prisma.tenant.findUnique({ where: { slug: 'demo' } })
  if (existing) {
    const tid = existing.id
    console.log(`🧹 Clearing demo tenant ${tid}...`)
    const projectIds = (await prisma.project.findMany({ where: { tenantId: tid }, select: { id: true } })).map(p => p.id)
    const subIds = (await prisma.subContract.findMany({ where: { tenantId: tid }, select: { id: true } })).map(s => s.id)

    await prisma.fileComment.deleteMany({ where: { tenantId: tid } })
    await prisma.drawingRevision.deleteMany({ where: { tenantId: tid } })
    await prisma.drawing.deleteMany({ where: { tenantId: tid } })
    if (projectIds.length) await prisma.workLog.deleteMany({ where: { projectId: { in: projectIds } } })
    if (subIds.length) await prisma.vendorMilestone.deleteMany({ where: { subContractId: { in: subIds } } })
    await prisma.subContract.deleteMany({ where: { tenantId: tid } })
    await prisma.vendor.deleteMany({ where: { tenantId: tid } })
    if (projectIds.length) await prisma.projectContractor.deleteMany({ where: { projectId: { in: projectIds } } })
    await prisma.variationOrder.deleteMany({ where: { tenantId: tid } })
    await prisma.pettyCashRequest.deleteMany({ where: { tenantId: tid } })
    await prisma.milestone.deleteMany({ where: { tenantId: tid } })
    await prisma.invoice.deleteMany({ where: { tenantId: tid } })
    await prisma.expense.deleteMany({ where: { tenantId: tid } })
    await (prisma as any).iRRevision.deleteMany({ where: { tenantId: tid } })
    await prisma.inspectionRequest.deleteMany({ where: { tenantId: tid } })
    await (prisma as any).nCRRevision.deleteMany({ where: { tenantId: tid } })
    await (prisma as any).nCR.deleteMany({ where: { tenantId: tid } })
    await prisma.dailyReport.deleteMany({ where: { tenantId: tid } })
    await prisma.designStageFile.deleteMany({ where: { tenantId: tid } })
    await prisma.task.deleteMany({ where: { tenantId: tid } })
    await prisma.designStage.deleteMany({ where: { tenantId: tid } })
    await prisma.timeLog.deleteMany({ where: { tenantId: tid } })
    await prisma.project.deleteMany({ where: { tenantId: tid } })
    await prisma.client.deleteMany({ where: { tenantId: tid } })
    await prisma.contractor.deleteMany({ where: { tenantId: tid } })
    await prisma.systemLookup.deleteMany({ where: { tenantId: tid } })
    await prisma.systemSetting.deleteMany({ where: { tenantId: tid } })
    await prisma.companyProfile.deleteMany({ where: { tenantId: tid } })
    await prisma.salarySlip.deleteMany({ where: { tenantId: tid } })
    await prisma.loan.deleteMany({ where: { tenantId: tid } })
    await prisma.loanRequest.deleteMany({ where: { tenantId: tid } })
    await prisma.penalty.deleteMany({ where: { tenantId: tid } })
    await prisma.leaveRequest.deleteMany({ where: { tenantId: tid } })
    await prisma.attendance.deleteMany({ where: { tenantId: tid } })
    await prisma.employeeHRStats.deleteMany({ where: { tenantId: tid } })
    await prisma.employeeProfile.deleteMany({ where: { tenantId: tid } })
    await prisma.role.deleteMany({ where: { tenantId: tid } })
    await prisma.brand.deleteMany({ where: { tenantId: tid } })
    await prisma.branch.deleteMany({ where: { tenantId: tid } })
    await prisma.user.deleteMany({ where: { tenantId: tid, email: { not: 'super@topo-eng.sa' } } })
    console.log('✅ Cleared.\n')
  }

  // ════════════════════════════════════════════════════════
  // PHASE 1 — TENANT
  // ════════════════════════════════════════════════════════
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo' },
    update: { name: 'Future Tech Solutions', status: 'ACTIVE', setupCompleted: true, subscriptionTier: 'ENTERPRISE' },
    create: { slug: 'demo', name: 'Future Tech Solutions', status: 'ACTIVE', subscriptionTier: 'ENTERPRISE', setupCompleted: true },
  })
  console.log(`✅ Tenant: ${tenant.name} [${tenant.id}]`)

  // ════════════════════════════════════════════════════════
  // PHASE 2 — BRANCH & BRAND
  // ════════════════════════════════════════════════════════
  const branch = await prisma.branch.create({
    data: {
      tenantId: tenant.id, nameEn: 'Riyadh HQ', nameAr: 'المقر الرئيسي - الرياض',
      location: 'King Fahad Road, Al Olaya, Riyadh, KSA',
      currencyCode: 'SAR', exchangeRateToBase: 1.0, isMainBranch: true,
    },
  })

  const brand = await prisma.brand.create({
    data: {
      tenantId: tenant.id, nameEn: 'Future Tech Solutions', nameAr: 'حلول تقنية المستقبل',
      shortName: 'FTS', fullName: 'FTS Architectural & Engineering Consultancy',
      abbreviation: 'FTS', logoUrl: '/logos/fts-logo.png',
      primaryColor: '#1e40af', accentColor: '#3b82f6', isDefault: true,
      taxNumber: '300123456700003', crNumber: '1010123456', vatNumber: '300123456700003',
      email: 'info@fts-ae.com', phone: '+966-11-456-7890',
      addressEn: 'King Fahad Road, Al Olaya District, Riyadh 12214, KSA',
      addressAr: 'طريق الملك فهد، حي العليا، الرياض 12214، المملكة العربية السعودية',
      bankName: 'Riyad Bank', iban: 'SA0380000000608010167519', accountHolder: 'Future Tech Solutions Co.',
    },
  })
  console.log(`✅ Branch: ${branch.nameEn} | Brand: ${brand.shortName} (isDefault: true)`)

  // ════════════════════════════════════════════════════════
  // PHASE 3 — COMPANY PROFILE & SYSTEM SETTINGS
  // ════════════════════════════════════════════════════════
  await prisma.companyProfile.create({
    data: {
      tenantId: tenant.id, companyNameEn: 'Future Tech Solutions', companyNameAr: 'حلول تقنية المستقبل',
      logoUrl: '/logos/fts-logo.png', vatNumber: '300123456700003', vatPercentage: 15,
      defaultCurrency: 'SAR', contactEmail: 'info@fts-ae.com', contactPhone: '+966-11-456-7890',
      address: 'King Fahad Road, Al Olaya District, Riyadh 12214, KSA',
      workingHoursPerDay: 8, workingDaysPerWeek: 5, weekendDays: 'Friday,Saturday',
    },
  })

  const settingsData = [
    { key: 'CURRENCY_DEFAULT',        value: 'SAR',      description: 'Default transaction currency' },
    { key: 'VAT_RATE',                value: '0.15',     description: 'ZATCA standard VAT 15%' },
    { key: 'ZATCA_VAT_ENABLED',       value: 'true',     description: 'Enable ZATCA Phase-2 e-invoicing' },
    { key: 'ZATCA_ENVIRONMENT',       value: 'SANDBOX',  description: 'ZATCA environment: SANDBOX or PRODUCTION' },
    { key: 'WORKING_HOURS_PER_DAY',   value: '8',        description: 'Standard working hours/day' },
    { key: 'WORKING_DAYS_PER_WEEK',   value: '5',        description: 'Working days/week (Sun–Thu)' },
    { key: 'WEEKEND_DAYS',            value: 'Friday,Saturday', description: 'Saudi weekend' },
    { key: 'RETENTION_PERCENTAGE',    value: '10',       description: 'Default contract retention %' },
    { key: 'ANNUAL_LEAVE_DAYS',       value: '21',       description: 'Annual leave entitlement' },
    { key: 'SICK_LEAVE_DAYS',         value: '14',       description: 'Sick leave entitlement' },
    { key: 'GOSI_EMPLOYEE_RATE',      value: '0.10',     description: 'GOSI employee contribution (10%)' },
    { key: 'GOSI_EMPLOYER_RATE',      value: '0.12',     description: 'GOSI employer contribution (12%)' },
    { key: 'OVERTIME_MULTIPLIER',     value: '1.5',      description: 'Overtime rate multiplier' },
    { key: 'INVOICE_PAYMENT_TERMS',   value: '30',       description: 'Default invoice due days' },
    { key: 'PROBATION_PERIOD_DAYS',   value: '90',       description: 'Employee probation period' },
    { key: 'ID_EXPIRY_ALERT_DAYS',    value: '60',       description: 'Days before ID expiry to alert' },
    { key: 'PASSPORT_EXPIRY_ALERT',   value: '90',       description: 'Days before passport expiry to alert' },
  ]
  for (const s of settingsData) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: { value: s.value, tenantId: tenant.id },
      create: { tenantId: tenant.id, key: s.key, value: s.value, description: s.description },
    })
  }
  console.log(`✅ Company Profile + ${settingsData.length} System Settings seeded`)

  // ════════════════════════════════════════════════════════
  // PHASE 4 — ROLES & RBAC PERMISSIONS
  // ════════════════════════════════════════════════════════
  const buildMatrix = (perms: Record<string, { r: boolean; w: boolean; a: boolean }>) =>
    JSON.stringify(
      Object.fromEntries(
        Object.entries(perms).map(([mod, p]) => [mod, { read: p.r, write: p.w, approve: p.a }])
      )
    )

  const roleDefinitions = [
    {
      name: 'Super Admin',
      description: 'Full unrestricted system access across all modules',
      matrix: buildMatrix({
        DASHBOARD: { r: true,  w: true,  a: true  },
        PROJECTS:  { r: true,  w: true,  a: true  },
        HR:        { r: true,  w: true,  a: true  },
        FINANCE:   { r: true,  w: true,  a: true  },
        SUPERVISION:{ r: true, w: true,  a: true  },
        USERS:     { r: true,  w: true,  a: true  },
        SETTINGS:  { r: true,  w: true,  a: true  },
        REPORTS:   { r: true,  w: true,  a: true  },
        CRM:       { r: true,  w: true,  a: true  },
      }),
    },
    {
      name: 'Project Manager',
      description: 'Manages projects, supervision workflows, and team assignments',
      matrix: buildMatrix({
        DASHBOARD:  { r: true,  w: true,  a: false },
        PROJECTS:   { r: true,  w: true,  a: true  },
        HR:         { r: true,  w: false, a: false },
        FINANCE:    { r: true,  w: false, a: false },
        SUPERVISION:{ r: true,  w: true,  a: true  },
        USERS:      { r: true,  w: false, a: false },
        SETTINGS:   { r: false, w: false, a: false },
        REPORTS:    { r: true,  w: true,  a: false },
        CRM:        { r: true,  w: true,  a: false },
      }),
    },
    {
      name: 'HR Manager',
      description: 'Manages HR records, payroll, leave, and employee data',
      matrix: buildMatrix({
        DASHBOARD:  { r: true,  w: false, a: false },
        PROJECTS:   { r: true,  w: false, a: false },
        HR:         { r: true,  w: true,  a: true  },
        FINANCE:    { r: true,  w: false, a: false },
        SUPERVISION:{ r: false, w: false, a: false },
        USERS:      { r: true,  w: true,  a: false },
        SETTINGS:   { r: true,  w: false, a: false },
        REPORTS:    { r: true,  w: true,  a: false },
        CRM:        { r: false, w: false, a: false },
      }),
    },
    {
      name: 'Senior Accountant',
      description: 'Manages invoices, expenses, VAT, and financial reporting',
      matrix: buildMatrix({
        DASHBOARD:  { r: true,  w: false, a: false },
        PROJECTS:   { r: true,  w: false, a: false },
        HR:         { r: true,  w: false, a: false },
        FINANCE:    { r: true,  w: true,  a: true  },
        SUPERVISION:{ r: false, w: false, a: false },
        USERS:      { r: false, w: false, a: false },
        SETTINGS:   { r: false, w: false, a: false },
        REPORTS:    { r: true,  w: true,  a: false },
        CRM:        { r: true,  w: false, a: false },
      }),
    },
    {
      name: 'Site Engineer',
      description: 'Creates and manages site reports, NCRs, and inspection requests on-site',
      matrix: buildMatrix({
        DASHBOARD:  { r: true,  w: false, a: false },
        PROJECTS:   { r: true,  w: false, a: false },
        HR:         { r: false, w: false, a: false },
        FINANCE:    { r: false, w: false, a: false },
        SUPERVISION:{ r: true,  w: true,  a: false },
        USERS:      { r: false, w: false, a: false },
        SETTINGS:   { r: false, w: false, a: false },
        REPORTS:    { r: true,  w: true,  a: false },
        CRM:        { r: false, w: false, a: false },
      }),
    },
  ]

  const roles: Record<string, any> = {}
  for (const rd of roleDefinitions) {
    roles[rd.name] = await prisma.role.upsert({
      where: { name: rd.name },
      update: { tenantId: tenant.id, permissionMatrix: rd.matrix, description: rd.description },
      create: { tenantId: tenant.id, name: rd.name, description: rd.description, permissionMatrix: rd.matrix },
    })
  }
  console.log(`✅ Roles: 5 RBAC roles seeded (Super Admin, PM, HR Manager, Senior Accountant, Site Engineer)`)

  // ════════════════════════════════════════════════════════
  // PHASE 5 — USERS & EMPLOYEE PROFILES (16 total)
  // ════════════════════════════════════════════════════════
  const superAdmin = await prisma.user.upsert({
    where: { email: 'super@topo-eng.sa' },
    update: { role: 'GLOBAL_SUPER_ADMIN', name: 'Abdullah Al-Rashidi', tenantId: tenant.id, roleId: roles['Super Admin'].id },
    create: { email: 'super@topo-eng.sa', password, name: 'Abdullah Al-Rashidi', role: 'GLOBAL_SUPER_ADMIN', tenantId: tenant.id, roleId: roles['Super Admin'].id },
  })

  const superProfile = await prisma.employeeProfile.upsert({
    where: { userId: superAdmin.id },
    update: {},
    create: {
      userId: superAdmin.id, tenantId: tenant.id, branchId: branch.id,
      employeeCode: 'FTS-001', department: 'Executive', position: 'Chief Executive Officer',
      nationality: 'Saudi', idNumber: '1012345678', idExpiry: d(365),
      passportNum: 'A12345678', passportExpiry: d(730),
      hireDate: new Date('2020-01-01'), leaveBalance: 21,
      basicSalary: 30000, housingAllowance: 5000, transportAllowance: 2000, otherAllowance: 1000,
      gosiDeduction: 3000, totalSalary: 38000,
      bankName: 'Riyad Bank', iban: 'SA0380000000608010167519',
    },
  })
  await prisma.employeeHRStats.upsert({
    where: { profileId: superProfile.id },
    update: {},
    create: { tenantId: tenant.id, profileId: superProfile.id, annualLeaveTotal: 21, annualLeaveUsed: 5, sickLeaveTotal: 14, sickLeaveUsed: 0, workHoursMonth: 176, targetHours: 176, overtimeHours: 8 },
  })

  // 15 additional employees
  const empData = [
    { name: 'Mohammed Al-Otaibi',  email: 'mohammed.otaibi@fts.sa', sysRole: 'PM',              roleKey: 'Project Manager',   dept: 'Projects Management', pos: 'Senior Project Manager',  code: 'FTS-002', nat: 'Saudi',    basic: 22000, housing: 4000, trans: 1500, hire: '2021-03-15', idExp: d(365),  passExp: d(500) },
    { name: 'Sara Al-Ghamdi',      email: 'sara.ghamdi@fts.sa',     sysRole: 'DESIGN_ENGINEER', roleKey: 'Site Engineer',     dept: 'Design',               pos: 'Lead Design Engineer',    code: 'FTS-003', nat: 'Saudi',    basic: 18000, housing: 3500, trans: 1200, hire: '2021-06-01', idExp: d(28),   passExp: d(300) },
    { name: 'Abdullah Hassan',     email: 'abdullah.hassan@fts.sa', sysRole: 'SITE_ENGINEER',   roleKey: 'Site Engineer',     dept: 'Supervision',          pos: 'Site Engineer',           code: 'FTS-004', nat: 'Egyptian', basic: 14000, housing: 3000, trans: 1000, hire: '2022-01-10', idExp: d(200),  passExp: d(25)  },
    { name: 'Layla Mansour',       email: 'layla.mansour@fts.sa',   sysRole: 'ACCOUNTANT',      roleKey: 'Senior Accountant', dept: 'Finance',              pos: 'Senior Accountant',       code: 'FTS-005', nat: 'Saudi',    basic: 16000, housing: 3000, trans: 1000, hire: '2021-09-01', idExp: d(400),  passExp: d(600) },
    { name: 'Fahad Salem',         email: 'fahad.salem@fts.sa',     sysRole: 'SITE_ENGINEER',   roleKey: 'Site Engineer',     dept: 'Supervision',          pos: 'Site Engineer',           code: 'FTS-006', nat: 'Saudi',    basic: 13000, housing: 2500, trans: 1000, hire: '2022-04-01', idExp: d(-10),  passExp: d(600) },
    { name: 'Noura Khalid',        email: 'noura.khalid@fts.sa',    sysRole: 'DESIGN_ENGINEER', roleKey: 'Site Engineer',     dept: 'Design',               pos: 'Architect',               code: 'FTS-007', nat: 'Saudi',    basic: 15000, housing: 3000, trans: 1000, hire: '2022-07-01', idExp: d(250),  passExp: d(-5)  },
    { name: 'Omar Farooq',         email: 'omar.farooq@fts.sa',     sysRole: 'PM',              roleKey: 'Project Manager',   dept: 'Projects Management',  pos: 'Project Manager',         code: 'FTS-008', nat: 'Pakistani',basic: 19000, housing: 3500, trans: 1200, hire: '2021-11-01', idExp: d(180),  passExp: d(400) },
    { name: 'Huda Ibrahim',        email: 'huda.ibrahim@fts.sa',    sysRole: 'HR',              roleKey: 'HR Manager',        dept: 'Human Resources',      pos: 'HR Manager',              code: 'FTS-009', nat: 'Saudi',    basic: 17000, housing: 3000, trans: 1000, hire: '2020-08-01', idExp: d(500),  passExp: d(700) },
    { name: 'Khalid Saeed',        email: 'khalid.saeed@fts.sa',    sysRole: 'SITE_ENGINEER',   roleKey: 'Site Engineer',     dept: 'Supervision',          pos: 'Senior Site Engineer',    code: 'FTS-010', nat: 'Saudi',    basic: 15000, housing: 3000, trans: 1000, hire: '2021-05-01', idExp: d(320),  passExp: d(450) },
    { name: 'Reem Ali',            email: 'reem.ali@fts.sa',        sysRole: 'DESIGN_ENGINEER', roleKey: 'Site Engineer',     dept: 'Design',               pos: 'Interior Designer',       code: 'FTS-011', nat: 'Saudi',    basic: 14000, housing: 2500, trans: 1000, hire: '2022-02-01', idExp: d(450),  passExp: d(600) },
    { name: 'Ahmed Nasser',        email: 'ahmed.nasser@fts.sa',    sysRole: 'SITE_ENGINEER',   roleKey: 'Site Engineer',     dept: 'Supervision',          pos: 'QC Engineer',             code: 'FTS-012', nat: 'Jordanian',basic: 13500, housing: 2500, trans: 1000, hire: '2022-09-01', idExp: d(35),   passExp: d(200) },
    { name: 'Fatima Al-Zahrani',   email: 'fatima.zahrani@fts.sa',  sysRole: 'ACCOUNTANT',      roleKey: 'Senior Accountant', dept: 'Finance',              pos: 'Junior Accountant',       code: 'FTS-013', nat: 'Saudi',    basic: 12000, housing: 2000, trans:  800, hire: '2023-01-15', idExp: d(600),  passExp: d(800) },
    { name: 'Youssef Benmoussa',   email: 'youssef.b@fts.sa',       sysRole: 'DESIGN_ENGINEER', roleKey: 'Site Engineer',     dept: 'Design',               pos: 'Structural Engineer',     code: 'FTS-014', nat: 'Moroccan', basic: 16000, housing: 3000, trans: 1200, hire: '2022-05-01', idExp: d(45),   passExp: d(-20) },
    { name: 'Mona Al-Shehri',      email: 'mona.shehri@fts.sa',     sysRole: 'HR',              roleKey: 'HR Manager',        dept: 'Human Resources',      pos: 'HR Specialist',           code: 'FTS-015', nat: 'Saudi',    basic: 13000, housing: 2500, trans:  800, hire: '2023-03-01', idExp: d(550),  passExp: d(720) },
    { name: 'Tariq Al-Dosari',     email: 'tariq.dosari@fts.sa',    sysRole: 'PM',              roleKey: 'Project Manager',   dept: 'Projects Management',  pos: 'Project Coordinator',     code: 'FTS-016', nat: 'Saudi',    basic: 14000, housing: 2500, trans: 1000, hire: '2023-06-01', idExp: d(280),  passExp: d(410) },
  ]

  const allUsers: any[] = [superAdmin]
  const profiles: any[] = [superProfile]

  for (const e of empData) {
    const user = await prisma.user.upsert({
      where: { email: e.email },
      update: { role: e.sysRole, tenantId: tenant.id, roleId: roles[e.roleKey]?.id },
      create: { email: e.email, password, name: e.name, role: e.sysRole, tenantId: tenant.id, roleId: roles[e.roleKey]?.id },
    })
    allUsers.push(user)

    const profile = await prisma.employeeProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id, tenantId: tenant.id, branchId: branch.id,
        employeeCode: e.code, department: e.dept, position: e.pos,
        nationality: e.nat,
        idNumber: `SA${e.code.replace('FTS-', '')}${rnd(10000, 99999)}`,
        idExpiry: e.idExp,
        passportNum: `P${e.code.replace('FTS-', '')}${rnd(1000000, 9999999)}`,
        passportExpiry: e.passExp,
        hireDate: new Date(e.hire), leaveBalance: 21,
        basicSalary: e.basic, housingAllowance: e.housing, transportAllowance: e.trans, otherAllowance: 500,
        gosiDeduction: e.basic * 0.1,
        totalSalary: e.basic + e.housing + e.trans + 500,
        bankName: ['Al Rajhi Bank', 'Riyad Bank', 'SNB', 'Al Bilad Bank'][rnd(0, 3)],
        iban: `SA${rnd(10, 99)}0000${e.code.replace('FTS-', '').padStart(3, '0')}${rnd(100000000, 999999999)}`,
      },
    })
    profiles.push(profile)

    await prisma.employeeHRStats.upsert({
      where: { profileId: profile.id },
      update: {},
      create: {
        tenantId: tenant.id, profileId: profile.id,
        annualLeaveTotal: 21, annualLeaveUsed: rnd(0, 12),
        sickLeaveTotal: 14,   sickLeaveUsed: rnd(0, 4),
        emergencyLeaveTotal: 5, emergencyLeaveUsed: rnd(0, 2),
        workHoursMonth: rnd(148, 176), targetHours: 176, overtimeHours: rnd(0, 24),
      },
    })
  }
  console.log(`✅ Users & Employees: ${allUsers.length} total (incl. super@topo-eng.sa)`)

  // ════════════════════════════════════════════════════════
  // PHASE 6 — CLIENTS
  // ════════════════════════════════════════════════════════
  const clientsRaw = [
    { clientCode: 'CLI-D001', name: 'Saudi Aramco Real Estate Division', taxNumber: '300000000000003', email: 'realestate@aramco.sa',    phone: '+966-13-872-0000', address: 'Dhahran, Eastern Province, KSA' },
    { clientCode: 'CLI-D002', name: 'NEOM Development Authority',         taxNumber: '300111111111113', email: 'contracts@neom.com',       phone: '+966-14-000-0000', address: 'NEOM Bay, Tabuk Province, KSA' },
    { clientCode: 'CLI-D003', name: 'Jeddah Development Company',         taxNumber: '300222222222223', email: 'projects@jdc.sa',          phone: '+966-12-660-0000', address: 'Al Hamra District, Jeddah, KSA' },
    { clientCode: 'CLI-D004', name: 'Royal Commission for Riyadh City',   taxNumber: '300333333333333', email: 'projects@rcrc.gov.sa',     phone: '+966-11-488-0000', address: 'King Abdullah Financial District, Riyadh' },
    { clientCode: 'CLI-D005', name: 'Diriyah Gate Development Authority', taxNumber: '300444444444443', email: 'info@dgda.gov.sa',         phone: '+966-11-200-0000', address: 'Diriyah, Riyadh, KSA' },
  ]
  const clients: any[] = []
  for (const c of clientsRaw) {
    clients.push(await prisma.client.create({ data: { ...c, tenantId: tenant.id } }))
  }
  console.log(`✅ Clients: ${clients.length} created`)

  // ════════════════════════════════════════════════════════
  // PHASE 7 — CONTRACTORS
  // ════════════════════════════════════════════════════════
  const [ctr1, ctr2] = await Promise.all([
    prisma.contractor.create({ data: { tenantId: tenant.id, companyName: 'Al-Muqawil Al-Saudi Construction Co.', contactPerson: 'Bandar Al-Qahtani', phone: '+966-11-222-3344', email: 'bandar@almuqawil.sa', specialty: 'Civil & Structural Works', crNumber: 'CR1010987654' } }),
    prisma.contractor.create({ data: { tenantId: tenant.id, companyName: 'Elite MEP Systems Ltd.', contactPerson: 'Samir Khoury', phone: '+966-11-333-4455', email: 'skhoury@elitemep.sa', specialty: 'Mechanical, Electrical & Plumbing', crNumber: 'CR1010123789' } }),
  ])
  console.log(`✅ Contractors: ctr1=${ctr1.companyName}, ctr2=${ctr2.companyName}`)

  // ════════════════════════════════════════════════════════
  // PHASE 8 — PROJECTS (5 active)
  // ════════════════════════════════════════════════════════
  const pmUsers  = allUsers.filter(u => u.role === 'PM')
  const siteEngs = allUsers.filter(u => u.role === 'SITE_ENGINEER')

  const projectsRaw = [
    { code: 'FTS-D-2024-001', name: 'Al-Majd Commercial Tower',                 cliIdx: 0, val: 15800000, type: 'BOTH',        dur: 730, pct: 35, seq: 1, startOff: -180 },
    { code: 'FTS-D-2024-002', name: 'NEOM Staff Village — Phase 1',              cliIdx: 1, val: 28500000, type: 'SUPERVISION',  dur: 548, pct: 62, seq: 2, startOff: -300 },
    { code: 'FTS-D-2024-003', name: 'Jeddah Corniche Mixed-Use Development',     cliIdx: 2, val: 9200000,  type: 'DESIGN',       dur: 365, pct: 80, seq: 3, startOff: -250 },
    { code: 'FTS-D-2024-004', name: 'Riyadh Metro Station Fit-Out (L3 & L4)',    cliIdx: 3, val: 6750000,  type: 'SUPERVISION',  dur: 365, pct: 45, seq: 4, startOff: -120 },
    { code: 'FTS-D-2024-005', name: 'Diriyah Heritage Museum & Visitor Center',  cliIdx: 4, val: 19500000, type: 'BOTH',        dur: 912, pct: 20, seq: 5, startOff: -60  },
  ]

  const projects: any[] = []
  for (let pi = 0; pi < projectsRaw.length; pi++) {
    const p = projectsRaw[pi]
    const proj = await prisma.project.create({
      data: {
        tenantId: tenant.id, brandId: brand.id, clientId: clients[p.cliIdx].id,
        code: p.code, name: p.name, contractValue: p.val,
        vatAmount: p.val * 0.15, originalContractValue: p.val,
        serviceType: p.type, status: 'ACTIVE',
        year: 2024, sequence: p.seq,
        startDate: d(p.startOff), contractDuration: p.dur, totalDuration: p.dur,
        completionPercent: p.pct, hasRetention: true, retentionPercentage: 10,
        totalRetentionHeld: p.val * 0.10 * (p.pct / 100),
        leadEngineerId: pmUsers[pi % pmUsers.length]?.id,
        disciplines: 'Architecture,Civil,MEP,Interior',
      },
    })
    projects.push(proj)
    await prisma.projectContractor.create({
      data: { projectId: proj.id, contractorId: ctr1.id, startDate: d(p.startOff), durationDays: p.dur, contractValue: p.val * 0.6 },
    })
  }
  console.log(`✅ Projects: ${projects.length} active projects created`)

  // ════════════════════════════════════════════════════════
  // PHASE 9 — GANTT TASKS (23 tasks × 5 projects = 115 tasks)
  // ════════════════════════════════════════════════════════
  const taskDefs = [
    { title: 'Project Mobilisation & Site Setup',          type: 'SITE',   prog: 100, relStart: 0,   dur: 14 },
    { title: 'Topographic Survey & Soil Investigation',    type: 'SITE',   prog: 100, relStart: 7,   dur: 21 },
    { title: 'Concept Design Development',                 type: 'OFFICE', prog: 100, relStart: 14,  dur: 28 },
    { title: 'Structural Analysis & Foundation Design',    type: 'OFFICE', prog: 100, relStart: 30,  dur: 35 },
    { title: 'Schematic Design & Authority Submission',    type: 'OFFICE', prog: 90,  relStart: 42,  dur: 28 },
    { title: 'Earthworks & Bulk Excavation',               type: 'SITE',   prog: 100, relStart: 35,  dur: 30 },
    { title: 'Piling & Foundation Works',                  type: 'SITE',   prog: 100, relStart: 60,  dur: 45 },
    { title: 'Basement Raft Slab — Concrete Pour',         type: 'SITE',   prog: 100, relStart: 100, dur: 30 },
    { title: 'Ground Floor Columns & Beams',               type: 'SITE',   prog: 95,  relStart: 125, dur: 28 },
    { title: '1st Floor Slab Construction',                type: 'SITE',   prog: 85,  relStart: 148, dur: 25 },
    { title: '2nd Floor Slab Construction',                type: 'SITE',   prog: 70,  relStart: 170, dur: 25 },
    { title: '3rd Floor Slab Construction',                type: 'SITE',   prog: 55,  relStart: 192, dur: 25 },
    { title: 'Roof Slab & Waterproofing',                  type: 'SITE',   prog: 30,  relStart: 215, dur: 30 },
    { title: 'External Masonry & Block Works',             type: 'SITE',   prog: 40,  relStart: 180, dur: 60 },
    { title: 'Plumbing Works — First Fix Rough-in',        type: 'SITE',   prog: 55,  relStart: 190, dur: 45 },
    { title: 'Electrical Works — First Fix Rough-in',      type: 'SITE',   prog: 50,  relStart: 195, dur: 45 },
    { title: 'HVAC Ductwork & Equipment Installation',     type: 'SITE',   prog: 35,  relStart: 210, dur: 50 },
    { title: 'Interior Finishing — Level 1 (Floor & Wall)',type: 'SITE',   prog: 30,  relStart: 240, dur: 40 },
    { title: 'Interior Finishing — Level 2 (Ceilings)',    type: 'SITE',   prog: 15,  relStart: 275, dur: 40 },
    { title: 'Facade & External Cladding',                 type: 'SITE',   prog: 20,  relStart: 280, dur: 45 },
    { title: 'Landscape & External Hard/Soft Works',       type: 'SITE',   prog: 5,   relStart: 310, dur: 30 },
    { title: 'Testing, Commissioning & Snagging',          type: 'SITE',   prog: 0,   relStart: 340, dur: 20 },
    { title: 'Project Closeout, Handover & As-Built',      type: 'OFFICE', prog: 0,   relStart: 355, dur: 14 },
  ]

  const statusOf = (prog: number) => prog === 100 ? 'DONE' : prog > 0 ? 'IN_PROGRESS' : 'TODO'

  for (const project of projects) {
    const projStart = project.startDate ?? d(-180)
    const taskIds: string[] = []
    for (let i = 0; i < taskDefs.length; i++) {
      const t = taskDefs[i]
      const tStart = new Date(projStart.getTime() + t.relStart * 86400000)
      const tEnd   = new Date(tStart.getTime()  + t.dur    * 86400000)
      const task = await prisma.task.create({
        data: {
          tenantId: tenant.id, projectId: project.id,
          title: t.title, type: t.type,
          status: statusOf(t.prog), progress: t.prog,
          start: tStart, end: tEnd,
          dependencies: i > 0 ? taskIds[i - 1] : undefined,
        },
      })
      taskIds.push(task.id)
    }
  }
  console.log(`✅ Tasks: ${taskDefs.length * projects.length} Gantt tasks (${taskDefs.length}/project)`)

  // ════════════════════════════════════════════════════════
  // PHASE 10 — SUPERVISION MODULE (DSRs, NCRs, IRs)
  // ════════════════════════════════════════════════════════
  let dsrCount = 0, ncrCount = 0, irCount = 0
  const pm0 = pmUsers[0] ?? superAdmin

  for (let pi = 0; pi < projects.length; pi++) {
    const project = projects[pi]

    // ── 5 Daily Site Reports ──────────────────────────────
    const dsrList = [
      { daysAgo: 1,  status: 'APPROVED', weather: 'Clear & Sunny', manpower: 47, work: 'Ground floor column reinforcement placement completed on Axes A–D. Concrete pour for 4 columns carried out after 08:00.',          tomorrow: 'Continue rebar works on Axes E–H. Schedule pre-pour inspection for remaining columns.' },
      { daysAgo: 4,  status: 'APPROVED', weather: 'Hot & Hazy',    manpower: 53, work: 'Formwork assembly for Slab-1 Zone B progressed to 70% completion. MEP sleeves positioned.',                                    tomorrow: 'Complete formwork and fix rebar mesh. Request inspection for Zone B slab pour.' },
      { daysAgo: 7,  status: 'APPROVED', weather: 'Cloudy',        manpower: 39, work: 'Backfilling of peripheral trenches completed. Compaction tests performed and lab results awaited.',                              tomorrow: 'Commence ground-floor masonry block works on Zone A.' },
      { daysAgo: 10, status: 'PENDING',  weather: 'Dusty',         manpower: 61, work: 'Waterproofing membrane applied to basement walls, south side. Quality control inspection ongoing.',                              tomorrow: 'Continue waterproofing on north and east elevations. Install protection board.' },
      { daysAgo: 13, status: 'PENDING',  weather: 'Mild',          manpower: 44, work: 'Pile cap PCP-07 concrete poured. Starter bars inspected and approved by consultant.',                                          tomorrow: 'Proceed with PCP-08 pile cap formwork. Mobilise crane for steel delivery.' },
    ]
    for (const dsr of dsrList) {
      const eng = siteEngs[dsrCount % Math.max(siteEngs.length, 1)] ?? superAdmin
      await prisma.dailyReport.create({
        data: {
          tenantId: tenant.id, projectId: project.id, createdById: eng.id,
          approvedById: dsr.status === 'APPROVED' ? pm0.id : undefined,
          date: d(-dsr.daysAgo), status: dsr.status, serial: dsrCount + 1,
          weather: dsr.weather, totalManpower: dsr.manpower,
          workPerformedToday: dsr.work, plannedWorkTomorrow: dsr.tomorrow,
          safetyStatus: 'COMPLIANT',
          elapsedDays: -dsr.daysAgo + (project.startDate ? Math.floor((Date.now() - project.startDate.getTime()) / 86400000) : 180),
          currentCompletion: project.completionPercent,
          contractorId: ctr1.id,
          contractorData: JSON.stringify({ company: ctr1.companyName, labourers: dsr.manpower - 6, supervisors: 4, hse: 2 }),
          equipment: JSON.stringify([
            { name: 'Tower Crane TC-01', qty: 1, status: 'OPERATIONAL' },
            { name: 'Concrete Mixer',    qty: 2, status: 'OPERATIONAL' },
            { name: 'Excavator CAT 320', qty: 1, status: dsr.daysAgo > 7 ? 'STANDBY' : 'OPERATIONAL' },
            { name: 'Boom Lift',         qty: 1, status: 'OPERATIONAL' },
          ]),
        },
      })
      dsrCount++
    }

    // ── 4 NCRs ────────────────────────────────────────────
    const ncrList = [
      { sev: 'HIGH',  status: 'OPEN',   dOff: -25, desc: `Rebar spacing on Axis C-3→C-7 is 200mm; drawing specifies 150mm max. Contractor must rectify and resubmit for inspection before concrete pour.` },
      { sev: 'MAJOR', status: 'CLOSED', dOff: -40, desc: `Concrete pour on column C-12 proceeded without approved mix design confirmation. Lab cube results obtained post-pour; 7-day strength below spec (25 MPa vs 30 MPa required).` },
      { sev: 'MAJOR', status: 'OPEN',   dOff: -18, desc: `Fire-stopping sealant brand substituted without written approval from consultant. Specified: Hilti CP 601S. Installed: Unspecified alternate brand. Stop-work issued for affected shaft openings.` },
      { sev: 'MINOR', status: 'CLOSED', dOff: -55, desc: `Level 3 slab flatness tolerance: FF25 achieved vs FF30 specified per Section 03300. Remedial grinding carried out; retested and accepted.` },
    ]
    for (let ni = 0; ni < ncrList.length; ni++) {
      const n = ncrList[ni]
      const eng = siteEngs[ni % Math.max(siteEngs.length, 1)] ?? superAdmin
      const ncr = await (prisma as any).nCR.create({
        data: {
          tenantId: tenant.id, projectId: project.id, createdById: eng.id,
          approvedById: n.status === 'CLOSED' ? pm0.id : undefined,
          officeRef: `NCR-${String(pi + 1).padStart(2, '0')}-${String(ni + 1).padStart(3, '0')}`,
          severity: n.sev, description: n.desc, status: n.status, currentRev: 1,
          contractorId: ctr1.id, createdAt: d(n.dOff),
        },
      })
      ncrCount++
      await (prisma as any).nCRRevision.create({
        data: {
          tenantId: tenant.id, ncrId: ncr.id, userId: eng.id,
          respondedById: n.status === 'CLOSED' ? pm0.id : undefined,
          revNumber: 1, status: n.status,
          createdAt: d(n.dOff + 3),
        },
      })
    }

    // ── 5 Inspection Requests ─────────────────────────────
    const irList = [
      { type: 'REINFORCEMENT', status: 'APPROVED',  dOff: -20, desc: 'Ground beam rebar inspection — Grid A–D, Axes 1–5. Confirm bar size, spacing, cover, and splices.' },
      { type: 'CONCRETE_POUR', status: 'APPROVED',  dOff: -35, desc: 'Pre-pour inspection for 1st floor slab Zone B. Verify formwork, MEP sleeves, bar chairs, and cleanliness.' },
      { type: 'FOUNDATION',    status: 'PENDING',   dOff: -8,  desc: 'Pile cap PCP-08 dimensions and blinding concrete verification prior to rebar fix.' },
      { type: 'MASONRY',       status: 'REJECTED',  dOff: -15, desc: 'Block work inspection — Ground floor partitions Zone A. Mortar joint thickness non-compliant (15mm vs 10mm spec).' },
      { type: 'WATERPROOFING', status: 'PENDING',   dOff: -5,  desc: 'Basement waterproofing membrane (West elevation) — inspect prior to backfill. Verify overlap, termination, and protection board.' },
    ]
    for (let ii = 0; ii < irList.length; ii++) {
      const ir = irList[ii]
      const eng = siteEngs[ii % Math.max(siteEngs.length, 1)] ?? superAdmin
      const irRec = await prisma.inspectionRequest.create({
        data: {
          tenantId: tenant.id, projectId: project.id, createdById: eng.id,
          approvedById: ir.status === 'APPROVED' ? pm0.id : undefined,
          type: ir.type, description: ir.desc, status: ir.status,
          serial: ii + 1, currentRev: 1,
          officeRef: `IR-${String(pi + 1).padStart(2, '0')}-${String(ii + 1).padStart(3, '0')}`,
          contractorRef: `CTR-IR-${String(ii + 1).padStart(3, '0')}`,
          date: d(ir.dOff), contractorId: ctr1.id,
        },
      })
      irCount++
      await (prisma as any).iRRevision.create({
        data: {
          tenantId: tenant.id, irId: irRec.id, userId: eng.id,
          respondedById: ir.status !== 'PENDING' ? pm0.id : undefined,
          revNumber: 1, status: ir.status,
          comments: ir.status === 'REJECTED'
            ? 'Mortar joints exceed 10mm tolerance. Contractor to rectify and resubmit per spec section 04210.'
            : ir.status === 'APPROVED'
            ? 'Inspected and found in compliance with drawings and specifications. Approved to proceed.'
            : null,
          createdAt: d(ir.dOff + 1),
        },
      })
    }
  }
  console.log(`✅ Supervision: ${dsrCount} DSRs | ${ncrCount} NCRs (+revisions) | ${irCount} IRs (+revisions)`)

  // ════════════════════════════════════════════════════════
  // PHASE 11 — FINANCIALS (Invoices, Expenses, Milestones, VOs)
  // ════════════════════════════════════════════════════════
  let invCount = 0, expCount = 0
  const expCats = ['Materials', 'Labour', 'Equipment Rental', 'Subcontract', 'Transportation', 'Professional Fees', 'Site Overheads']

  for (let pi = 0; pi < projects.length; pi++) {
    const project = projects[pi]
    const val = project.contractValue

    // 3 invoices per project
    const invoices = [
      { seq: 1, pct: 0.10, desc: 'Advance Payment — 10% Mobilisation',                 status: 'PAID',   dateOff: -90, dueOff: -60, payOff: -75 },
      { seq: 2, pct: 0.20, desc: 'Progress Claim #1 — Foundations & Substructure (20%)',status: 'PAID',   dateOff: -45, dueOff: -15, payOff: -20 },
      { seq: 3, pct: 0.15, desc: 'Progress Claim #2 — Superstructure Levels 1–3 (35%)',status: 'ISSUED', dateOff: -10, dueOff:  20, payOff: null },
    ]
    for (const inv of invoices) {
      const base = val * inv.pct
      const vat  = base * 0.15
      await prisma.invoice.create({
        data: {
          tenantId: tenant.id, projectId: project.id,
          invoiceNumber: `INV-${project.code.split('-').pop()}-${String(inv.seq).padStart(3, '0')}`,
          sequenceNumber: inv.seq, baseAmount: base, vatAmount: vat, totalAmount: base + vat,
          taxRate: 0.15, description: inv.desc,
          date: d(inv.dateOff), dueDate: d(inv.dueOff),
          paymentDate: inv.payOff != null ? d(inv.payOff) : undefined,
          status: inv.status,
        },
      })
      invCount++
    }

    // 4 expenses per project
    for (let e = 0; e < 4; e++) {
      const cat    = expCats[(pi + e) % expCats.length]
      const before = rnd(8000, 55000)
      const tax    = Math.round(before * 0.15)
      await prisma.expense.create({
        data: {
          tenantId: tenant.id, projectId: project.id,
          description: `${cat} — ${project.name}`,
          amountBeforeTax: before, taxAmount: tax, totalAmount: before + tax,
          taxRate: 0.15, isTaxRecoverable: e < 3,
          category: cat, date: d(-(e * 18 + 5)),
        },
      })
      expCount++
    }

    // 3 milestones
    await prisma.milestone.createMany({
      data: [
        { tenantId: tenant.id, projectId: project.id, title: 'Structural Frame Complete',  dueDate: d(90  + pi * 20), status: 'PENDING', amount: val * 0.25, description: '25% payment milestone' },
        { tenantId: tenant.id, projectId: project.id, title: 'MEP First Fix Complete',     dueDate: d(180 + pi * 20), status: 'PENDING', amount: val * 0.20, description: '20% payment milestone' },
        { tenantId: tenant.id, projectId: project.id, title: 'Practical Completion',       dueDate: d(365 + pi * 20), status: 'PENDING', amount: val * 0.15, description: 'Final 15% milestone — completion cert' },
      ],
    })

    // 1 variation order
    await prisma.variationOrder.create({
      data: {
        tenantId: tenant.id, projectId: project.id,
        title: `VO-01 — Additional Ground Anchor Works`,
        description: 'Unforeseen soil conditions require additional ground anchors. Not in original scope.',
        amount: val * 0.03, status: pi % 2 === 0 ? 'APPROVED' : 'PENDING',
        approvedById: pi % 2 === 0 ? pm0.id : undefined,
        approvalDate: pi % 2 === 0 ? d(-20) : undefined,
      },
    })
  }
  console.log(`✅ Finance: ${invCount} invoices | ${expCount} expenses | ${projects.length * 3} milestones | ${projects.length} VOs`)

  // ════════════════════════════════════════════════════════
  // PHASE 12 — SALARY SLIPS (3 months × all employees)
  // ════════════════════════════════════════════════════════
  let slipCount = 0
  for (const profile of profiles) {
    for (let m = 1; m <= 3; m++) {
      const monthDate = new Date()
      monthDate.setDate(1)
      monthDate.setMonth(monthDate.getMonth() - m)
      monthDate.setHours(0, 0, 0, 0)

      const basic   = profile.basicSalary   ?? 10000
      const housing = profile.housingAllowance ?? 0
      const trans   = profile.transportAllowance ?? 0
      const other   = profile.otherAllowance ?? 0
      const income  = basic + housing + trans + other
      const gosi    = basic * 0.1
      const net     = income - gosi

      try {
        await prisma.salarySlip.create({
          data: {
            tenantId: tenant.id, profileId: profile.id, month: monthDate,
            basicSalary: basic, housingAllowance: housing, transportAllowance: trans, otherAllowance: other,
            totalIncome: income, gosiDeduction: gosi,
            penaltiesAmount: 0, loansAmount: 0, absenceAmount: 0,
            totalDeductions: gosi, netSalary: net, status: 'PAID',
          },
        })
        slipCount++
      } catch { /* skip duplicate */ }
    }
  }
  console.log(`✅ Payroll: ${slipCount} salary slips (3 months × ${profiles.length} employees)`)

  // ════════════════════════════════════════════════════════
  // PHASE 13 — LEAVE REQUESTS
  // ════════════════════════════════════════════════════════
  const leaveTypes = ['ANNUAL', 'SICK', 'EMERGENCY']
  for (let i = 1; i < Math.min(6, allUsers.length); i++) {
    await prisma.leaveRequest.create({
      data: {
        tenantId: tenant.id, userId: allUsers[i].id,
        type: leaveTypes[i % 3], status: i < 3 ? 'APPROVED' : 'PENDING',
        startDate: d(i * 5 + 5), endDate: d(i * 5 + 10),
        reason: i % 3 === 0 ? 'Annual leave' : i % 3 === 1 ? 'Medical — doctor certificate attached' : 'Family emergency',
        approverId: i < 3 ? superAdmin.id : undefined,
      },
    })
  }
  console.log(`✅ Leave Requests: 5 leave records seeded`)

  // ════════════════════════════════════════════════════════
  // DONE
  // ════════════════════════════════════════════════════════
  console.log('\n🏁 ══════════════════════════════════════════════════')
  console.log('   FTS DEMO ERP — FULLY ALIVE & POPULATED!')
  console.log('══════════════════════════════════════════════════════')
  console.log(`   Tenant       : ${tenant.name}  (slug: "${tenant.slug}")`)
  console.log(`   Admin Login  : super@topo-eng.sa  /  Demo@1234`)
  console.log(`   Users        : ${allUsers.length}  (incl. super admin)`)
  console.log(`   Roles        : 5 RBAC roles with granular permissions`)
  console.log(`   Settings     : ${settingsData.length} system settings + company profile`)
  console.log(`   Projects     : ${projects.length}  active`)
  console.log(`   Gantt Tasks  : ${taskDefs.length * projects.length}  (${taskDefs.length}/project)`)
  console.log(`   DSRs         : ${dsrCount}`)
  console.log(`   NCRs         : ${ncrCount}  (+ revisions)`)
  console.log(`   IRs          : ${irCount}   (+ revisions)`)
  console.log(`   Invoices     : ${invCount}`)
  console.log(`   Expenses     : ${expCount}`)
  console.log(`   Salary Slips : ${slipCount}`)
  console.log('══════════════════════════════════════════════════════\n')
}

main()
  .catch(e => { console.error('❌ Seed failed:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
