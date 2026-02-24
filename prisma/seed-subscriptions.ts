/**
 * Seed Script: Link Clients to Plans (Subscriptions)
 * 
 * Ensures 'hq' and 'taj' clients have valid subscriptions linked to seeded plans.
 */

import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from '@prisma/adapter-neon';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import 'dotenv/config';

neonConfig.webSocketConstructor = ws;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
}

const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('🌱 Linking clients to plans (Subscriptions)...\n');

    // 1. Get seeded plans
    const plans = await (prisma.plan as any).findMany();
    if (plans.length === 0) {
        throw new Error('No plans found. Please run npx tsx prisma/seed-plans.ts first.');
    }

    const elitePlan = plans.find((p: any) => p.code === 'ELITE');
    const growthPlan = plans.find((p: any) => p.code === 'GROWTH');

    // 2. Get clients
    const hq = await prisma.client.findUnique({ where: { slug: 'hq' } });
    const taj = await prisma.client.findUnique({ where: { slug: 'taj' } });

    if (hq && elitePlan) {
        await (prisma.subscription as any).upsert({
            where: { clientId: hq.id },
            update: { planId: elitePlan.id },
            create: {
                clientId: hq.id,
                planId: elitePlan.id,
                status: 'ACTIVE',
            },
        });
        console.log('  ✅ HQ linked to ELITE plan');
    }

    if (taj && growthPlan) {
        await (prisma.subscription as any).upsert({
            where: { clientId: taj.id },
            update: { planId: growthPlan.id },
            create: {
                clientId: taj.id,
                planId: growthPlan.id,
                status: 'ACTIVE',
            },
        });
        console.log('  ✅ Taj linked to GROWTH plan');
    }

    console.log('\n🎉 Subscriptions linked successfully!');
}

main()
    .catch((e) => {
        console.error('❌ Sync failed:', e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
