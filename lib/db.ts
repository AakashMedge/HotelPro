/**
 * Prisma Client with Neon Driver Adapter
 * 
 * Prisma v7 requires a Driver Adapter when the datasource URL
 * is not specified in schema.prisma. This configuration uses
 * the Neon serverless driver for PostgreSQL connections.
 * 
 * Uses singleton pattern to prevent connection pool exhaustion
 * during development hot reloads.
 */

import { PrismaClient } from "@/generated/prisma";
// Force refresh after schema change
import { PrismaNeon } from "@prisma/adapter-neon";

/**
 * Create a Prisma Client instance with the Neon adapter.
 */
function createPrismaClient(): PrismaClient {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        throw new Error("DATABASE_URL environment variable is not set");
    }

    const adapter = new PrismaNeon({ connectionString });

    return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

/**
 * Singleton Prisma client instance.
 * Use this throughout the application for database access.
 * 
 * @example
 * import { prisma } from "@/lib/db";
 * const users = await prisma.user.findMany();
 */
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}
