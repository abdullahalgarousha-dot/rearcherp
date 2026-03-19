import { PrismaClient } from "@prisma/client"
import { getTenantContext } from "./tenant-context"

const prismaClientSingleton = () => {
    return new PrismaClient()
}

declare global {
    var prisma: undefined | ReturnType<typeof prismaClientSingleton>
    var db: undefined | any
}

// Singleton base client
const baseClient = globalThis.prisma ?? prismaClientSingleton()
if (process.env.NODE_ENV !== "production") globalThis.prisma = baseClient

// Singleton extended client (with tenant isolation extension)
const buildDb = () => baseClient.$extends({
    query: {
        $allModels: {
            async $allOperations({ model, operation, args, query }) {
                const tenantId = getTenantContext()

                // PostgreSQL RLS session variable
                if (tenantId) {
                    try {
                        await baseClient.$executeRawUnsafe(
                            `SET LOCAL app.current_tenant_id = '${tenantId}'`
                        )
                    } catch {
                        // silent — non-postgres drivers
                    }
                }

                // Automatic tenantId injection — skip global/system models
                const bypassModels = [
                    "Tenant", "SystemSettings", "CompanyProfile",
                    "SystemLookup", "LoginAttempt", "SystemLog",
                ]
                if (tenantId && !bypassModels.includes(model)) {
                    if (
                        ["findMany", "findFirst", "findUnique", "count",
                         "update", "updateMany", "delete", "deleteMany"].includes(operation)
                    ) {
                        ;(args as any).where = { ...(args as any).where, tenantId }
                    }
                    if (["create", "createMany", "upsert"].includes(operation)) {
                        if (operation === "upsert") {
                            ;(args as any).create = { ...(args as any).create, tenantId }
                            ;(args as any).update = { ...(args as any).update, tenantId }
                        } else if (operation === "createMany") {
                            if (Array.isArray((args as any).data)) {
                                ;(args as any).data = (args as any).data.map(
                                    (item: any) => ({ ...item, tenantId })
                                )
                            }
                        } else {
                            ;(args as any).data = { ...(args as any).data, tenantId }
                        }
                    }
                }

                return query(args)
            },
        },
    },
})

export const db: ReturnType<typeof buildDb> =
    globalThis.db ?? (globalThis.db = buildDb())
