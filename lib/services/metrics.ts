
import { prisma } from "@/lib/db";
import { PlatformStats } from "./admin";

/**
 * Global Metrics Aggregator
 * 
 * Fetches and aggregates statistics for the entire platform.
 * In the unified architecture, all tenants reside in the main database.
 */
export async function getAggregatedPlatformStats(): Promise<PlatformStats> {
    // 1. Fetch all clients
    const clients = await (prisma.client as any).findMany({
        select: {
            id: true,
            plan: true,
            status: true
        }
    });

    // 2. Fetch platform-wide totals from the main database
    const [totalOrders, sharedRevenue, activeUsers] = await Promise.all([
        prisma.order.count({ where: { status: 'CLOSED' } }),
        prisma.order.aggregate({
            where: { status: 'CLOSED' },
            _sum: { grandTotal: true }
        }),
        prisma.user.count({
            where: { isActive: true }
        })
    ]);

    // 3. Calculate plan distribution
    const plansDistribution: Record<string, number> = {};
    clients.forEach((c: any) => {
        plansDistribution[c.plan] = (plansDistribution[c.plan] || 0) + 1;
    });

    return {
        totalClients: clients.length,
        totalOrders,
        totalRevenue: Number(sharedRevenue._sum.grandTotal || 0),
        activeUsers,
        plansDistribution: Object.entries(plansDistribution).map(([plan, count]) => ({
            plan,
            count
        }))
    };
}
