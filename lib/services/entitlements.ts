/**
 * Entitlement Policy Layer
 * 
 * SERVER-SIDE enforcement of feature gates and resource limits.
 * This is the ONLY authority for "can this tenant do X?"
 * 
 * Rules:
 * 1. Backend APIs call hasFeature() / getLimit() BEFORE executing actions.
 * 2. UI gating is secondary — it's a UX nicety, not a security boundary.
 * 3. During HQ outages, the tenant EntitlementSnapshot is used as fallback.
 * 4. Stale snapshots (>24h) block admin-only actions but allow kitchen/checkout.
 */

import { prisma } from "@/lib/db";

// ============================================
// Types & Contracts
// ============================================

export interface EntitlementData {
    planName: string;
    subscriptionStatus: string;
    features: Record<string, boolean>;
    limits: Record<string, number>;
    version: number;
    graceUntil: Date | null;
}

// Feature keys (compile-time safety)
export type FeatureKey =
    | 'qr_menu'
    | 'basic_analytics'
    | 'ai_assistant'
    | 'inventory'
    | 'ai_analysis'
    | 'custom_branding'
    | 'isolated_database'
    | 'multi_property'
    | 'ai_automation'
    | 'dedicated_support';

// Limit keys
export type LimitKey =
    | 'tables'
    | 'menuItems';

// Staleness thresholds (in milliseconds)
const STALE_THRESHOLD_CRITICAL = 24 * 60 * 60 * 1000;  // 24h — block admin actions
const STALE_THRESHOLD_KITCHEN = 72 * 60 * 60 * 1000;  // 72h — block kitchen/checkout

// ============================================
// Default Plan Definitions (hardcoded fallback)
// ============================================

const DEFAULT_PLANS: Record<string, { features: Record<string, boolean>; limits: Record<string, number> }> = {
    BASIC: {
        features: {
            qr_menu: true,
            basic_analytics: true,
            ai_assistant: false,
            inventory: false,
            ai_analysis: false,
            custom_branding: false,
            isolated_database: false,
            multi_property: false,
            ai_automation: false,
            dedicated_support: false,
        },
        limits: { tables: 30, menuItems: 300 },
    },
    ADVANCE: {
        features: {
            qr_menu: true,
            basic_analytics: true,
            ai_assistant: true,
            inventory: true,
            ai_analysis: false,
            custom_branding: false,
            isolated_database: false,
            multi_property: false,
            ai_automation: false,
            dedicated_support: false,
        },
        limits: { tables: 100, menuItems: 5000 },
    },
    PREMIUM: {
        features: {
            qr_menu: true,
            basic_analytics: true,
            ai_assistant: true,
            inventory: true,
            ai_analysis: true,
            custom_branding: true,
            isolated_database: true,
            multi_property: false,
            ai_automation: false,
            dedicated_support: false,
        },
        limits: { tables: 1000, menuItems: 0 }, // 0 = unlimited
    },
    BUSINESS: {
        features: {
            qr_menu: true,
            basic_analytics: true,
            ai_assistant: true,
            inventory: true,
            ai_analysis: true,
            custom_branding: true,
            isolated_database: true,
            multi_property: true,
            ai_automation: true,
            dedicated_support: true,
        },
        limits: { tables: 0, menuItems: 0 }, // 0 = unlimited
    },
};

// ============================================
// Core Policy Functions
// ============================================

/**
 * Get the full entitlement data for a client.
 * Fetches from the control-plane (Subscription + Plan).
 * Falls back to client.plan enum if no subscription exists yet.
 */
export async function getEntitlements(clientId: string): Promise<EntitlementData> {
    // Try to fetch from Subscription (the authoritative source)
    const subscription = await (prisma.subscription as any).findUnique({
        where: { clientId },
        include: { plan: true },
    });

    if (subscription && subscription.plan) {
        return {
            planName: subscription.plan.name,
            subscriptionStatus: subscription.status,
            features: subscription.plan.features as Record<string, boolean>,
            limits: subscription.plan.limits as Record<string, number>,
            version: subscription.version,
            graceUntil: subscription.graceUntil,
        };
    }

    // Fallback: read from client.plan enum (legacy / pre-subscription clients)
    const client = await (prisma.client as any).findUnique({
        where: { id: clientId },
        select: { plan: true, status: true },
    });

    const planCode = client?.plan || 'BASIC';
    const defaults = DEFAULT_PLANS[planCode] || DEFAULT_PLANS.BASIC;

    return {
        planName: planCode,
        subscriptionStatus: client?.status === 'ACTIVE' ? 'ACTIVE' : 'TRIALING',
        features: defaults.features,
        limits: defaults.limits,
        version: 0, // No subscription version
        graceUntil: null,
    };
}

/**
 * Check if a client has access to a specific feature.
 * This is the PRIMARY gate — used by all APIs.
 */
export async function hasFeature(clientId: string, feature: FeatureKey): Promise<boolean> {
    const entitlements = await getEntitlements(clientId);

    // Check subscription status first
    if (!isSubscriptionActive(entitlements)) {
        return false;
    }

    return entitlements.features[feature] === true;
}

/**
 * Get the resource limit for a client.
 * Returns 0 for unlimited, or the numeric cap.
 */
export async function getLimit(clientId: string, limit: LimitKey): Promise<number> {
    const entitlements = await getEntitlements(clientId);
    return entitlements.limits[limit] ?? 0;
}

/**
 * Check if a client can create more of a resource (tables, menu items, etc.).
 * Returns { allowed: boolean, current: number, limit: number }
 */
export async function checkResourceLimit(
    clientId: string,
    resource: LimitKey
): Promise<{ allowed: boolean; current: number; limit: number }> {
    const limit = await getLimit(clientId, resource);

    // 0 = unlimited
    if (limit === 0) {
        return { allowed: true, current: 0, limit: 0 };
    }

    // Count current resources
    let current = 0;
    if (resource === 'tables') {
        current = await (prisma.table as any).count({
            where: { clientId, deletedAt: null },
        });
    } else if (resource === 'menuItems') {
        current = await (prisma.menuItem as any).count({
            where: { clientId, deletedAt: null },
        });
    }

    return {
        allowed: current < limit,
        current,
        limit,
    };
}

// ============================================
// Subscription Status Helpers
// ============================================

/**
 * Determine if subscription allows normal operations.
 * Accounts for grace periods.
 */
function isSubscriptionActive(entitlements: EntitlementData): boolean {
    const { subscriptionStatus, graceUntil } = entitlements;

    // Active or trialing — full access
    if (subscriptionStatus === 'ACTIVE' || subscriptionStatus === 'TRIALING') {
        return true;
    }

    // Past due — check grace period
    if (subscriptionStatus === 'PAST_DUE' && graceUntil) {
        return new Date() < graceUntil;
    }

    // Canceled, Inactive — no access
    return false;
}

/**
 * Determine if a specific action category is allowed based on staleness.
 * Used when checking tenant-side EntitlementSnapshot freshness.
 * 
 * @param action - 'critical' (kitchen, checkout) or 'admin' (settings, user mgmt)
 * @param lastUpdated - When the snapshot was last synced
 */
export function isActionAllowedByFreshness(
    action: 'critical' | 'admin',
    lastUpdated: Date
): boolean {
    const age = Date.now() - lastUpdated.getTime();

    if (action === 'admin') {
        return age < STALE_THRESHOLD_CRITICAL;
    }
    // Kitchen/checkout gets more runway
    return age < STALE_THRESHOLD_KITCHEN;
}
