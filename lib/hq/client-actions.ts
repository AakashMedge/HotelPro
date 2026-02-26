/**
 * HQ Client Management Actions
 * 
 * Server-side business logic for managing clients from Super Admin HQ.
 * Keep all HQ operations in this file for clean separation.
 */

import { prisma } from "@/lib/db";
import { AuditAction, ClientPlan, ClientStatus } from "@prisma/client";
import { hashPassword } from "@/lib/auth/password";
import {
    CreateClientInput,
    UpdateClientInput,
    ClientWithStats,
    PLAN_PRICING,
    TRIAL_PERIOD_DAYS,
    ClientSubscription
} from "@/lib/types/hq.types";

// ============================================
// CLIENT CRUD OPERATIONS
// ============================================

/**
 * Get all clients with stats for HQ dashboard
 */
export async function getClientsWithStats(): Promise<ClientWithStats[]> {
    const clients = await prisma.client.findMany({
        include: {
            subscription: {
                include: { plan: true }
            },
            _count: {
                select: {
                    users: true,
                    orders: true,
                    tables: true,
                    menuItems: true
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    return clients.map((client: any) => ({
        ...client,
        subscription: mapSubscription(client.subscription, client.plan, client.createdAt)
    })) as ClientWithStats[];
}

/**
 * Get single client by ID with full details
 */
export async function getClientById(clientId: string): Promise<ClientWithStats | null> {
    const client = await prisma.client.findUnique({
        where: { id: clientId },
        include: {
            subscription: {
                include: { plan: true }
            },
            saaSPayments: {
                orderBy: { paidAt: 'desc' },
                take: 10
            },
            _count: {
                select: {
                    users: true,
                    orders: true,
                    tables: true,
                    menuItems: true
                }
            },
            users: {
                // where: { role: 'ADMIN' }, // Allow fetching all staff for audit
                orderBy: { role: 'asc' }, // Admins first usually
                select: {
                    id: true,
                    username: true,
                    name: true,
                    isActive: true,
                    createdAt: true
                }
            }
        }
    });

    if (!client) return null;

    const tenant = client as any;
    return {
        ...tenant,
        subscription: mapSubscription(tenant.subscription, tenant.plan, tenant.createdAt)
    } as ClientWithStats;
}

/**
 * Map DB subscription to ClientSubscription type
 */
function mapSubscription(sub: any, clientPlan: string, createdAt: Date): ClientSubscription {
    if (!sub) {
        // Fallback for clients without subscription record (though they should have one)
        return {
            planStartDate: createdAt,
            planEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            isTrialActive: false,
            nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            billingCycle: 'MONTHLY',
            monthlyPrice: PLAN_PRICING[clientPlan as keyof typeof PLAN_PRICING] || 0
        };
    }

    return {
        planStartDate: sub.startDate || sub.createdAt,
        planEndDate: sub.currentPeriodEnd,
        trialEndsAt: sub.trialEndsAt || new Date(sub.createdAt.getTime() + 14 * 24 * 60 * 60 * 1000),
        isTrialActive: sub.status === 'TRIAL',
        nextBillingDate: sub.currentPeriodEnd,
        billingCycle: sub.billingCycle || 'MONTHLY',
        monthlyPrice: Number(sub.plan?.price || PLAN_PRICING[clientPlan as keyof typeof PLAN_PRICING] || 0)
    };
}

/**
 * Create a new client with admin user
 * This is the main onboarding function
 */
export async function createNewClient(input: CreateClientInput): Promise<{ success: boolean; clientId?: string; error?: string }> {
    try {
        // 1. Validate slug uniqueness
        const existingSlug = await prisma.client.findUnique({
            where: { slug: input.slug.toLowerCase().trim() }
        });
        if (existingSlug) {
            return { success: false, error: "This slug is already taken. Choose a different one." };
        }

        // 2. Validate username uniqueness
        const existingUsername = await prisma.user.findUnique({
            where: { username: input.adminUsername.toLowerCase().trim() }
        });
        if (existingUsername) {
            return { success: false, error: "This admin username is already taken." };
        }

        // 3. Hash password
        const passwordHash = await hashPassword(input.adminPassword);

        // 4. Create client, admin user, and settings in transaction
        const client = await prisma.$transaction(async (tx) => {
            // Create Client
            const newClient = await tx.client.create({
                data: {
                    name: input.name.trim(),
                    slug: input.slug.toLowerCase().trim(),
                    domain: input.domain?.trim() || null,
                    plan: input.plan,
                    status: 'TRIAL' as any,
                }
            });

            // Create Admin User for this Client
            await tx.user.create({
                data: {
                    clientId: newClient.id,
                    username: input.adminUsername.toLowerCase().trim(),
                    name: input.adminName.trim(),
                    passwordHash: passwordHash,
                    role: 'ADMIN',
                    isActive: true
                }
            });

            // Create Default Restaurant Settings
            await tx.restaurantSettings.create({
                data: {
                    clientId: newClient.id,
                    businessName: input.name.trim()
                }
            });

            // Log the creation
            await tx.auditLog.create({
                data: {
                    clientId: newClient.id,
                    action: AuditAction.CLIENT_CREATED,
                    metadata: {
                        name: newClient.name,
                        slug: newClient.slug,
                        plan: newClient.plan,
                        billingCycle: input.billingCycle || 'MONTHLY',
                        adminUsername: input.adminUsername
                    }
                }
            });

            // Create Subscription Record
            await tx.subscription.create({
                data: {
                    clientId: newClient.id,
                    planId: (await tx.plan.findFirst({ where: { code: input.plan as any } }))?.id || '',
                    status: 'ACTIVE' as any,
                    billingCycle: input.billingCycle || 'MONTHLY',
                    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                }
            });

            return newClient;
        });

        return { success: true, clientId: client.id };

    } catch (error) {
        console.error("[HQ] Create client error:", error);
        return { success: false, error: "Failed to create client. Please try again." };
    }
}

/**
 * Update an existing client
 */
export async function updateClient(
    clientId: string,
    input: UpdateClientInput
): Promise<{ success: boolean; error?: string }> {
    try {
        const existingClient = await prisma.client.findUnique({
            where: { id: clientId }
        });

        if (!existingClient) {
            return { success: false, error: "Client not found." };
        }

        // Track what changed for audit
        const changes: Record<string, { from: string; to: string }> = {};

        if (input.plan && input.plan !== (existingClient as any).plan) {
            changes.plan = { from: (existingClient as any).plan, to: input.plan };
        }
        if (input.status && input.status !== (existingClient as any).status) {
            changes.status = { from: (existingClient as any).status, to: input.status };
        }

        await prisma.$transaction(async (tx) => {
            // Update client
            await tx.client.update({
                where: { id: clientId },
                data: {
                    name: input.name?.trim(),
                    plan: input.plan as any,
                    status: input.status as any,
                    domain: input.domain?.trim(),
                }
            });

            // Update Subscription if plan or cycle changed
            if (input.plan || input.billingCycle) {
                const plan = await tx.plan.findFirst({ where: { code: input.plan as any } });
                await tx.subscription.update({
                    where: { clientId },
                    data: {
                        ...(plan ? { planId: plan.id } : {}),
                        ...(input.billingCycle ? { billingCycle: input.billingCycle } : {})
                    }
                });
            }

            // Log plan change if applicable
            if (changes.plan) {
                await tx.auditLog.create({
                    data: {
                        clientId: clientId,
                        action: AuditAction.PLAN_CHANGED,
                        metadata: changes as object
                    }
                });
            }

            // Log status change if applicable
            if (changes.status) {
                await tx.auditLog.create({
                    data: {
                        clientId: clientId,
                        action: 'SETTING_CHANGED' as any,
                        metadata: {
                            type: 'status_change',
                            from: changes.status.from,
                            to: changes.status.to
                        } as object
                    }
                });
            }
        });

        return { success: true };

    } catch (error) {
        console.error("[HQ] Update client error:", error);
        return { success: false, error: "Failed to update client." };
    }
}

/**
 * Suspend a client (sets status to SUSPENDED)
 */
export async function suspendClient(clientId: string, reason: string): Promise<{ success: boolean; error?: string }> {
    try {
        await prisma.$transaction(async (tx) => {
            await tx.client.update({
                where: { id: clientId },
                data: { status: 'SUSPENDED' as any }
            });

            await tx.auditLog.create({
                data: {
                    clientId: clientId,
                    action: 'SETTING_CHANGED' as any,
                    metadata: { type: 'client_suspended', reason }
                }
            });
        });

        return { success: true };
    } catch (error) {
        console.error("[HQ] Suspend client error:", error);
        return { success: false, error: "Failed to suspend client." };
    }
}

/**
 * Activate a client (sets status to ACTIVE)
 */
export async function activateClient(clientId: string): Promise<{ success: boolean; error?: string }> {
    try {
        await prisma.$transaction(async (tx) => {
            await tx.client.update({
                where: { id: clientId },
                data: { status: 'ACTIVE' as any }
            });

            await tx.auditLog.create({
                data: {
                    clientId: clientId,
                    action: 'SETTING_CHANGED' as any,
                    metadata: { type: 'client_activated' }
                }
            });
        });

        return { success: true };
    } catch (error) {
        console.error("[HQ] Activate client error:", error);
        return { success: false, error: "Failed to activate client." };
    }
}

/**
 * Archive a client (Soft Delete)
 */
export async function archiveClient(clientId: string): Promise<{ success: boolean; error?: string }> {
    try {
        await prisma.$transaction(async (tx) => {
            // 1. Update client status and set deletedAt
            await tx.client.update({
                where: { id: clientId },
                data: {
                    status: 'ARCHIVED' as any,
                    deletedAt: new Date()
                }
            });

            // 2. Deactivate all users of this client
            await tx.user.updateMany({
                where: { clientId },
                data: { isActive: false }
            });

            // 3. Log the archiving
            await tx.auditLog.create({
                data: {
                    clientId: clientId,
                    action: 'CLIENT_ARCHIVED' as any,
                    metadata: { type: 'client_archived', timestamp: new Date() }
                }
            });
        });

        return { success: true };
    } catch (error) {
        console.error("[HQ] Archive client error:", error);
        return { success: false, error: "Failed to archive client." };
    }
}

/**
 * Restore an archived client
 */
export async function restoreClient(clientId: string): Promise<{ success: boolean; error?: string }> {
    try {
        await prisma.$transaction(async (tx) => {
            await tx.client.update({
                where: { id: clientId },
                data: {
                    status: 'ACTIVE' as any,
                    deletedAt: null
                }
            });

            // Re-activate specific users (maybe just admins?)
            // For simplicity, we'll reactivate all for now
            await tx.user.updateMany({
                where: { clientId },
                data: { isActive: true }
            });

            await tx.auditLog.create({
                data: {
                    clientId: clientId,
                    action: 'SETTING_CHANGED' as any,
                    metadata: { type: 'client_restored' }
                }
            });
        });

        return { success: true };
    } catch (error) {
        console.error("[HQ] Restore client error:", error);
        return { success: false, error: "Failed to restore client." };
    }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Validate slug format
 */
export function isValidSlug(slug: string): boolean {
    // Only lowercase letters, numbers, and hyphens
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    return slugRegex.test(slug) && slug.length >= 3 && slug.length <= 30;
}

/**
 * Generate a slug from hotel name
 */
export function generateSlugFromName(name: string): string {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')  // Remove special chars
        .replace(/\s+/g, '-')           // Spaces to hyphens
        .replace(/-+/g, '-')            // Multiple hyphens to single
        .substring(0, 30);              // Limit length
}
