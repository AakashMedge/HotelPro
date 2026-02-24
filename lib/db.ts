/**
 * Unified Database Provider (REFRESH_ANCHOR_FINAL_RECOVERY)
 * 
 * Standardizes on Single-Database Multi-Tenant Architecture.
 * All tenants share the same database; isolation is enforced via 'clientId'.
 * (v2: Force refresh for plan migration)
 */
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import dns from "node:dns";

/**
 * 🛠️ ULTIMATE INDIA DNS BYPASS
 */
if (typeof window === 'undefined') {
    const originalLookup = dns.lookup;
    const resolver = new (require('node:dns').Resolver)();
    resolver.setServers(['8.8.8.8', '1.1.1.1']);

    // @ts-ignore - Overriding internal Node.js DNS lookup
    dns.lookup = (hostname: string, options: any, callback: any) => {
        const actualCallback = typeof options === 'function' ? options : callback;
        const actualOptions = typeof options === 'function' ? {} : options;

        if (hostname && hostname.includes('neon.tech')) {
            resolver.resolve4(hostname, (err: any, addresses: string[]) => {
                if (!err && addresses && addresses.length > 0) {
                    return originalLookup(addresses[0], actualOptions, actualCallback);
                }
                originalLookup(hostname, actualOptions, actualCallback);
            });
        } else {
            originalLookup(hostname, actualOptions, actualCallback);
        }
    };
    console.log("🚀 Database: Ultimate DNS Bypass active for *.neon.tech");
}

if (typeof window === 'undefined') {
    neonConfig.webSocketConstructor = ws;
}

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

// FORCE RESET IN DEV TEMPORARILY TO FIX STALE SCHEMA
if (process.env.NODE_ENV !== "production") {
    // Always reset to ensure new schema (like ComplaintStatus.VERIFIED) is picked up
    globalForPrisma.prisma = undefined;
}

const createPrismaClient = () => {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        throw new Error("DATABASE_URL is not defined in environment variables");
    }

    try {
        const adapter = new PrismaNeon({ connectionString: connectionString.trim() });
        return new PrismaClient({ adapter });
    } catch (error) {
        console.error("Failed to initialize Prisma with Neon adapter:", error);
        return new PrismaClient();
    }
};

const createdPrisma = createPrismaClient();
console.log("💎 Prisma Initialized");
export const prisma = globalForPrisma.prisma ?? createdPrisma;

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}

export function getDb(_isolationLevel?: string, _databaseUrl?: string | null): PrismaClient {
    return prisma;
}

export async function ensureClientSynced(_db: PrismaClient, _clientId: string) {
    return true;
}