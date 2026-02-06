/**
 * Tenant Context Utilities
 * 
 * Provides easy access to the current tenant's clientId in API routes.
 * All tenant-scoped queries should use these utilities.
 */

import { getCurrentUser } from "@/lib/auth";
import type { CurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ClientStatus } from "@prisma/client";

/**
 * Extended user info with client details for tenant-aware operations
 */
export interface TenantUser extends CurrentUser {
    clientName: string;
    clientSlug: string;
    clientStatus: ClientStatus;
}

/**
 * Get the current user with their client (tenant) information.
 * Returns null if not authenticated.
 */
export async function getTenantUser(): Promise<TenantUser | null> {
    const user = await getCurrentUser();

    if (!user) {
        return null;
    }

    // Get client details
    const client = await prisma.client.findUnique({
        where: { id: user.clientId },
        select: {
            name: true,
            slug: true,
            status: true
        }
    });

    if (!client) {
        return null;
    }

    return {
        ...user,
        clientName: client.name,
        clientSlug: client.slug,
        clientStatus: client.status
    };
}

/**
 * Get just the clientId from the current session.
 * Throws if not authenticated.
 */
export async function requireTenantId(): Promise<string> {
    const user = await getCurrentUser();

    if (!user) {
        throw new Error("Authentication required");
    }

    return user.clientId;
}

/**
 * Check if the current user's client is active (not suspended).
 * Returns false if suspended.
 */
export async function isTenantActive(): Promise<boolean> {
    const user = await getCurrentUser();

    if (!user) {
        return false;
    }

    const client = await prisma.client.findUnique({
        where: { id: user.clientId },
        select: { status: true }
    });

    if (!client) {
        return false;
    }

    // Allow ACTIVE and TRIAL status
    return client.status === ClientStatus.ACTIVE || client.status === ClientStatus.TRIAL;
}

/**
 * Get tenant-scoped Prisma query filter.
 * Use this to add clientId filter to all queries.
 * 
 * @example
 * const orders = await prisma.order.findMany({
 *   where: {
 *     ...await getTenantFilter(),
 *     status: 'NEW'
 *   }
 * });
 */
export async function getTenantFilter(): Promise<{ clientId: string }> {
    const clientId = await requireTenantId();
    return { clientId };
}

/**
 * Count records for the current tenant only.
 * Helper for dashboard statistics.
 */
export async function getTenantStats(clientId: string) {
    const [userCount, tableCount, menuCount, orderCount, todayOrders, todayRevenue] = await Promise.all([
        prisma.user.count({ where: { clientId } }),
        prisma.table.count({ where: { clientId } }),
        prisma.menuItem.count({ where: { clientId } }),
        prisma.order.count({ where: { clientId } }),
        prisma.order.count({
            where: {
                clientId,
                createdAt: {
                    gte: new Date(new Date().setHours(0, 0, 0, 0))
                }
            }
        }),
        prisma.order.aggregate({
            where: {
                clientId,
                status: 'CLOSED',
                createdAt: {
                    gte: new Date(new Date().setHours(0, 0, 0, 0))
                }
            },
            _sum: {
                grandTotal: true
            }
        })
    ]);

    return {
        users: userCount,
        tables: tableCount,
        menuItems: menuCount,
        totalOrders: orderCount,
        todayOrders,
        todayRevenue: Number(todayRevenue._sum.grandTotal || 0)
    };
}
