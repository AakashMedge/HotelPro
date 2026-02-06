
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";

/**
 * GET /api/admin
 * Returns tenant-scoped dashboard statistics for the logged-in admin's restaurant
 */
export async function GET(request: NextRequest) {
    try {
        // Get current user (includes clientId for tenant scoping)
        const user = await requireRole(["ADMIN", "MANAGER"]);
        const clientId = user.clientId;

        // Get client info
        const client = await prisma.client.findUnique({
            where: { id: clientId },
            select: {
                name: true,
                slug: true,
                plan: true,
                status: true
            }
        });

        // Count only THIS client's data (tenant isolation)
        const [userCount, tableCount, menuCount, orderCount, todayOrders, todayRevenue] = await Promise.all([
            prisma.user.count({ where: { clientId } }),
            prisma.table.count({ where: { clientId } }),
            prisma.menuItem.count({ where: { clientId } }),
            prisma.order.count({ where: { clientId } }),
            prisma.order.count({
                where: {
                    clientId,
                    createdAt: {
                        gte: new Date(new Date().setHours(0, 0, 0, 0))
                    }
                }
            }),
            prisma.order.aggregate({
                where: {
                    clientId,
                    status: 'CLOSED',
                    createdAt: {
                        gte: new Date(new Date().setHours(0, 0, 0, 0))
                    }
                },
                _sum: {
                    grandTotal: true
                }
            })
        ]);

        const stats = {
            // Restaurant info
            restaurantName: client?.name || 'Unknown',
            plan: client?.plan || 'BASIC',
            status: client?.status || 'TRIAL',

            // Counts
            users: userCount,
            tables: tableCount,
            items: menuCount,
            orders: orderCount,

            // Today's stats
            todayOrders,
            todayRevenue: Number(todayRevenue._sum.grandTotal || 0),

            // System info
            uptime: formatUptime(process.uptime()),
            dbStatus: 'HEALTHY',
            version: 'v2.4.0-stable'
        };

        return NextResponse.json({ success: true, stats });
    } catch (error) {
        console.error("[ADMIN_API]", error);
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
}

function formatUptime(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
}
