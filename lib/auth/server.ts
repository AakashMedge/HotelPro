/**
 * Server-side Authentication Utilities
 * 
 * These utilities are for use in Server Components and API routes
 * to get the current authenticated user.
 */

import { cookies } from "next/headers";
import { verifyToken, validateSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { UserRole, ClientPlan } from "@prisma/client";

/**
 * Current user information available after authentication
 */
export interface CurrentUser {
    id: string;
    clientId: string;
    username: string;
    name: string;
    role: UserRole;
    plan: ClientPlan; // Added for Feature Gating
}

/**
 * Get the current authenticated user from cookies.
 * Returns null if not authenticated or session is invalid.
 * 
 * @example
 * // In a Server Component or API route
 * const user = await getCurrentUser();
 * if (!user) {
 *   redirect("/login");
 * }
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
    try {
        // Get token from cookies
        const cookieStore = await cookies();
        const token = cookieStore.get("auth-token")?.value;

        if (!token) {
            return null;
        }

        // Verify JWT
        const payload = await verifyToken(token);

        // Validate session still exists in database
        const session = await validateSession(payload.sessionId);
        if (!session) {
            return null;
        }

        // Get user from database with client plan
        const user = await prisma.user.findUnique({
            where: { id: payload.sub },
            select: {
                id: true,
                clientId: true,
                username: true,
                name: true,
                role: true,
                isActive: true,
                client: {
                    select: {
                        plan: true
                    }
                }
            },
        });

        // Check user exists and is active
        if (!user || !user.isActive) {
            return null;
        }

        // Cross-verify that the user's clientId matches the JWT clientId
        if (user.clientId !== payload.clientId) {
            return null;
        }

        return {
            id: user.id,
            clientId: user.clientId,
            username: user.username,
            name: user.name,
            role: user.role,
            plan: user.client.plan,
        };
    } catch {
        return null;
    }
}

/**
 * Require authentication - throws if not authenticated.
 * Use in Server Components that should only render for logged-in users.
 * 
 * @example
 * const user = await requireAuth();
 * // If we reach here, user is guaranteed to be authenticated
 */
export async function requireAuth(): Promise<CurrentUser> {
    const user = await getCurrentUser();
    if (!user) {
        throw new Error("Authentication required");
    }
    return user;
}

/**
 * Require specific role(s) - throws if not authenticated or wrong role.
 * 
 * @example
 * const user = await requireRole(["ADMIN", "MANAGER"]);
 */
export async function requireRole(allowedRoles: UserRole[]): Promise<CurrentUser> {
    const user = await requireAuth();
    if (!allowedRoles.includes(user.role)) {
        throw new Error(`Access denied. Required roles: ${allowedRoles.join(", ")}`);
    }
    return user;
}
