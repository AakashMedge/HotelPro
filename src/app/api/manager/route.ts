import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { OrderStatus, TableStatus } from "@/generated/prisma";

/**
 * GET /api/manager
 * 
 * Returns overall operations snapshot for the manager dashboard.
 */
export async function GET(request: NextRequest) {
    try {
        // 1. Fetch all tables
        const tables = await prisma.table.findMany({
            where: { deletedAt: null },
            include: {
                assignedWaiter: {
                    select: { name: true }
                },
                orders: {
                    where: { status: { not: "CLOSED" } },
                    include: {
                        items: true
                    },
                    orderBy: { updatedAt: 'desc' },
                    take: 1
                }
            }
        });

        // 2. Fetch all active orders
        const activeOrders = await prisma.order.findMany({
            where: { status: { not: "CLOSED" } },
            orderBy: { createdAt: 'asc' }
        });

        // 2b. Fetch TODAY'S Closed Orders for Revenue & Stats
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const closedOrdersToday = await prisma.order.findMany({
            where: {
                status: "CLOSED",
                updatedAt: { gte: today }
            },
            include: { items: true }
        });

        const todayRevenue = closedOrdersToday.reduce((sum, order) => {
            return sum + order.items.reduce((ordSum, item) => ordSum + Number(item.priceSnapshot), 0);
        }, 0);

        // 2c. Calculate Top Items (Simple aggregation)
        const itemCounts: Record<string, number> = {};
        closedOrdersToday.forEach(order => {
            order.items.forEach(item => {
                itemCounts[item.itemName] = (itemCounts[item.itemName] || 0) + 1;
            });
        });

        const topItems = Object.entries(itemCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .map(([name, count]) => ({ name, count }));

        // 3. Calculate Stats
        const stats = {
            active: tables.filter(t => t.status === "ACTIVE").length,
            ready: activeOrders.filter(o => o.status === "READY").length,
            payment: activeOrders.filter(o => o.status === "SERVED").length,
            kitchen: activeOrders.filter(o => ["NEW", "PREPARING"].includes(o.status)).length,
            revenue: todayRevenue,
            maxWait: "0m"
        };

        if (activeOrders.length > 0) {
            const oldestOrder = activeOrders[0];
            const waitInMins = Math.floor((Date.now() - new Date(oldestOrder.createdAt).getTime()) / 60000);
            stats.maxWait = `${waitInMins}m`;
        }

        // 4. Format Floor Monitor Data
        const floorMonitor = tables.map(table => {
            const activeOrder = table.orders[0];
            return {
                id: table.tableCode.replace('T-', ''),
                status: activeOrder?.status || 'VACANT',
                waiter: table.assignedWaiter?.name || (activeOrder ? 'Staff' : '---'),
                items: activeOrder?.items.length || 0,
                lastUpdate: activeOrder ? getTimeAgo(activeOrder.updatedAt) : '--'
            };
        });

        // 5. Audit Feed (recent order changes)
        const auditFeed = await prisma.auditLog.findMany({
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: {
                actor: { select: { name: true } }
            }
        });

        const formattedAudit = auditFeed.map(log => ({
            time: new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            msg: formatAuditMsg(log)
        }));

        // 6. Staff Roster (summary)
        const staff = await prisma.user.findMany({
            where: { isActive: true },
            select: { id: true, name: true, role: true }
        });

        return NextResponse.json({
            success: true,
            stats,
            topItems,
            floorMonitor,
            auditFeed: formattedAudit,
            staff: staff.map(s => ({
                id: s.id,
                name: s.name,
                role: s.role,
                status: 'ONLINE', // Simplification for demo
                shift: '00:00:00' // Placeholder
            }))
        });

    } catch (error) {
        console.error("[MANAGER API] Error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch manager data" },
            { status: 500 }
        );
    }
}

function getTimeAgo(date: Date) {
    const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    if (mins < 1) return 'now';
    return `${mins}m`;
}

function formatAuditMsg(log: any) {
    const metadata = log.metadata as any;
    switch (log.action) {
        case 'ORDER_CREATED': return `T_${metadata?.tableCode || '??'} Committed`;
        case 'STATUS_CHANGED': return `T_${metadata?.tableCode || '??'} -> ${metadata?.newStatus}`;
        case 'ORDER_CLOSED': return `T_${metadata?.tableCode || '??'} Settled`;
        default: return `${log.action} processed`;
    }
}
