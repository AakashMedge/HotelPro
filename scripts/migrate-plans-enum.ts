/**
 * Migration Script: Rename ClientPlan Enum Values
 * 
 * BASIC    → STARTER
 * ADVANCE  → GROWTH
 * PREMIUM  → GROWTH  (merged into Growth tier)
 * BUSINESS → ELITE
 * 
 * Run: npx tsx scripts/migrate-plans-enum.ts
 */

import { PrismaClient } from '@prisma/client';
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
    console.log('🔄 Starting Plan Enum Migration...\n');

    // Step 1: Clean up Subscription + Plan tables (will be reseeded)
    console.log('  1️⃣  Clearing Subscription table...');
    await prisma.$executeRawUnsafe(`DELETE FROM "Subscription"`);

    console.log('  2️⃣  Clearing Plan table...');
    await prisma.$executeRawUnsafe(`DELETE FROM "Plan"`);

    // Step 2: Rename the old enum
    console.log('  3️⃣  Renaming old ClientPlan enum...');
    await prisma.$executeRawUnsafe(`ALTER TYPE "ClientPlan" RENAME TO "ClientPlan_old"`);

    // Step 3: Create new enum with new values
    console.log('  4️⃣  Creating new ClientPlan enum (STARTER, GROWTH, ELITE)...');
    await prisma.$executeRawUnsafe(`CREATE TYPE "ClientPlan" AS ENUM ('STARTER', 'GROWTH', 'ELITE')`);

    // Step 4: Alter Client.plan column — map old values to new
    console.log('  5️⃣  Migrating Client.plan column...');
    await prisma.$executeRawUnsafe(`
        ALTER TABLE "Client" 
        ALTER COLUMN "plan" DROP DEFAULT
    `);
    await prisma.$executeRawUnsafe(`
        ALTER TABLE "Client" 
        ALTER COLUMN "plan" TYPE "ClientPlan" USING (
            CASE "plan"::text
                WHEN 'BASIC' THEN 'STARTER'
                WHEN 'ADVANCE' THEN 'GROWTH'
                WHEN 'PREMIUM' THEN 'GROWTH'
                WHEN 'BUSINESS' THEN 'ELITE'
                ELSE 'STARTER'
            END
        )::"ClientPlan"
    `);
    await prisma.$executeRawUnsafe(`
        ALTER TABLE "Client" 
        ALTER COLUMN "plan" SET DEFAULT 'STARTER'::"ClientPlan"
    `);

    // Step 5: Alter Plan.code column
    console.log('  6️⃣  Migrating Plan.code column...');
    await prisma.$executeRawUnsafe(`
        ALTER TABLE "Plan" 
        ALTER COLUMN "code" TYPE "ClientPlan" USING ("code"::text::"ClientPlan")
    `);

    // Step 6: Drop old enum
    console.log('  7️⃣  Dropping old enum...');
    await prisma.$executeRawUnsafe(`DROP TYPE "ClientPlan_old"`);

    // Step 7: Verify
    console.log('\n  ✅ Verifying migration...');
    const clients = await prisma.$queryRawUnsafe(`SELECT id, name, plan FROM "Client" LIMIT 10`);
    console.log('  Clients after migration:');
    console.table(clients);

    console.log('\n🎉 Enum migration complete!');
    console.log('\n📌 Next Steps:');
    console.log('   1. Run: npx tsx prisma/seed-plans.ts');
    console.log('   2. Run: npx tsx prisma/seed-subscriptions.ts');
}

main()
    .catch((e) => {
        console.error('❌ Migration failed:', e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
