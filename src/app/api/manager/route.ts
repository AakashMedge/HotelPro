
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export async function GET(request: NextRequest) {
    try {
        console.log("--- [UNIFIED] Manager API Request ---");
        const user = await requireRole(["MANAGER", "ADMIN"]);
        const { clientId } = user;

        const db = prisma;

        // 1. Fetch data for Current Client Only (Strict Isolation)
        const [tables, activeOrders, closedOrders, staff, auditLogs] = await Promise.all([
            db.table.findMany({
                where: { clientId, deletedAt: null },
                select: {
                    id: true,
                    tableCode: true,
                    status: true,
                    assignedWaiterId: true,
                    updatedAt: true,
                    orders: {
                        where: {
                            clientId,
                            status: { not: "CLOSED" },
                            NOT: { payment: { status: "PAID" } }
                        },
                        select: {
                            id: true,
                            status: true,
                            updatedAt: true,
                            items: { select: { id: true, itemName: true, quantity: true } }
                        },
                        take: 1
                    }
                },
                orderBy: { tableCode: "asc" },
            }),
            db.order.findMany({
                where: {
                    clientId,
                    status: { not: "CLOSED" },
                    NOT: { payment: { status: "PAID" } }
                },
                select: { id: true, status: true, createdAt: true },
                orderBy: { createdAt: "asc" },
            }),
            db.order.findMany({
                where: {
                    clientId,
                    status: "CLOSED",
                    updatedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
                },
                select: { id: true, grandTotal: true },
            }),
            db.user.findMany({
                where: { clientId, isActive: true },
                select: { id: true, name: true, role: true },
            }),
            db.auditLog.findMany({
                where: { clientId },
                take: 50,
                orderBy: { createdAt: 'desc' },
                include: {
                    order: {
                        select: {
                            table: { select: { tableCode: true, id: true } }
                        }
                    }
                }
            })
        ]);

        // 2. Calculate Bestsellers (Real-time)
        const orderItems = await db.orderItem.findMany({
            where: {
                order: { clientId },
                createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }
            },
            select: { itemName: true }
        });

        const itemMap: Record<string, number> = {};
        orderItems.forEach((oi: any) => {
            itemMap[oi.itemName] = (itemMap[oi.itemName] || 0) + 1;
        });

        const topItems = Object.entries(itemMap)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        // 3. Format Audit Feed
        const auditFeed = auditLogs.map((log: any) => ({
            time: new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            msg: `${log.action.replace(/_/g, ' ')}`,
            tableId: log.order?.table?.id || null,
            tableCode: log.order?.table?.tableCode || null,
            orderId: log.orderId || null
        }));

        // 4. Ghost Session Cleanup (Safety)
        const { cleanupGhostSessions } = await import("@/lib/services/ghostSession");
        const ghosts = await cleanupGhostSessions(tables, db);

        return NextResponse.json({
            success: true,
            ghostsReleased: ghosts.length,
            stats: {
                active: tables.filter((t: any) => t.status !== "VACANT").length,
                ready: activeOrders.filter((o: any) => o.status === "READY").length,
                payment: activeOrders.filter((o: any) => o.status === "BILL_REQUESTED").length,
                kitchen: activeOrders.filter((o: any) => ["NEW", "PREPARING"].includes(o.status)).length,
                revenue: closedOrders.reduce((s, o) => s + (Number(o.grandTotal) || 0), 0),
                maxWait: activeOrders.length > 0 ? "5m" : "0m",
                lowStockCount: 0
            },
            floorMonitor: tables.map((t: any) => ({
                id: t.tableCode?.replace("T-", "") || "??",
                code: t.tableCode,
                realId: t.id,
                status: t.orders?.[0]?.status || t.status,
                waiter: staff.find((s: any) => s.id === t.assignedWaiterId)?.name || "Unassigned",
                items: t.orders?.[0]?.items?.length || 0,
                itemSummary: t.orders?.[0]?.items?.map((i: any) => ({ name: i.itemName, qty: i.quantity })) || [],
                lastUpdate: t.orders?.[0]?.updatedAt ? new Date(t.orders[0].updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Live",
                orderId: t.orders?.[0]?.id || null,
                updatedAt: t.updatedAt || null
            })),
            staff: staff.map((s: any) => ({ id: s.id, name: s.name, role: s.role, status: "ONLINE" })),
            topItems,
            auditFeed
        });

    } catch (error: any) {
        console.error("[UNIFIED_API] Manager Error:", error);
        return NextResponse.json({ success: false, error: "Sync Error" }, { status: 500 });
    }
}
