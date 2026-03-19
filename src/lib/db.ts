import { PrismaClient } from "@prisma/client"

// Generate standard generic client
const prismaClientSingleton = () => {
    return new PrismaClient({
        // log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    })
}

declare global {
    var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

// Instantiate base client
const baseClient = globalThis.prisma ?? prismaClientSingleton()

import { getTenantContext } from "./tenant-context"

// Apply Prisma Client Extension for Row-Level Security (RLS) & Automatic Tenant Isolation
export const db = baseClient.$extends({
    query: {
        $allModels: {
            async $allOperations({ model, operation, args, query }) {
                const tenantId = getTenantContext();

                // 1. PostgreSQL RLS (Session Variable)
                if (tenantId) {
                    try {
                        await baseClient.$executeRawUnsafe(`SET LOCAL app.current_tenant_id = '${tenantId}'`);
                    } catch (e) {
                        // Silent skip for non-postgres drivers (though we are strictly PostgreSQL now)
                    }
                }

                // 2. Isolation Shield: Automatic tenantId Injection
                // Skip for internal models or models without tenantId (Tenant, SystemSettings, etc.)
                const bypassModels = ['Tenant', 'SystemSettings', 'CompanyProfile', 'SystemLookup', 'LoginAttempt', 'SystemLog'];
                if (tenantId && !bypassModels.includes(model)) {
                    // Inject into 'where' for read/update/delete
                    if (['findMany', 'findFirst', 'findUnique', 'count', 'update', 'updateMany', 'delete', 'deleteMany'].includes(operation)) {
                        (args as any).where = { ...(args as any).where, tenantId };
                    }
                    // Inject into 'data' for create
                    if (['create', 'createMany', 'upsert'].includes(operation)) {
                        if (operation === 'upsert') {
                            (args as any).create = { ...(args as any).create, tenantId };
                            (args as any).update = { ...(args as any).update, tenantId };
                        } else if (operation === 'createMany') {
                            if (Array.isArray((args as any).data)) {
                                (args as any).data = (args as any).data.map((item: any) => ({ ...item, tenantId }));
                            }
                        } else {
                            (args as any).data = { ...(args as any).data, tenantId };
                        }
                    }
                }

                return query(args)
            }
        }
    }
})


if (process.env.NODE_ENV !== "production") globalThis.prisma = baseClient
