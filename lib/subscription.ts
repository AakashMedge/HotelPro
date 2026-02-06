import { ClientPlan } from "@prisma/client";

export enum Feature {
    AI_CONCIERGE = "AI_CONCIERGE",
    ADVANCED_ANALYTICS = "ADVANCED_ANALYTICS",
    CUSTOM_DOMAINS = "CUSTOM_DOMAINS",
    MULTI_SECTION_TABLES = "MULTI_SECTION_TABLES",
    INVENTORY_MANAGEMENT = "INVENTORY_MANAGEMENT",
    STAFF_PERFORMANCE = "STAFF_PERFORMANCE",
    UNLIMITED_TABLES = "UNLIMITED_TABLES",
}

/**
 * The Source of Truth for Feature Gating.
 * Defines which plans have access to which platform features.
 */
export const PLAN_FEATURES: Record<ClientPlan, Feature[]> = {
    [ClientPlan.BASIC]: [
        Feature.MULTI_SECTION_TABLES, // Basic needs sections
    ],
    [ClientPlan.ADVANCE]: [
        Feature.MULTI_SECTION_TABLES,
        Feature.INVENTORY_MANAGEMENT,
        Feature.UNLIMITED_TABLES,
    ],
    [ClientPlan.PREMIUM]: [
        Feature.MULTI_SECTION_TABLES,
        Feature.INVENTORY_MANAGEMENT,
        Feature.UNLIMITED_TABLES,
        Feature.AI_CONCIERGE, // AI is a Premium draw
        Feature.STAFF_PERFORMANCE,
    ],
    [ClientPlan.BUSINESS]: [
        Feature.MULTI_SECTION_TABLES,
        Feature.INVENTORY_MANAGEMENT,
        Feature.UNLIMITED_TABLES,
        Feature.AI_CONCIERGE,
        Feature.STAFF_PERFORMANCE,
        Feature.ADVANCED_ANALYTICS,
        Feature.CUSTOM_DOMAINS,
    ],
};

/**
 * Table Limits based on Plan
 */
export const PLAN_LIMITS = {
    [ClientPlan.BASIC]: { maxTables: 10, maxMenuItems: 50 },
    [ClientPlan.ADVANCE]: { maxTables: 40, maxMenuItems: 150 },
    [ClientPlan.PREMIUM]: { maxTables: 100, maxMenuItems: 500 },
    [ClientPlan.BUSINESS]: { maxTables: 9999, maxMenuItems: 9999 },
};

/**
 * Check if a specific feature is enabled for a given plan.
 */
export function isFeatureEnabled(plan: ClientPlan, feature: Feature): boolean {
    const activeFeatures = PLAN_FEATURES[plan] || [];
    return activeFeatures.includes(feature);
}

/**
 * Check if a client has reached their record limits.
 */
export function hasReachedLimit(plan: ClientPlan, type: 'maxTables' | 'maxMenuItems', currentCount: number): boolean {
    const limits = PLAN_LIMITS[plan];
    return currentCount >= (limits as any)[type];
}
