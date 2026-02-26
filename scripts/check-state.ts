import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import 'dotenv/config';

// Configure Neon for Node.js
neonConfig.webSocketConstructor = ws;

async function main() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error('DATABASE_URL is not set');

    const adapter = new PrismaNeon({ connectionString });
    const prisma = new PrismaClient({ adapter });

    try {
        console.log("--- DB DIAGNOSTIC ---");

        const latestPayments = await (prisma as any).saaSPayment.findMany({
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: { client: true }
        });

        console.log("\nLATEST PAYMENTS:");
        if (latestPayments.length === 0) console.log("None found.");
        latestPayments.forEach((p: any) => {
            console.log(`- ID: ${p.id}, Client: ${p.client.name}, Plan: ${p.plan}, Status: ${p.status}, CreatedAt: ${p.createdAt}`);
        });

        const latestSubscriptions = await (prisma as any).subscription.findMany({
            orderBy: { updatedAt: 'desc' },
            take: 5,
            include: { client: true, plan: true }
        });

        console.log("\nLATEST SUBSCRIPTIONS:");
        if (latestSubscriptions.length === 0) console.log("None found.");
        latestSubscriptions.forEach((s: any) => {
            console.log(`- ID: ${s.id}, Client: ${s.client.name}, Plan: ${s.plan.name}, Status: ${s.status}, UpdatedAt: ${s.updatedAt}`);
        });

        const taj = await (prisma as any).client.findUnique({
            where: { slug: 'taj' },
            include: {
                subscription: { include: { plan: true } },
                saaSPayments: { orderBy: { createdAt: 'desc' }, take: 1 }
            }
        });

        if (taj) {
            console.log("\nTAJ HOTEL STATE:");
            console.log(`- Current Plan (Enum): ${taj.plan}`);
            console.log(`- Subscription: ${taj.subscription?.plan?.name || "None"}`);
            console.log(`- Latest Payment: ${taj.saaSPayments[0]?.plan || "None"}`);
        }

    } catch (error: any) {
        console.error("DIAGNOSTIC ERROR:", error.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
