/**
 * Session Service
 * 
 * Manages user sessions in the database for authentication.
 * Sessions allow token revocation and multi-device tracking.
 * 
 * Each session is linked to a User and has an expiration time.
 * The session ID is embedded in the JWT for stateful validation.
 */

import { prisma } from "@/lib/db";
import type { Session } from "@/generated/prisma";

/**
 * Get session duration from environment (defaults to 8 hours).
 */
function getSessionDurationMs(): number {
    const hours = parseInt(process.env.SESSION_DURATION_HOURS || "8", 10);
    return hours * 60 * 60 * 1000;
}

/**
 * Create a new session for a user after successful login.
 * 
 * @param userId - The authenticated user's ID
 * @returns The created session record
 * 
 * @example
 * // After password verification
 * const session = await createSession(user.id);
 * const token = await signToken(user.id, user.role, session.id);
 */
export async function createSession(userId: string): Promise<Session> {
    const expiresAt = new Date(Date.now() + getSessionDurationMs());

    const session = await prisma.session.create({
        data: {
            userId,
            expiresAt,
        },
    });

    return session;
}

/**
 * Validate that a session exists and is not expired.
 * 
 * @param sessionId - The session ID from the JWT
 * @returns The session if valid, null otherwise
 * 
 * @example
 * const payload = await verifyToken(token);
 * const session = await validateSession(payload.sessionId);
 * if (!session) {
 *   // Session was revoked or expired
 * }
 */
export async function validateSession(sessionId: string): Promise<Session | null> {
    const session = await prisma.session.findUnique({
        where: { id: sessionId },
    });

    if (!session) {
        return null; // Session doesn't exist (deleted/revoked)
    }

    if (session.expiresAt < new Date()) {
        // Session expired - clean it up
        await prisma.session.delete({ where: { id: sessionId } });
        return null;
    }

    return session;
}

/**
 * Delete a session (logout).
 * 
 * @param sessionId - The session ID to delete
 * 
 * @example
 * // On logout
 * const payload = await verifyToken(token);
 * await deleteSession(payload.sessionId);
 */
export async function deleteSession(sessionId: string): Promise<void> {
    await prisma.session.delete({
        where: { id: sessionId },
    }).catch(() => {
        // Session might already be deleted, that's fine
    });
}

/**
 * Delete all sessions for a user (force logout from all devices).
 * 
 * @param userId - The user ID to logout everywhere
 * @returns Number of sessions deleted
 * 
 * @example
 * // Admin forcing user logout
 * const count = await deleteAllUserSessions(userId);
 */
export async function deleteAllUserSessions(userId: string): Promise<number> {
    const result = await prisma.session.deleteMany({
        where: { userId },
    });

    return result.count;
}

/**
 * Clean up expired sessions from the database.
 * Call this periodically (e.g., via cron job) to maintain database hygiene.
 * 
 * @returns Number of expired sessions deleted
 * 
 * @example
 * // In a scheduled task
 * const cleaned = await cleanupExpiredSessions();
 * console.log(`Cleaned ${cleaned} expired sessions`);
 */
export async function cleanupExpiredSessions(): Promise<number> {
    const result = await prisma.session.deleteMany({
        where: {
            expiresAt: {
                lt: new Date(),
            },
        },
    });

    return result.count;
}

/**
 * Get all active sessions for a user.
 * Useful for "active sessions" display in user settings.
 * 
 * @param userId - The user ID to get sessions for
 * @returns Array of active sessions
 */
export async function getUserActiveSessions(userId: string): Promise<Session[]> {
    const sessions = await prisma.session.findMany({
        where: {
            userId,
            expiresAt: {
                gt: new Date(),
            },
        },
        orderBy: {
            createdAt: "desc",
        },
    });

    return sessions;
}

/**
 * Extend a session's expiration (keep-alive).
 * Call this on activity to prevent session timeout during active use.
 * 
 * @param sessionId - The session ID to extend
 * @returns The updated session, or null if session doesn't exist
 */
export async function extendSession(sessionId: string): Promise<Session | null> {
    const newExpiresAt = new Date(Date.now() + getSessionDurationMs());

    try {
        const session = await prisma.session.update({
            where: { id: sessionId },
            data: { expiresAt: newExpiresAt },
        });
        return session;
    } catch {
        return null; // Session doesn't exist
    }
}
