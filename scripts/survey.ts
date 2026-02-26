import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import 'dotenv/config';

neonConfig.webSocketConstructor = ws;

async function main() {
    const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }) });
    try {
        console.log("--- FULL DATABASE SURVEY ---");

        const clients = await (prisma as any).client.findMany({
            include: { subscription: { include: { plan: true } } }
        });

        console.log("\nALL CLIENTS:");
        clients.forEach((c: any) => {
            console.log(`- ID: ${c.id}, Name: ${c.name}, Slug: ${c.slug}, Plan: ${c.plan}, Status: ${c.status}`);
            if (c.subscription) {
                console.log(`  └ Sub: ${c.subscription.plan.name} (${c.subscription.status})`);
            } else {
                console.log(`  └ Sub: NONE`);
            }
        });

        const plans = await (prisma as any).plan.findMany();
        console.log("\nAVAILABLE PLANS:");
        plans.forEach((p: any) => console.log(`- ${p.code}: ${p.name} (₹${p.price})`));

        const sessions = await (prisma as any).session.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: { user: true }
        });
        console.log("\nRECENT SESSIONS:");
        sessions.forEach((s: any) => console.log(`- User: ${s.user.username}, ClientID: ${s.user.clientId}`));

    } catch (error: any) {
        console.error("SURVEY ERROR:", error.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
