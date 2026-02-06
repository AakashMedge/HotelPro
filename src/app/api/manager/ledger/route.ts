
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
            paymentMethod: 'CASH'
        }));

        // Calculate Stats
        const totalRevenue = ledger.reduce((sum, ord) => sum + ord.total, 0);
        const avgTicket = ledger.length > 0 ? (totalRevenue / ledger.length) : 0;

        // Find top item (simplified)
        const itemCounts: Record<string, number> = {};
        orders.forEach(o => o.items.forEach(i => {
            itemCounts[i.itemName] = (itemCounts[i.itemName] || 0) + 1;
        }));
        const topItem = Object.entries(itemCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '---';

        return NextResponse.json({
            success: true,
            ledger,
            stats: {
                totalRevenue,
                avgTicket,
                topItem,
                totalOrders: ledger.length
            }
        });
    } catch (error) {
        console.error("[LEDGER_STATS_ERROR]", error);
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
}
