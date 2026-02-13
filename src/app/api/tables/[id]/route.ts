
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireRole } from "@/lib/auth";

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

        const db = getDb();

        // SECURITY: Verify this table belongs to the staff's hotel
        const existingTable = await (db.table as any).findFirst({
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
        const updateData: any = {};
        if (status) updateData.status = status;
        if (assignedWaiterId !== undefined) {
            updateData.assignedWaiterId = assignedWaiterId === "" ? null : assignedWaiterId;
        }

        const table = await (db.table as any).update({
            where: { id },
            data: updateData
        });

        const elapsed = Date.now() - startTime;
        console.log(`[TABLE_UPDATE] ✓ ${existingTable.tableCode}: ${existingTable.status} → ${status || 'no change'} | ${elapsed}ms`);

        return NextResponse.json({ success: true, table });

    } catch (error: any) {
        const elapsed = Date.now() - startTime;
        console.error(`[TABLE_UPDATE] ✗ Error after ${elapsed}ms:`, error.message);
        return NextResponse.json(
            { success: false, error: "Failed to update table" },
            { status: 500 }
        );
    }
}
