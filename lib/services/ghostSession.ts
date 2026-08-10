/**
 * Ghost Session Protection
 * 
 * Shared utility to detect and auto-release "ghost" table sessions.
 * A ghost session = table marked ACTIVE but with ZERO orders placed,
 * idle for more than GHOST_TIMEOUT_MS (5 minutes).
 * 
 * Used by:
 *  - /api/tables (customer-facing)
 *  - /api/manager (manager dashboard)
 */

import { PrismaClient } from "@prisma/client";

const GHOST_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export interface GhostTable {
    id: string;
    tableCode: string;
    idleMinutes: number;
}

/**
 * Scans tables in-memory and identifies ghost sessions.
 * Mutates the table objects in-place (sets status to VACANT).
 * Returns the list of ghost table IDs for DB cleanup.
 */
export function detectGhostSessions(tables: Record<string, unknown>[]): GhostTable[] {
    const now = Date.now();
    const ghosts: GhostTable[] = [];

    for (const t of tables) {
        const isActive = t.status === "ACTIVE";
        const orders = t.orders as Record<string, unknown>[] | undefined;
        const firstOrderItems = (orders?.[0]?.items) as Record<string, unknown>[] | undefined;
        const hasNoOrders = !orders || orders.length === 0 || (firstOrderItems && firstOrderItems.length === 0);
        const updatedTime = t.updatedAt ? new Date(t.updatedAt as string | number | Date).getTime() : now;
        const idleMs = now - updatedTime;
        const isExpired = idleMs > GHOST_TIMEOUT_MS;

        if (isActive && hasNoOrders && isExpired) {
            ghosts.push({
                id: String(t.id || ''),
                tableCode: String(t.tableCode || t.code || "??"),
                idleMinutes: Math.floor(idleMs / 60000),
            });
            // Mutate in-memory for immediate response accuracy
            t.status = "VACANT";
        }
    }

    return ghosts;
}

/**
 * Resets ghost tables in the database (fire-and-forget).
 * Non-blocking — errors are logged but don't throw.
 */
export function releaseGhostTables(db: PrismaClient | Record<string, unknown>, ghosts: GhostTable[]): void {
    if (ghosts.length === 0) return;

    const ghostIds = ghosts.map(g => g.id);
    const ghostCodes = ghosts.map(g => `${g.tableCode}(${g.idleMinutes}m)`).join(", ");

    const dbTable = (db as Record<string, unknown>).table as { updateMany: (args: Record<string, unknown>) => Promise<{ count: number }> };

    dbTable.updateMany({
        where: { id: { in: ghostIds } },
        data: { status: "VACANT", updatedAt: new Date() }
    }).then((result: { count: number }) => {
        console.log(`[GHOST_SESSION] ♻️ Auto-released ${result.count} abandoned tables: ${ghostCodes}`);
    }).catch((err: Error) => {
        console.error("[GHOST_SESSION] ✗ Failed to release ghost tables:", err.message);
    });
}

/**
 * One-call convenience: detect + release ghost sessions.
 * Returns the ghost table list for optional logging/alerts.
 */
export function cleanupGhostSessions(tables: Record<string, unknown>[], db: PrismaClient | Record<string, unknown>): GhostTable[] {
    const ghosts = detectGhostSessions(tables);
    releaseGhostTables(db, ghosts);

    // Run parallel async cleanup for expired QR Sessions
    const dbQrSession = (db as Record<string, unknown>).qRSession as { updateMany: (args: Record<string, unknown>) => Promise<{ count: number }> } | undefined;
    if (dbQrSession?.updateMany) {
        dbQrSession.updateMany({
            where: { isActive: true, expiresAt: { lt: new Date() } },
            data: { isActive: false }
        }).then((result: { count: number }) => {
            if (result.count > 0) console.log(`[QR_SESSION] 🧹 Auto-expired ${result.count} stale QR sessions.`);
        }).catch((err: Error) => {
            console.error("[QR_SESSION] ✗ Failed to auto-expire sessions:", err.message);
        });
    }

    return ghosts;
}
