import { prisma } from "@/lib/db";

export interface PlatformStats {
    totalClients: number;
    totalOrders: number;
    totalRevenue: number;
    activeUsers: number;
    plansDistribution: {
        plan: string;
        count: number;
    }[];
    mrr: number;
    activeSubscriptions: number;
    growthRate: number;
    orderRevenue: number;
    saasRevenue: number;
}

/**
 * Global Metrics Aggregator
 * 
 * Fetches and aggregates statistics for the entire platform.
 * In the unified architecture, all tenants reside in the main database.
 */
export async function getAggregatedPlatformStats(): Promise<PlatformStats> {
    // 1. Fetch all clients
    const clients = await prisma.client.findMany({
        select: {
            id: true,
            plan: true,
            status: true
        }
    });

    // 2. Fetch platform-wide totals from the main database
    const [totalOrders, sharedRevenue, activeUsers, subscriptionRevenue] = await Promise.all([
        prisma.order.count({ where: { status: 'CLOSED' } }),
        prisma.order.aggregate({
            where: { status: 'CLOSED' },
            _sum: { grandTotal: true }
        }),
        prisma.user.count({
            where: { isActive: true }
        }),
        (prisma as any).saaSPayment.aggregate({
            where: { status: 'PAID' },
            _sum: { amount: true }
        })
    ]);

    const activeSubscriptions = await prisma.subscription.findMany({
        where: { status: 'ACTIVE' },
        include: { plan: { select: { price: true, name: true, code: true } } }
    });

    const mrr = activeSubscriptions.reduce((sum, sub) => sum + Number(sub.plan?.price || 0), 0);

    // 4. Calculate Growth Rate (Subscribers growth compared to last month)
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const lastMonthSubsCount = await prisma.subscription.count({
        where: { createdAt: { lt: lastMonth } }
    });

    const growthRate = lastMonthSubsCount === 0
        ? (activeSubscriptions.length > 0 ? 100 : 0)
        : Math.round(((activeSubscriptions.length - lastMonthSubsCount) / lastMonthSubsCount) * 100);

    // 4. Calculate plan distribution
    const plansDistribution: Record<string, number> = {};
    clients.forEach((c: any) => {
        plansDistribution[c.plan] = (plansDistribution[c.plan] || 0) + 1;
    });

    const totalRevenue = Number(sharedRevenue._sum.grandTotal || 0) + Number(subscriptionRevenue._sum.amount || 0);

    return {
        totalClients: clients.length,
        totalOrders,
        totalRevenue: totalRevenue,
        activeUsers,
        plansDistribution: Object.entries(plansDistribution).map(([plan, count]) => ({
            plan,
            count
        })),
        mrr,
        activeSubscriptions: activeSubscriptions.length,
        growthRate,
        orderRevenue: Number(sharedRevenue._sum.grandTotal || 0),
        saasRevenue: Number(subscriptionRevenue._sum.amount || 0)
    };
}
