
import { NextRequest, NextResponse } from "next/server";
import { cancelOrderItem, OrderError } from "@/lib/services/order";
import { getTenantFromRequest } from "@/lib/tenant";
import { getDb } from "@/lib/db";

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string, itemId: string }> }
): Promise<NextResponse> {
    try {
        const { id, itemId } = await params;

        // 1. Detect Tenant
        const tenant = await getTenantFromRequest();
        if (!tenant) {
            return NextResponse.json(
                { success: false, error: "Authentication required" },
                { status: 401 }
            );
        }

        const db = getDb();

        // 2. Cancel Order Item
        const order = await cancelOrderItem(id, itemId, tenant.id, undefined, db);

        return NextResponse.json({
            success: true,
            order
        });
    } catch (error) {
        if (error instanceof OrderError) {
            return NextResponse.json(
                { success: false, error: error.message, code: error.code },
                { status: 400 }
            );
        }
        console.error("[ORDER ITEM API] Error cancelling item:", error);
        return NextResponse.json(
            { success: false, error: "Failed to cancel item" },
            { status: 500 }
        );
    }
}
