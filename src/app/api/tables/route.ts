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
import { getDb } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";
import { requireRole } from "@/lib/auth";
import { hasReachedLimit, PLAN_LIMITS } from "@/lib/subscription";
import { ClientPlan } from "@prisma/client";
import { generateSecretToken, generateShortCode, signPayload, buildQrUrl } from "@/lib/qr";

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
        const sectionParam = searchParams.get("section");

        // 2. Build tenant-scoped query
        const where: Record<string, unknown> = { clientId: tenant.id, deletedAt: null };

        if (sectionParam) {
            where.section = { equals: sectionParam.trim(), mode: 'insensitive' };
        }

        if (tableCode) {
            // Smart Matching: Handle "4", "04", "T-04", "T04"
            const raw = tableCode.trim();
            const paddedCode = raw.padStart(2, '0');
            where.OR = [
                { tableCode: { equals: raw, mode: 'insensitive' } },
                { tableCode: { equals: `T-${raw}`, mode: 'insensitive' } },
                { tableCode: { equals: `T-${paddedCode}`, mode: 'insensitive' } },
                { tableCode: { equals: paddedCode, mode: 'insensitive' } },
                { tableCode: { equals: `T${raw}`, mode: 'insensitive' } },
                { tableCode: { equals: `T${paddedCode}`, mode: 'insensitive' } },
            ];
        }

        // 3. Optimized query — only select what we need
        const dbClient = db as unknown as { table: { findMany: (args: Record<string, unknown>) => Promise<Record<string, unknown>[]> } };
        const tables = await dbClient.table.findMany({
            where,
            select: {
                id: true,
                tableCode: true,
                capacity: true,
                status: true,
                section: true,
                assignedWaiterId: true,
                updatedAt: true,
                orders: {
                    where: {
                        status: { notIn: ["CLOSED", "CANCELLED"] }
                    },
                    select: {
                        id: true,
                        customerName: true,
                        customerPhone: true,
                        status: true,
                        createdAt: true,
                        items: {
                            select: {
                                id: true,
                                menuItemId: true,
                                itemName: true,
                                priceSnapshot: true,
                                quantity: true,
                            }
                        }
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
        const formattedTables = tables.map((t: Record<string, unknown>) => ({
            id: t.id,
            tableCode: t.tableCode,
            capacity: t.capacity ?? 4,
            status: t.status,
            section: t.section || "Main Floor",
            activeOrder: (t.orders as Record<string, unknown>[])?.[0] || null,
            assignedWaiterId: t.assignedWaiterId,
            claimedAt: t.status === "ACTIVE" && (!t.orders || (t.orders as Record<string, unknown>[]).length === 0) ? t.updatedAt : null,
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

    } catch (error: unknown) {
        const err = error as Error;
        const elapsed = Date.now() - startTime;
        console.error(`[TABLES_GET] ✗ Error after ${elapsed}ms:`, err.message);
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
    let inputTableCode = '';

    try {
        // 1. Auth gate — only Manager/Admin can create tables
        const user = await requireRole(["MANAGER", "ADMIN"]);
        const { tableCode, capacity, floorId, section } = await request.json();
        inputTableCode = tableCode ? String(tableCode).trim() : '';

        if (!tableCode || !capacity) {
            return NextResponse.json(
                { success: false, error: "Table code and capacity are required." },
                { status: 400 }
            );
        }

        const db = getDb();
        const dbClient = db as unknown as {
            table: {
                count: (args: Record<string, unknown>) => Promise<number>;
                findFirst: (args: Record<string, unknown>) => Promise<Record<string, unknown> | null>;
                create: (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
            };
            qRCode: {
                findUnique: (args: Record<string, unknown>) => Promise<Record<string, unknown> | null>;
                create: (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
            };
        };

        // 3. Subscription limit check
        const tableCount = await dbClient.table.count({
            where: { clientId: user.clientId, deletedAt: null }
        });

        if (hasReachedLimit(user.plan as ClientPlan, 'maxTables', tableCount)) {
            return NextResponse.json({
                success: false,
                error: "Plan Limit Reached",
                message: `Your plan allows max ${PLAN_LIMITS[user.plan as ClientPlan].maxTables} tables.`
            }, { status: 403 });
        }

        // 4. Duplicate & Section-disambiguation check
        const targetSection = section?.trim() || 'Main Floor';
        const rawCode = tableCode.trim();

        // Check if exact same code exists in the SAME section
        const sameSectionDuplicate = await dbClient.table.findFirst({
            where: {
                clientId: user.clientId,
                deletedAt: null,
                section: { equals: targetSection, mode: 'insensitive' },
                OR: [
                    { tableCode: { equals: rawCode, mode: 'insensitive' } },
                    { tableCode: { equals: `${rawCode} (${targetSection})`, mode: 'insensitive' } },
                ]
            }
        });

        if (sameSectionDuplicate) {
            return NextResponse.json(
                { success: false, error: `Table "${rawCode}" already exists in ${targetSection}.` },
                { status: 409 }
            );
        }

        // Check if rawCode exists anywhere for this client (due to DB unique constraint on clientId + tableCode)
        let finalTableCode = rawCode;
        const globalDuplicate = await dbClient.table.findFirst({
            where: {
                clientId: user.clientId,
                deletedAt: null,
                tableCode: { equals: rawCode, mode: 'insensitive' }
            }
        });

        if (globalDuplicate) {
            // Disambiguate for DB unique constraint while keeping clear section context
            finalTableCode = `${rawCode} (${targetSection})`;
        }

        // 5. Create table (with section and optional floor assignment)
        const table = await dbClient.table.create({
            data: {
                clientId: user.clientId,
                tableCode: finalTableCode,
                capacity: Number(capacity),
                section: targetSection,
                status: "VACANT",
                ...(floorId ? { floorId } : {}),
            },
            include: {
                floor: true
            }
        });

        // 6. Automatically generate a QR Code for this new table
        const tableObj = table as { id: string; tableCode: string; floor?: { prefix?: string } };
        const prefix = tableObj.floor?.prefix || 'TB';
        const secretToken = generateSecretToken();
        let shortCode = generateShortCode(prefix, String(tableObj.tableCode || inputTableCode));

        // Ensure shortCode uniqueness
        const existingShort = await dbClient.qRCode.findUnique({ where: { shortCode } });
        if (existingShort) {
            shortCode = `${shortCode}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
        }

        const qrCode = await dbClient.qRCode.create({
            data: {
                clientId: user.clientId,
                tableId: table.id,
                secretToken,
                shortCode,
                version: 1,
                isActive: true,
                createdBy: user.id,
            },
        });

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const signature = signPayload(secretToken, shortCode, 1);
        const qrUrl = buildQrUrl(baseUrl, shortCode, secretToken, 1, signature);

        const elapsed = Date.now() - startTime;
        console.log(`[TABLES_CREATE] ✓ ${finalTableCode} created with Auto-QR | ${elapsed}ms`);

        return NextResponse.json({
            success: true,
            table: {
                ...table,
                qrCodes: [{ ...qrCode, url: qrUrl }]
            }
        });

    } catch (error: unknown) {
        const err = error as Error & { code?: string };
        const elapsed = Date.now() - startTime;
        console.error(`[TABLES_CREATE] ✗ Error after ${elapsed}ms:`, err.message);
        if (err?.code === 'P2002') {
            return NextResponse.json(
                { success: false, error: `Table "${inputTableCode || 'code'}" already exists. Please enter a unique table code.` },
                { status: 409 }
            );
        }
        return NextResponse.json(
            { success: false, error: err.message || "Failed to create table" },
            { status: 500 }
        );
    }
}
