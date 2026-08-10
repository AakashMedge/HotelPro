import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { getTenantFromRequest } from "@/lib/tenant";

/**
 * GET /api/tables/[id]
 * Public/Customer check — Tenant-Validated
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const tenant = await getTenantFromRequest();
        if (!tenant) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

        const db = getDb() as unknown as {
            table: {
                findFirst: (args: Record<string, unknown>) => Promise<Record<string, unknown> | null>;
            };
        };
        const table = await db.table.findFirst({
            where: { id, clientId: tenant.id, deletedAt: null },
            select: { id: true, tableCode: true, status: true }
        });

        if (!table) return NextResponse.json({ success: false, error: "Table not found" }, { status: 404 });

        return NextResponse.json({ success: true, table });
    } catch (e: unknown) {
        const err = e as Error;
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

/**
 * PATCH /api/tables/[id]
 * Update table status — Staff Only, Tenant-Validated
 * 
 * Security: Verifies that the table belongs to the staff's hotel
 * before allowing any status change. Prevents cross-tenant manipulation.
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const startTime = Date.now();

    try {
        const { id } = await params;
        const user = await requireRole(["WAITER", "MANAGER", "ADMIN"]);
        const { clientId } = user;
        const { status, assignedWaiterId } = await request.json();

        const db = getDb() as unknown as {
            table: {
                findFirst: (args: Record<string, unknown>) => Promise<Record<string, unknown> | null>;
                update: (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
            };
            order: {
                updateMany: (args: Record<string, unknown>) => Promise<{ count: number }>;
            };
        };

        // SECURITY: Verify this table belongs to the staff's hotel
        const existingTable = await db.table.findFirst({
            where: { id, clientId },
            select: { id: true, tableCode: true, status: true }
        });

        if (!existingTable) {
            console.warn(`[TABLE_UPDATE] ✗ Tenant mismatch or table not found. Table: ${id}, Client: ${clientId}`);
            return NextResponse.json(
                { success: false, error: "Table not found or access denied." },
                { status: 404 }
            );
        }

        // Build update payload
        const updateData: Record<string, unknown> = {};
        if (status) updateData.status = status;
        if (assignedWaiterId !== undefined) {
            updateData.assignedWaiterId = assignedWaiterId === "" ? null : assignedWaiterId;
        }

        if (status === "VACANT") {
            await db.order.updateMany({
                where: {
                    tableId: id,
                    clientId,
                    status: { notIn: ["CLOSED", "CANCELLED"] }
                },
                data: {
                    status: "CANCELLED"
                }
            });
        }

        const table = await db.table.update({
            where: { id },
            data: updateData
        });

        const elapsed = Date.now() - startTime;
        console.log(`[TABLE_UPDATE] ✓ ${existingTable.tableCode}: ${existingTable.status} → ${status || 'no change'} | ${elapsed}ms`);

        return NextResponse.json({ success: true, table });

    } catch (error: unknown) {
        const err = error as Error & { code?: string; status?: number };
        const elapsed = Date.now() - startTime;

        // Handle AuthError with proper status codes
        if (err?.name === 'AuthError' || err?.code === 'AUTH_REQUIRED' || err?.code === 'ROLE_FORBIDDEN' || err?.code === 'TENANT_INACTIVE') {
            console.warn(`[TABLE_UPDATE] ✗ Auth error after ${elapsed}ms:`, err.message);
            return NextResponse.json(
                { success: false, error: err.message, code: err.code },
                { status: err.status || 401 }
            );
        }

        console.error(`[TABLE_UPDATE] ✗ Error after ${elapsed}ms:`, err.message);
        return NextResponse.json(
            { success: false, error: "Failed to update table" },
            { status: 500 }
        );
    }
}
