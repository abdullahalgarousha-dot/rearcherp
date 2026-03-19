# SaaS ERP System Documentation
**White-label SaaS ERP for Architectural & Engineering Consulting Offices**

## Executive Summary
This application is a comprehensive, white-label SaaS Enterprise Resource Planning (ERP) system tailored specifically for Architectural and Engineering consulting offices. It centralizes operations, project management (both Design and Supervision), Field Supervision workflows (Daily Reports, IRs, NCRs), Human Resources, and Financial management into a single unified workspace. As a fully white-labeled solution, it allows Super Administrators to dynamically rebrand the platform (Company Name, Logo, VAT settings) and customize master lookup lists without touching the underlying source code.

## Core Technologies
- **Framework**: Next.js 14+ (App Router)
- **Compiler**: Turbopack
- **Language**: TypeScript
- **Database ORM**: Prisma (connected to SQLite for development, scalable to PostgreSQL)
- **Authentication**: NextAuth.js (Auth.js v5) with secure credential hashing (bcryptjs)
- **Styling**: Tailwind CSS & shadcn/ui components
- **State Management & Data Fetching**: React Server Components (RSC) & Server Actions

## Database Architecture (Prisma)
The database schema is highly relational and modularized. The core entity mapping revolves around the `User` and `Project` models:
- **`User` / `EmployeeProfile`**: The authentication identity (`User`) has a one-to-one relationship with `EmployeeProfile`, which stores all specialized HR data (hire date, salary breakdown, subordinates).
- **`Role` / `RolePermission`**: Replaces hardcoded enums. Each `User` links to a `Role` with a dynamic `permissionMatrix` and explicit `RolePermission` records controlling read/write/approve capabilities per module.
- **`Project` / `Brand`**: Projects group under independent Brands. Projects contain multiple linked collections depending on their `serviceType` (Tasks, DailyReports, NCRs).
- **`TimeLog` / `WorkLog` / `SalarySlip`**: Finance tracking intersects with HR here. TimeLogs track billable engineering hours against project budgets, while SalarySlips aggregate static allowances.

## Module 1: HR & Employee Management
The Human Resources module operates as a 360-degree Employee Portal.
- **Employee Profile**: Centralizes personal information, document validity (passport, ID, insurance), and the financial breakdown (Basic, Housing, Transport, GOSI deductions).
- **Direct Manager Hierarchy**: Employs an adjacency list structure where an `EmployeeProfile` maps to a `directManagerId`.
- **Leave, Loan & Document Requests**: Unified ticketing systems (`LeaveRequest`, `LoanRequest`, `DocumentRequest`).
- **Approval Workflow**: Submissions initiate a dynamic state machine. Requests initially flag as `PENDING_MANAGER`. Once approved by the direct manager (or bypassing immediately to `PENDING_HR` if no manager exists), they shift to the HR department. Loans include an explicit additional tier (`PENDING_FINANCE`).

## Module 2: Dynamic RBAC (Role-Based Access Control)
The application secures routing and component visibility through a robust RBAC middleware.
- **Role Engine**: The `Role` model holds a `permissionMatrix` (JSON) and explicit `RolePermission` entries defining granular `canRead`, `canWrite`, `canApprove` rules per domain.
- **Sidebar & Routing**: `AppShell` evaluates the logged-in user's token. Server-side checks dictate which `MenuLink` records render. Direct URL access by unauthorized roles triggers redirects via `checkAuth()` wrappers in Server Actions and Page components.

## Module 3: Project Management
Projects act as the central operational hub, distinguishing between distinct disciplines.
- **Creation Logic**: Projects are explicitly configured as `DESIGN`, `SUPERVISION`, or `BOTH`. 
- **Dynamic Render**: Financial arrays conditionally render based on the `serviceType`. Design projects emphasize total contract packages, whereas Supervision projects expose options for Monthly Retainers or strict package billing.
- **Design Stages**: `DesignStage` models are dynamically manageable Kanbans (user can add/rename/delete columns). Project managers can freely associate timeline `Task` items and project deliverables directly to a dynamic phase.

## Module 4: Field Supervision Workspace
A specialized portal for on-site execution and contractor monitoring.
- **Daily Consultant Reports (DSR)**: Captures weather, performed work, staff/labor breakdown, and equipment logs. Automatically tracks completion percentages and timeline slippages.
- **Inspection Requests (IR)**: Workflow for material and workmanship inspections. Statuses track standard engineering lifecycles (PENDING, APPROVED, REVISE_RESUBMIT).
- **Non-Conformance Reports (NCR)**: Documents severe structural or operational deviations with severity tracking, root cause analysis logs, and a linked revision table for corrective actions.
- **Contractor Linking**: Independent `Contractor` profiles manage vendor details securely. These are tied to specific operation hubs through the `ProjectContractor` intersection table defining sub-contract spans.

## Module 5: Financial Operations
Secure internal portal locking down fiscal tracking and macro-profitability calculations.
- **Automated VAT & Invoicing**: Invoices and ledgers pull the unified `vatPercentage` from `SystemSetting` dynamically rather than parsing static constants. Required for dynamic Date-filtered tax generation.
- **Estimated Project Costs**: Integrates broadly into the HR module. Time logged by engineers correlates globally to overhead using their secure `hourlyRate` from their `EmployeeProfile`, calculating gross profitability margins reliably for Accounting.
- **Payroll Generator**: Cron-equivalent server generator that retrieves active Employees and aggregates their Basic Salary, Allowances, and GOSI, cleanly reconciling approved Active `Loan` deductions or `Penalty` adjustments into an immutable `SalarySlip` ledger.

## Module 6: SaaS Master Settings (White-labeling)
Designed for horizontal multi-tenant scaling and instance personalization.
- **Singleton SystemSettings**: Global features like `companyNameEn`, `logoUrl`, and global taxes exist as singletons within `SystemSetting`. Modifying these in the Admin UI instantly injects changes globally across layouts, specifically rewriting the Next.js `<title>` metadata, NextAuth Login headers, and Sidebar branding dynamically via React Server Components.
- **SystemLookups**: Replaces static application arrays mapping core Dropdowns (e.g., Engineering Disciplines, Document Types). Administrators can activate, deactivate, or insert Dropdown options rapidly via the `SystemLookup` datatable, instantly shifting validation payloads across the entire ERP workspace.
