/**
 * Tables API — Production-Grade
 * GET  /api/tables         → List tables (tenant-isolated, fast)
 * POST /api/tables         → Create table (manager/admin only)
 * 
 * Security:
 * - Every query is tenant-scoped via clientId from signed cookie/JWT
 * - Performance logging on every request
 * - Connection pooling via Neon adapter
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma, getDb, ensureClientSynced } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";
import { requireRole } from "@/lib/auth";
import { hasReachedLimit, PLAN_LIMITS } from "@/lib/subscription";
import { ClientPlan } from "@prisma/client";

// ============================================
// GET /api/tables — Fast Discovery
// ============================================

export async function GET(request: NextRequest): Promise<NextResponse> {
    const startTime = Date.now();

    try {
        // 1. Tenant Resolution (cryptographic, no guessing)
        const tenant = await getTenantFromRequest();

        if (!tenant) {
            console.warn("[TABLES_GET] ✗ No tenant resolved. Blocking.");
            return NextResponse.json(
                { success: false, error: "Session expired. Please re-enter your access code." },
                { status: 401 }
            );
        }

        const db = getDb();
        const { searchParams } = new URL(request.url);
        const tableCode = searchParams.get("code");

        // 2. Build tenant-scoped query
        let where: any = { clientId: tenant.id, deletedAt: null };

        if (tableCode) {
            // Smart Matching: Handle "4", "04", "T-04", "T04"
            const raw = tableCode.trim();
            const paddedCode = raw.padStart(2, '0');
            where = {
                clientId: tenant.id,    // ← ALWAYS tenant-scoped
                deletedAt: null,
                OR: [
                    { tableCode: { equals: raw, mode: 'insensitive' } },
                    { tableCode: { equals: `T-${raw}`, mode: 'insensitive' } },
                    { tableCode: { equals: `T-${paddedCode}`, mode: 'insensitive' } },
                    { tableCode: { equals: paddedCode, mode: 'insensitive' } },
                    { tableCode: { equals: `T${raw}`, mode: 'insensitive' } },
                    { tableCode: { equals: `T${paddedCode}`, mode: 'insensitive' } },
                ]
            };
        }

        // 3. Optimized query — only select what we need
        const tables = await (db.table as any).findMany({
            where,
            select: {
                id: true,
                tableCode: true,
                capacity: true,
                status: true,
                assignedWaiterId: true,
                updatedAt: true,
                orders: {
                    where: {
                        status: { notIn: ["CLOSED", "CANCELLED"] }
                    },
                    select: {
                        id: true,
                        customerName: true,
                        status: true,
                    },
                    take: 1,
                    orderBy: { createdAt: 'desc' }
                }
            },
            orderBy: { tableCode: "asc" },
        });

        // ─── Ghost Session Protection (Shared Utility) ───
        const { cleanupGhostSessions } = await import("@/lib/services/ghostSession");
        cleanupGhostSessions(tables, db);

        // 4. Format response (minimal payload for speed)
        const formattedTables = tables.map((t: any) => ({
            id: t.id,
            tableCode: t.tableCode,
            capacity: t.capacity ?? 4,
            status: t.status,
            activeOrder: t.orders[0] || null,
            assignedWaiterId: t.assignedWaiterId,
            claimedAt: t.status === "ACTIVE" && (!t.orders || t.orders.length === 0) ? t.updatedAt : null,
        }));


        const elapsed = Date.now() - startTime;
        console.log(`[TABLES_GET] ✓ ${tenant.name} | ${formattedTables.length} tables | ${elapsed}ms`);

        // 5. Set cache headers for speed (stale-while-revalidate)
        const response = NextResponse.json({
            success: true,
            tables: formattedTables,
            _meta: { resolvedIn: `${elapsed}ms`, tenant: tenant.name }
        });

        // Cache for 2 seconds, serve stale for 10 seconds while revalidating
        response.headers.set('Cache-Control', 'private, s-maxage=2, stale-while-revalidate=10');

        return response;

    } catch (error: any) {
        const elapsed = Date.now() - startTime;
        console.error(`[TABLES_GET] ✗ Error after ${elapsed}ms:`, error.message);
        return NextResponse.json(
            { success: false, error: "Failed to fetch tables. Please try again." },
            { status: 500 }
        );
    }
}

// ============================================
// POST /api/tables — Create Table (Staff Only)
// ============================================

export async function POST(request: NextRequest) {
    const startTime = Date.now();

    try {
        // 1. Auth gate — only Manager/Admin can create tables
        const user = await requireRole(["MANAGER", "ADMIN"]);
        const { tableCode, capacity } = await request.json();

        if (!tableCode || !capacity) {
            return NextResponse.json(
                { success: false, error: "Table code and capacity are required." },
                { status: 400 }
            );
        }

        const db = getDb();


        // 3. Subscription limit check
        const tableCount = await (db.table as any).count({
            where: { clientId: user.clientId, deletedAt: null }
        });

        if (hasReachedLimit(user.plan as any, 'maxTables', tableCount)) {
            return NextResponse.json({
                success: false,
                error: "Plan Limit Reached",
                message: `Your plan allows max ${PLAN_LIMITS[user.plan as ClientPlan].maxTables} tables.`
            }, { status: 403 });
        }

        // 4. Duplicate check (tenant-scoped)
        const existing = await (db.table as any).findFirst({
            where: {
                clientId: user.clientId,
                tableCode: { equals: tableCode, mode: 'insensitive' }
            }
        });

        if (existing) {
            return NextResponse.json(
                { success: false, error: `Table "${tableCode}" already exists.` },
                { status: 409 }
            );
        }

        // 5. Create table
        const table = await (db.table as any).create({
            data: {
                clientId: user.clientId,
                tableCode: tableCode.trim(),
                capacity: Number(capacity),
                status: "VACANT"
            }
        });

        const elapsed = Date.now() - startTime;
        console.log(`[TABLES_CREATE] ✓ ${tableCode} created | ${elapsed}ms`);

        return NextResponse.json({ success: true, table });

    } catch (error: any) {
        const elapsed = Date.now() - startTime;
        console.error(`[TABLES_CREATE] ✗ Error after ${elapsed}ms:`, error.message);
        return NextResponse.json(
            { success: false, error: error.message || "Failed to create table" },
            { status: 500 }
        );
    }
}
