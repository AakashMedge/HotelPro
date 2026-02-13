
import { prisma } from "@/lib/db";
import { AuditAction } from "@prisma/client";

/**
 * Performs a selective reset for a specific hotel client.
 * This is a "Production-Grade" destructive action that wipes data
 * while preserving core identity (Client record and Users).
 */
export async function resetTenantData(clientId: string, actorId: string) {
    console.log(`[TENANT_RESET] Initiating selective wipe for Client: ${clientId}`);

    return await prisma.$transaction(async (tx) => {
        // 1. Wipe Operational History
        // Delete OrderItems first (Foreign Key dependency)
        await tx.orderItem.deleteMany({
            where: { order: { clientId } }
        });

        await tx.payment.deleteMany({
            where: { clientId }
        });

        // Audit logs are wiped too (Fresh start)
        await tx.auditLog.deleteMany({
            where: { clientId }
        });

        await tx.order.deleteMany({
            where: { clientId }
        });

        // 2. Wipe Infrastructure
        await tx.table.deleteMany({
            where: { clientId }
        });

        // 3. Wipe Menu Architecture
        // Variants and Modifiers are cascading in schema? Let's check schema.
        // MenuItemModifierGroup and MenuItemVariant have onDelete: Cascade
        await tx.menuItem.deleteMany({
            where: { clientId }
        });

        await tx.modifierGroup.deleteMany({
            where: { clientId }
        });

        await tx.category.deleteMany({
            where: { clientId }
        });

        await tx.restaurantSettings.deleteMany({
            where: { clientId }
        });

        // 4. Create an Audit Log for the wipe itself (The only record of the old world)
        await tx.auditLog.create({
            data: {
                clientId,
                action: AuditAction.SENSITIVE_DELETE,
                actorId,
                metadata: {
                    type: "FULL_FACTORY_RESET",
                    timestamp: new Date().toISOString(),
                    reason: "Manual admin reset"
                }
            }
        });

        console.log(`[TENANT_RESET] ✓ Reset complete for Client: ${clientId}`);
        return { success: true };
    });
}
