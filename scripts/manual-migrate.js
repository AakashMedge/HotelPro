const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- Manual Schema Migration Utility ---');
    try {
        // 1. Create SuperAdmin table if not exists
        console.log('Checking SuperAdmin table...');
        await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "SuperAdmin" (
        "id" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "passwordHash" TEXT NOT NULL,
        "lastLogin" TIMESTAMP(3),
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,

        CONSTRAINT "SuperAdmin_pkey" PRIMARY KEY ("id")
      );
    `);
        console.log('SuperAdmin table verified/created.');

        // 2. Create unique index
        await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "SuperAdmin_email_key" ON "SuperAdmin"("email");
    `);
        console.log('Unique index on email verified.');

        console.log('--- Migration Finished Successfully ---');
    } catch (e) {
        console.error('Migration failed:', e);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
