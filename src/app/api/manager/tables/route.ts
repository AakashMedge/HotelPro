
import { NextRequest, NextResponse } from "next/server";
import { prisma, getDb } from "@/lib/db";
import { requireRole } from "@/lib/auth";

/**
 * PATCH /api/manager/tables
 * Update table status (tenant-aware)
 */
export async function PATCH(request: NextRequest) {
    try {
        const user = await requireRole(["MANAGER", "ADMIN"]);
        const { clientId } = user;
        const { id, status } = await request.json();

        if (!id || !status) {
            return NextResponse.json({ success: false, error: "Missing ID or Status" }, { status: 400 });
        }

        const db = getDb();

        // Verify table belongs to this tenant
        const existing = await (db.table as any).findFirst({
            where: { id, clientId }
        });

        if (!existing) {
            return NextResponse.json({ success: false, error: "Table not found" }, { status: 404 });
        }

        const updated = await (db.table as any).update({
            where: { id },
            data: { status }
        });

        return NextResponse.json({ success: true, table: updated });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error?.message || "Failed to update table" }, { status: 500 });
    }
}

/**
 * POST /api/manager/tables/reset
 * Emergency Force Reset for a Table (tenant-aware)
 */
export async function POST(request: NextRequest) {
    try {
        const user = await requireRole(["MANAGER", "ADMIN"]);
        const { clientId } = user;
        const { id } = await request.json();

        if (!id) {
            return NextResponse.json({ success: false, error: "Table ID required" }, { status: 400 });
        }

        const db = getDb();

        const result = await (db as any).$transaction(async (tx: any) => {
            // 1. Get the table and verify it belongs to this tenant
            const table = await tx.table.findFirst({
                where: { id, clientId },
                select: { id: true, tableCode: true }
            });

            if (!table) throw new Error("Table not found");

            // 2. Cancel all active orders for this table
            await tx.order.updateMany({
                where: {
                    tableId: id,
                    clientId,
                    status: { notIn: ["CLOSED", "CANCELLED"] }
                },
                data: {
                    status: "CANCELLED",
                    version: { increment: 1 }
                }
            });

            // 3. Reset the table status
            const updated = await tx.table.update({
                where: { id },
                data: { status: "VACANT" }
            });

            // 4. Record the specific Reset audit log
            await tx.auditLog.create({
                data: {
                    clientId,
                    action: "STATUS_CHANGED",
                    actorId: user.id,
                    metadata: {
                        tableCode: table.tableCode,
                        action: "EMERGENCY_RESET",
                        previousStatus: "LOCKED"
                    }
                }
            });

            return updated;
        });

        return NextResponse.json({ success: true, table: result });
    } catch (error: any) {
        console.error("[TABLE_RESET_ERROR]", error);
        return NextResponse.json({
            success: false,
            error: error?.message || "Reset failed"
        }, { status: 500 });
    }
}
