/**
 * Seed Script: Platform Plans
 * 
 * Populates the Plan table with the 4 standard tiers.
 * Run: npx tsx prisma/seed-plans.ts
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

const PLANS = [
    {
        name: 'Starter',
        code: 'STARTER' as const,
        price: 1999.00,
        features: {
            qr_menu: true,
            basic_analytics: true,
            order_management: true,
            basic_kot: true,
            basic_billing: true,
            ai_assistant: false,
            inventory: false,
            ai_analysis: false,
            custom_branding: false,
            isolated_database: false,
            multi_property: false,
            ai_automation: false,
            dedicated_support: false,
        },
        limits: {
            tables: 100,
            menuItems: 300,
        },
    },
    {
        name: 'Growth',
        code: 'GROWTH' as const,
        price: 4999.00,
        features: {
            qr_menu: true,
            basic_analytics: true,
            order_management: true,
            basic_kot: true,
            basic_billing: true,
            ai_assistant: true,
            inventory: true,
            ai_analysis: false,
            custom_branding: false,
            isolated_database: false,
            multi_property: false,
            ai_automation: false,
            dedicated_support: false,
        },
        limits: {
            tables: 250,
            menuItems: 1000,
        },
    },
    {
        name: 'Elite',
        code: 'ELITE' as const,
        price: 19999.00,
        features: {
            qr_menu: true,
            basic_analytics: true,
            order_management: true,
            basic_kot: true,
            basic_billing: true,
            ai_assistant: true,
            inventory: true,
            ai_analysis: true,
            custom_branding: true,
            isolated_database: true,
            multi_property: true,
            ai_automation: true,
            dedicated_support: true,
        },
        limits: {
            tables: 0,     // 0 = unlimited
            menuItems: 0,  // 0 = unlimited
        },
    },
];

async function main() {
    console.log('🌱 Seeding platform plans...\n');

    for (const plan of PLANS) {
        const result = await (prisma.plan as any).upsert({
            where: { code: plan.code },
            update: {
                name: plan.name,
                price: plan.price,
                features: plan.features,
                limits: plan.limits,
            },
            create: plan,
        });
        console.log(`  ✅ ${result.name} (${result.code}) — ₹${result.price}/mo`);
    }

    console.log('\n🎉 Plans seeded successfully!');
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
