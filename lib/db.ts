/**
 * Unified Database Provider
 * 
 * Standardizes on Single-Database Multi-Tenant Architecture.
 * All tenants share the same database; isolation is enforced via 'clientId'.
 * (Forced reload for Attachment Update)
 */
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import dns from "node:dns";

/**
 * 🛠️ ULTIMATE INDIA DNS BYPASS
 * Some ISPs in India (Jio/Airtel) block or fail to resolve *.neon.tech hostnames.
 * This script overrides the global Node.js DNS lookup for Neon domains.
 * It resolves the domain via Google/Cloudflare DNS but then passes the IP
 * back to the original dns.lookup to ensure Node.js internals (SSL, states)
 * are perfectly preserved.
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
                    // Success! Pass the IP address to the ORIGINAL lookup.
                    // This bypasses network-level DNS while keeping Node.js internals happy.
                    return originalLookup(addresses[0], actualOptions, actualCallback);
                }
                // Fallback to original lookup
                originalLookup(hostname, actualOptions, actualCallback);
            });
        } else {
            originalLookup(hostname, actualOptions, actualCallback);
        }
    };
    console.log("🚀 Database: Ultimate DNS Bypass active for *.neon.tech");
}

// Standard Neon configuration for Node.js
if (typeof window === 'undefined') {
    neonConfig.webSocketConstructor = ws;
}

// singleton pattern to prevent multiple connections in dev
const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

// RESET ONLY IF NEW MODELS ARE MISSING
if (process.env.NODE_ENV !== "production" && globalForPrisma.prisma && !(globalForPrisma.prisma as any).chatChannel) {
    globalForPrisma.prisma = undefined;
}

const createPrismaClient = () => {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        throw new Error("DATABASE_URL is not defined in environment variables");
    }

    try {
        // Use Neon Adapter for edge-ready connections
        const adapter = new PrismaNeon({ connectionString: connectionString.trim() });
        return new PrismaClient({ adapter });
    } catch (error) {
        console.error("Failed to initialize Prisma with Neon adapter:", error);
        // Fallback to standard Prisma if adapter fails (optional, but good for debugging)
        return new PrismaClient();
    }
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}

/**
 * Compatibility helper for existing code.
 * In unified architecture, this ALWAYS returns the main prisma instance.
 */
export function getDb(_isolationLevel?: string, _databaseUrl?: string | null): PrismaClient {
    return prisma;
}

/**
 * Standard utility for ensuring consistency (Legacy compatibility stub)
 */
export async function ensureClientSynced(_db: PrismaClient, _clientId: string) {
    return true;
}
