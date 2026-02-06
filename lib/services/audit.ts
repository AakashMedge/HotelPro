import { prisma } from "@/lib/db";
import { AuditAction } from "@prisma/client";

/**
 * Platform-wide Audit Logging Service.
 * Used to track high-value or security-related actions.
 */
export async function logAudit(data: {
    clientId: string;
    action: AuditAction;
    actorId?: string;
    orderId?: string;
    metadata?: any;
}) {
    try {
        return await prisma.auditLog.create({
            data: {
                clientId: data.clientId,
                action: data.action,
                actorId: data.actorId,
                orderId: data.orderId,
                metadata: data.metadata || {},
            }
        });
    } catch (err) {
        // We never want a logging failure to crash the main request
        console.error("[AUDIT_LOG_ERROR]:", err);
    }
}

/**
 * Specialized: Log a Security Event.
 */
export async function logSecurityEvent(clientId: string, action: AuditAction, metadata: any) {
    return await logAudit({
        clientId,
        action,
        metadata: {
            ...metadata,
            isSecurityEvent: true,
            timestamp: new Date().toISOString()
        }
    });
}
