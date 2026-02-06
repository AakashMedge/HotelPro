/**
 * Tables API
 * 
 * GET /api/tables - Get all tables with their status
 * GET /api/tables/[tableCode] - Get a specific table by code
 * 
 * Public endpoint for QR-based ordering.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

interface TableResponse {
    id: string;
    tableCode: string;
    capacity: number;
    status: string;
}

interface TablesListResponse {
    success: boolean;
    tables?: TableResponse[];
    error?: string;
}

/**
 * GET /api/tables
 * 
 * Get all tables with their current status.
 */
export async function GET(
    request: NextRequest
): Promise<NextResponse<TablesListResponse>> {
    try {
        // 1. Detect Tenant (Multi-Tenancy)
        let tenant = await getTenantFromRequest();

        const { searchParams } = new URL(request.url);
        const tableCode = searchParams.get("code");

        // If no tenant is identified, we enter "Discovery Mode"
        // This is crucial for localhost/QR scans where the hotel isn't in the URL.
        if (!tenant && tableCode) {
            // Search all tables for this code to identify the hotel
            const discoveryTable = await prisma.table.findFirst({
                where: {
                    deletedAt: null,
                    OR: [
                        { tableCode: { equals: tableCode, mode: 'insensitive' } },
                        { tableCode: { equals: `T-${tableCode}`, mode: 'insensitive' } }
                    ]
                },
                select: { clientId: true }
            });

            if (discoveryTable) {
                const client = await prisma.client.findUnique({
                    where: { id: discoveryTable.clientId },
                    select: { id: true, name: true, slug: true, plan: true }
                });
                if (client) tenant = client;
            }
        }

        if (!tenant) {
            return NextResponse.json({ success: false, error: "Identifying hotel failed. Please specify table or visit the hotel URL." }, { status: 400 });
        }

        let where: any = { clientId: tenant.id, deletedAt: null };
        if (tableCode) {
            // Smart Matching: Handle "4", "04", and "T-04"
            const paddedCode = tableCode.padStart(2, '0');
            where = {
                clientId: tenant.id,
                deletedAt: null,
                OR: [
                    { tableCode: { equals: tableCode, mode: 'insensitive' } },
                    { tableCode: { equals: `T-${tableCode}`, mode: 'insensitive' } },
                    { tableCode: { equals: `T-${paddedCode}`, mode: 'insensitive' } },
                    { tableCode: { equals: paddedCode, mode: 'insensitive' } }
                ]
            };
        }

        const tables = await prisma.table.findMany({
            where,
            include: {
                client: { select: { slug: true } },
                orders: {
                    where: {
                        status: {
                            notIn: ["CLOSED"]
                        }
                    },
                    select: {
                        id: true,
                        customerName: true,
                        sessionId: true,
                        status: true,
                    },
                    take: 1,
                    orderBy: { createdAt: 'desc' }
                }
            },
            orderBy: {
                tableCode: "asc",
            },
        });

        // Map and ensure capacity exists
        const formattedTables = tables.map(t => ({
            id: t.id,
            tableCode: t.tableCode,
            capacity: (t as any).capacity ?? 4,
            status: t.status,
            activeOrder: t.orders[0] || null,
            assignedWaiterId: t.assignedWaiterId,
            clientSlug: (t as any).client?.slug,
        }));

        return NextResponse.json({
            success: true,
            tables: formattedTables as any,
        });
    } catch (error) {
        console.error("[TABLES API] Error fetching tables:", error);

        return NextResponse.json(
            { success: false, error: "Failed to fetch tables" },
            { status: 500 }
        );
    }
}

/**
 * POST /api/tables
 * Create a new table (Tenant Isolated & Subscription Gated)
 */
import { requireRole } from "@/lib/auth";
import { hasReachedLimit, PLAN_LIMITS } from "@/lib/subscription";
import { ClientPlan } from "@prisma/client";

export async function POST(request: NextRequest) {
    try {
        const user = await requireRole(["MANAGER", "ADMIN"]);
        const { tableCode, capacity } = await request.json();

        if (!tableCode || !capacity) {
            return NextResponse.json({ success: false, error: "Missing fields" }, { status: 400 });
        }

        // 1. Subscription Check: Volume Gating
        const tableCount = await prisma.table.count({
            where: { clientId: user.clientId, deletedAt: null }
        });

        if (hasReachedLimit(user.plan as any, 'maxTables', tableCount)) {
            return NextResponse.json({
                success: false,
                error: "Plan Limit Reached",
                message: `Your current plan allows a maximum of ${PLAN_LIMITS[user.plan as ClientPlan].maxTables} tables.`
            }, { status: 403 });
        }

        // 2. Tenant Isolation Check
        const existing = await prisma.table.findUnique({
            where: {
                clientId_tableCode: {
                    clientId: user.clientId,
                    tableCode
                }
            }
        });

        if (existing) {
            return NextResponse.json({ success: false, error: "Table Code exists" }, { status: 409 });
        }

        // 3. Create Table with clientId
        const table = await prisma.table.create({
            data: {
                clientId: user.clientId,
                tableCode,
                capacity: Number(capacity),
                status: "VACANT"
            }
        });

        return NextResponse.json({ success: true, table });
    } catch (error: any) {
        console.error("[TABLES_CREATE] Error:", error);
        return NextResponse.json({ success: false, error: error.message || "Failed to create table" }, { status: 500 });
    }
}
