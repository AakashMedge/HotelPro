import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import 'dotenv/config';

neonConfig.webSocketConstructor = ws;

async function main() {
    const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }) });
    try {
        console.log("--- METRICS VERIFICATION ---");

        // 1. Orders
        const totalOrders = await (prisma as any).order.count({ where: { status: 'CLOSED' } });
        const sharedRevenue = await (prisma as any).order.aggregate({
            where: { status: 'CLOSED' },
            _sum: { grandTotal: true }
        });
        console.log(`Orders: ${totalOrders}, Rev: ${sharedRevenue._sum.grandTotal}`);

        // 2. SaaS Payments
        const subscriptionRevenue = await (prisma as any).saaSPayment.aggregate({
            where: { status: 'PAID' },
            _sum: { amount: true }
        });
        console.log(`SaaS Payments Sum: ${subscriptionRevenue._sum.amount}`);

        // 3. Active Subscriptions
        const activeSubscriptions = await (prisma as any).subscription.findMany({
            where: { status: 'ACTIVE' },
            include: { plan: true }
        });
        console.log(`Active Subs: ${activeSubscriptions.length}`);
        let mrr = 0;
        activeSubscriptions.forEach((s: any) => {
            console.log(`  - Client: ${s.clientId}, Plan: ${s.plan.name}, Code: ${s.plan.code}, Price: ${s.plan.price}`);
            mrr += Number(s.plan.price || 0);
        });
        console.log(`Calculated MRR: ${mrr}`);

        const totalRevenue = Number(sharedRevenue._sum.grandTotal || 0) + Number(subscriptionRevenue._sum.amount || 0);
        console.log(`CALCULATED TOTAL REVENUE: ${totalRevenue}`);

    } catch (error: any) {
        console.error("VERIFICATION ERROR:", error.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
