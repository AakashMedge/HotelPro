import { PrismaClient } from '@prisma/client';

async function main() {
    const prisma = new PrismaClient();
    try {
        console.log("Attempting raw query...");
        const result = await prisma.$queryRaw`SELECT 1`;
        console.log("Raw query successful:", result);

        console.log("Attempting to list tables...");
        const tables = await prisma.$queryRaw`SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'`;
        console.log("Tables found:", tables);

    } catch (error: any) {
        console.error("DATABASE ERROR:", error.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
