import { prisma } from "@/lib/db";
import { AuditAction } from "@prisma/client";
import { logAudit } from "./audit";
import { getAggregatedPlatformStats } from "./metrics";

export interface PlatformStats {
    totalClients: number;
    totalOrders: number;
    totalRevenue: number;
    activeUsers: number;
    plansDistribution: {
        plan: string;
        count: number;
    }[];
}

/**
 * Fetch high-level platform statistics for the Super Admin Dashboard.
 * Aggregates data from both SHARED and DEDICATED databases.
 */
export async function getPlatformStats(): Promise<PlatformStats> {
    return await getAggregatedPlatformStats();
}

/**
 * Fetch a list of all clients with basic info.
 */
export async function getAllClients() {
    return await (prisma.client as any).findMany({
        select: {
            id: true,
            name: true,
            slug: true,
            plan: true,
            status: true,
            createdAt: true,
            _count: {
                select: { users: true, orders: true }
            }
        },
        orderBy: { createdAt: 'desc' }
    });
}

/**
 * Create a new Client/Hotel on the platform.
 * This also creates their default Admin user and Initial Settings.
 */
export async function createClient(data: {
    name: string;
    slug: string;
    plan: 'BASIC' | 'ADVANCE' | 'PREMIUM' | 'BUSINESS';
    adminUser: {
        username: string;
        name: string;
        passwordHash: string;
    }
}) {
    return await prisma.$transaction(async (tx) => {
        // 1. Create Client
        const client = await (tx.client as any).create({
            data: {
                name: data.name,
                slug: data.slug.toLowerCase().trim(),
                plan: data.plan,
                status: 'ACTIVE' as any,
            }
        });

        // 2. Create Default Admin User for this client
        await tx.user.create({
            data: {
                clientId: client.id,
                username: data.adminUser.username.toLowerCase().trim(),
                name: data.adminUser.name,
                passwordHash: data.adminUser.passwordHash,
                role: 'ADMIN',
                isActive: true
            }
        });

        // 3. Initialize Restaurant Settings
        await tx.restaurantSettings.create({
            data: {
                clientId: client.id,
                businessName: data.name,
            }
        });

        return client;
    });
}

/**
 * Helper to log after transaction (added to match the return of createClient)
 */
export async function onboardHotelAndLog(data: any) {
    const client = await createClient(data);
    await logAudit({
        clientId: client.id,
        action: 'CLIENT_CREATED' as any,
        metadata: { name: client.name, slug: client.slug }
    });
    return client;
}

/**
 * Fetch logs for all tenants.
 */
export async function getGlobalAuditLogs(limit = 50) {
    return await prisma.auditLog.findMany({
        include: {
            client: { select: { name: true, slug: true } },
            actor: { select: { name: true, role: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: limit
    });
}

/**
 * Fetch only security-related logs.
 */
export async function getSecurityEvents() {
    return await prisma.auditLog.findMany({
        where: {
            action: {
                in: ['UNAUTHORIZED_ACCESS' as any, 'LOGIN_FAILURE' as any, 'PLAN_CHANGED' as any]
            }
        },
        include: {
            client: { select: { name: true } }
        },
        orderBy: { createdAt: 'desc' }
    });
}
