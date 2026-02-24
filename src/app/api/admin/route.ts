
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole, getAuthFailure } from "@/lib/auth";

/**
 * GET /api/admin
 * Returns tenant-scoped dashboard statistics for the logged-in admin's restaurant.
 */
export async function GET(request: NextRequest) {
    try {
        const user = await requireRole(["ADMIN", "MANAGER"]);
        const { clientId } = user;

        const db = prisma;

        const client = await prisma.client.findUnique({
            where: { id: clientId },
            select: {
                name: true,
                slug: true,
                plan: true,
                status: true,
            },
        });

        const statsFromDb = await loadAdminStatsFromDb(db, clientId);

        const stats = {
            restaurantName: client?.name || "Unknown",
            plan: client?.plan || "STARTER",
            status: client?.status || "TRIAL",

            users: statsFromDb.userCount,
            tables: statsFromDb.tableCount,
            items: statsFromDb.menuCount,
            orders: statsFromDb.orderCount,

            todayOrders: statsFromDb.todayOrders,
            todayRevenue: Number((statsFromDb.todayRevenue as any)._sum.grandTotal || 0),

            uptime: formatUptime(process.uptime()),
            dbStatus: "HEALTHY",
            version: "v3.0.0-unified",
            degraded: false,
            degradeCode: null,
        };

        return NextResponse.json({ success: true, stats, degraded: false, degradeCode: null });
    } catch (error: any) {
        const authFailure = getAuthFailure(error);
        if (authFailure) {
            return NextResponse.json(
                { success: false, error: authFailure.message, code: authFailure.code },
                { status: authFailure.status }
            );
        }

        console.error("[ADMIN_API_ERROR]", error);
        return NextResponse.json(
            { success: false, error: error?.message || "Failed to fetch admin dashboard", code: "ADMIN_DASHBOARD_FAILED" },
            { status: 500 }
        );
    }
}

async function loadAdminStatsFromDb(db: any, clientId: string) {
    const [userCount, tableCount, menuCount, orderCount, todayOrders, todayRevenue] = await Promise.all([
        (db.user as any).count({ where: { clientId } }),
        (db.table as any).count({ where: { clientId } }),
        (db.menuItem as any).count({ where: { clientId } }),
        (db.order as any).count({ where: { clientId } }),
        (db.order as any).count({
            where: {
                clientId,
                createdAt: {
                    gte: new Date(new Date().setHours(0, 0, 0, 0)),
                },
            },
        }),
        (db.order as any).aggregate({
            where: {
                clientId,
                status: "CLOSED",
                createdAt: {
                    gte: new Date(new Date().setHours(0, 0, 0, 0)),
                },
            },
            _sum: {
                grandTotal: true,
            },
        }),
    ]);
    return {
        userCount,
        tableCount,
        menuCount,
        orderCount,
        todayOrders,
        todayRevenue,
    };
}

function formatUptime(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
}
