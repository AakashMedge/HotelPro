import { prisma } from "@/lib/db";
import { AuditAction } from "@prisma/client";
import { logAudit } from "./audit";

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
 */
export async function getPlatformStats(): Promise<PlatformStats> {
    const [
        totalClients,
        totalOrders,
        revenueData,
        activeUsers,
        plans
    ] = await Promise.all([
        prisma.client.count(),
        prisma.order.count(),
        prisma.order.aggregate({
            _sum: {
                grandTotal: true
            }
        }),
        prisma.user.count({
            where: { isActive: true }
        }),
        prisma.client.groupBy({
            by: ['plan'],
            _count: {
                plan: true
            }
        })
    ]);

    return {
        totalClients,
        totalOrders,
        totalRevenue: Number(revenueData._sum.grandTotal || 0),
        activeUsers,
        plansDistribution: plans.map(p => ({
            plan: p.plan,
            count: p._count.plan
        }))
    };
}

/**
 * Fetch a list of all clients with basic info.
 */
export async function getAllClients() {
    return await prisma.client.findMany({
        include: {
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
        const client = await tx.client.create({
            data: {
                name: data.name,
                slug: data.slug.toLowerCase().trim(),
                plan: data.plan,
                status: 'ACTIVE'
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

        // 4. Log the Event (Outside transaction or inside? Let's do outside for speed or inside for consistency. 
        // Note: prisma.$transaction doesn't easily support our logAudit since it uses the global prisma client.
        // We will log it after the transaction succeeds.

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
        action: AuditAction.CLIENT_CREATED,
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
                in: [AuditAction.UNAUTHORIZED_ACCESS, AuditAction.LOGIN_FAILURE, AuditAction.PLAN_CHANGED]
            }
        },
        include: {
            client: { select: { name: true } }
        },
        orderBy: { createdAt: 'desc' }
    });
}
