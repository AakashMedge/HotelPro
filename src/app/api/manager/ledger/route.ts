
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export async function GET(request: NextRequest) {
    try {
        await requireRole(["MANAGER", "ADMIN"]);

        const orders = await prisma.order.findMany({
            where: { status: "CLOSED" },
            orderBy: { updatedAt: 'desc' },
            take: 50,
            include: {
                table: { select: { tableCode: true } },
                items: true,
                _count: { select: { items: true } }
            }
        });

        const ledger = orders.map(order => ({
            id: order.id,
            table: order.table?.tableCode || 'Unknown',
            customer: order.customerName || 'Guest',
            items: order._count.items,
            total: order.items.reduce((sum, item) => sum + Number(item.priceSnapshot), 0),
            date: order.updatedAt,
            paymentMethod: 'CASH' // Default for now
        }));

        return NextResponse.json({ success: true, ledger });
    } catch (error) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
}
