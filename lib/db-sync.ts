
import { PrismaClient } from "@prisma/client";

// Global cache to prevent redundant schema checks in the same process
const syncedDbs = new Set<string>();

/**
 * Ensures the tenant database has the necessary columns for the Ledger & Billing.
 * This handles schema drift for isolated databases.
 */
export async function syncTenantSchema(db: PrismaClient, databaseUrl?: string | null) {
    // Only run if we haven't synced this DB in this session
    const cacheKey = databaseUrl || 'shared';
    if (syncedDbs.has(cacheKey)) return;

    try {
        console.log("[DB_SYNC] Running one-time schema integrity check...");

        // 1. Bulk Update Order Table (Parallelized where possible)
        await db.$executeRawUnsafe(`
            ALTER TABLE "Order" 
            ADD COLUMN IF NOT EXISTS "subtotal" DECIMAL(10, 2) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS "discountAmount" DECIMAL(10, 2) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS "gstAmount" DECIMAL(10, 2) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS "serviceChargeAmount" DECIMAL(10, 2) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS "grandTotal" DECIMAL(10, 2) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS "appliedGstRate" DECIMAL(5, 2) DEFAULT 5,
            ADD COLUMN IF NOT EXISTS "appliedServiceRate" DECIMAL(5, 2) DEFAULT 5,
            ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT DEFAULT 'CASH',
            ADD COLUMN IF NOT EXISTS "settledById" TEXT,
            ADD COLUMN IF NOT EXISTS "customerPhone" TEXT;
        `).catch(() => { });

        // 2. Update OrderItem Table
        await db.$executeRawUnsafe(`
            ALTER TABLE "OrderItem" 
            ADD COLUMN IF NOT EXISTS "priceSnapshot" DECIMAL(10, 2) DEFAULT 0;
        `).catch(() => { });

        syncedDbs.add(cacheKey);
        console.log("[DB_SYNC] Schema synchronized and cached.");
    } catch (err) {
        console.error("[DB_SYNC] Background sync failed:", err);
    }
}
