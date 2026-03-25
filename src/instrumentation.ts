/**
 * Next.js instrumentation hook — runs once on server startup (Node.js runtime only).
 * Used to apply one-time DB schema fixups that can't be expressed in prisma db push
 * without data loss warnings (e.g., making stale NOT NULL columns nullable).
 */
export async function register() {
    if (process.env.NEXT_RUNTIME === "nodejs") {
        try {
            const { db } = await import("@/lib/db")
            // Make legacy "entityTypeId" column nullable on Client table.
            // This column was removed from the Prisma schema but the live DB still
            // has it as NOT NULL, causing every client.create() to crash.
            await (db as any).$executeRawUnsafe(
                `ALTER TABLE "Client" ALTER COLUMN "entityTypeId" DROP NOT NULL`
            )
            console.log("[instrumentation] Client.entityTypeId made nullable.")
        } catch {
            // Silently ignore: column doesn't exist, already nullable, or non-Postgres
        }
    }
}
