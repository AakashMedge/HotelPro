/**
 * Entitlement Sync Worker (Unified Architecture Stick)
 *
 * In the unified single-database architecture, entitlements are read directly
 * from the central Subscription table. No synchronization to dedicated
 * tenant databases is required.
 *
 * This file is kept as a stub to prevent import errors in legacy controllers.
 */

export async function syncEntitlementsToTenant(clientId: string): Promise<{
    success: boolean;
    message: string;
}> {
    // No-op for unified architecture
    return { success: true, message: 'Unified Architecture: No sync needed' };
}

export async function syncAllDedicatedTenants(): Promise<{
    total: number;
    succeeded: number;
    failed: number;
    results: Array<{ clientId: string; success: boolean; message: string }>;
}> {
    return {
        total: 0,
        succeeded: 0,
        failed: 0,
        results: [],
    };
}
