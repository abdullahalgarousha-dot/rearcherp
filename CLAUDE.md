# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (binds 0.0.0.0:3000)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint via next lint

npx prisma db push   # Apply schema changes to SQLite (dev.db)
npx prisma generate  # Regenerate Prisma Client after schema edits
npx prisma studio    # Visual DB browser

# Seed scripts (run with tsx)
npx tsx prisma/seed.ts
npx tsx scripts/create-admin.ts
```

If the port is in use, kill stale Node processes: `taskkill /F /IM node.exe` (Windows).

## Architecture Overview

**Stack**: Next.js App Router + TypeScript + Prisma (SQLite/dev, PostgreSQL/prod) + NextAuth v5 + Tailwind + shadcn/ui.

### Directory Layout

- `src/app/` — App Router pages and Server Actions (`actions/`)
- `src/components/` — UI components grouped by domain (`hr/`, `projects/`, `finance/`, `supervision/`, `timeline/`, `crm/`, `settings/`)
- `src/lib/` — Core utilities: `db.ts` (Prisma client singleton), `rbac.ts` (permission system), `auth-guard.ts`, `payroll-calculator.ts`, `google-drive.ts`, `zatca.ts`
- `src/auth.ts` — NextAuth configuration with credentials provider and JWT callbacks
- `prisma/schema.prisma` — Single source of truth for the data model
- `scripts/` — One-off admin/migration scripts run with `tsx`

### Multi-Tenancy

Every `User` belongs to a `Tenant`. The JWT token carries `tenantId`, `planModules` (feature flags), and `tenantStatus`. All data queries must be scoped by `tenantId`. The `(super-admin)` route group is for the global SaaS operator and bypasses tenant scoping.

### Auth & RBAC

- Auth lives in `src/auth.ts`. The emergency super-admin bypass uses env vars `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD`.
- Role permissions are resolved in `src/lib/rbac.ts`. The `PermissionMatrix` interface defines all module-level capabilities. Custom permissions stored in `userRole.permissionMatrix` (JSON) take precedence over the hardcoded role defaults in `ROLE_PERMISSIONS_MAP`.
- Route protection uses `checkAuth()` wrappers in Server Actions and page components.
- `middleware.ts` handles session-based redirects at the edge.

### Data Patterns

- Prisma Client is a singleton in `src/lib/db.ts`.
- Server Actions (in `src/app/actions/`) are the primary mutation path — no separate REST API layer.
- `SystemSetting` and `SystemLookup` are global singletons controlling white-label branding, VAT, and all dropdown options across the app.
- JSON fields in the DB (e.g., `permissionMatrix`, `task.dependencies`) must be safely parsed — never call `JSON.parse()` on a DB string without a try/catch or format validation first.

### Key Domain Models

| Model | Purpose |
|-------|---------|
| `User` + `EmployeeProfile` | Auth identity + HR data |
| `Role` + `RolePermission` | Dynamic RBAC |
| `Tenant` + `Plan` | Multi-tenant SaaS subscription |
| `Project` + `Brand` | Core operational entity |
| `DesignStage` + `Task` | Kanban/Gantt for design pipeline |
| `DailyReport` / `InspectionRequest` / `NCR` | Field supervision workflows |
| `SalarySlip` + `TimeLog` | Payroll and billable hours |
| `SystemSetting` + `SystemLookup` | White-label config and dynamic dropdowns |
