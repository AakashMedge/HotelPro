import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";

/**
 * PATCH /api/tables/[id]
 * 
 * Update table status (e.g., from DIRTY to VACANT)
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const user = await requireRole(["WAITER", "MANAGER", "ADMIN"]);
        const { status, assignedWaiterId } = await request.json();

        const updateData: any = {};
        if (status) updateData.status = status;
        if (assignedWaiterId !== undefined) updateData.assignedWaiterId = assignedWaiterId === "" ? null : assignedWaiterId;

        const table = await prisma.table.update({
            where: { id },
            data: updateData
        });

        return NextResponse.json({ success: true, table });
    } catch (error) {
        console.error("[TABLE_UPDATE] Error:", error);
        return NextResponse.json({ success: false, error: "Failed to update table" }, { status: 500 });
    }
}
