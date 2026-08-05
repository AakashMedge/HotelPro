/**
 * Server-side Authentication Utilities
 *
 * These utilities are for use in Server Components and API routes
 * to get the current authenticated user.
 */

import { cookies } from "next/headers";
import { verifyToken, validateSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { UserRole, ClientPlan, ClientStatus } from "@prisma/client";

export type AuthErrorCode =
    | "AUTH_REQUIRED"
    | "ROLE_FORBIDDEN"
    | "TENANT_NOT_CONFIGURED"
    | "TENANT_INACTIVE";

export class AuthError extends Error {
    code: AuthErrorCode;
    status: number;
    details?: Record<string, unknown>;

    constructor(
        code: AuthErrorCode,
        status: number,
        message: string,
        details?: Record<string, unknown>
    ) {
        super(message);
        this.name = "AuthError";
        this.code = code;
        this.status = status;
        this.details = details;
    }
}

export function isAuthError(error: unknown): error is AuthError {
    return error instanceof AuthError;
}

export function getAuthFailure(error: unknown): { status: number; code: string; message: string } | null {
    if (isAuthError(error)) {
        return {
            status: error.status,
            code: error.code,
            message: error.message,
        };
    }

    if (error instanceof Error) {
        if (error.message === "Authentication required") {
            return {
                status: 401,
                code: "AUTH_REQUIRED",
                message: "Authentication required",
            };
        }

        if (error.message.includes("Access denied")) {
            return {
                status: 403,
                code: "ROLE_FORBIDDEN",
                message: error.message,
            };
        }
    }

    return null;
}

/**
 * Current user information available after authentication
 */
export interface CurrentUser {
    id: string;
    clientId: string;
    username: string;
    name: string;
    role: UserRole;
    plan: ClientPlan;
    clientStatus: ClientStatus;
}

export function getCookieNameForRole(role?: string): string {
    if (!role) return "auth-token";
    switch (role.toUpperCase()) {
        case "SUPER_ADMIN":
            return "hq-token";
        case "ADMIN":
        case "MANAGER":
            return "auth-token-admin";
        case "WAITER":
            return "auth-token-waiter";
        case "KITCHEN":
            return "auth-token-kitchen";
        case "CASHIER":
            return "auth-token-cashier";
        default:
            return "auth-token";
    }
}

export const ALL_AUTH_COOKIES = [
    "auth-token-admin",
    "auth-token-waiter",
    "auth-token-kitchen",
    "auth-token-cashier",
    "auth-token",
    "hq-token"
];

/**
 * Get the current authenticated user from cookies.
 * Checks role-specific cookies first if roleHint is given, or candidate cookies in order.
 * Returns null if not authenticated or session is invalid.
 */
export async function getCurrentUser(roleHint?: string): Promise<CurrentUser | null> {
    try {
        const cookieStore = await cookies();
        
        const candidateCookieNames: string[] = [];
        if (roleHint) {
            candidateCookieNames.push(getCookieNameForRole(roleHint));
        }
        candidateCookieNames.push(
            "auth-token-admin",
            "auth-token-waiter",
            "auth-token-kitchen",
            "auth-token-cashier",
            "auth-token"
        );

        // Deduplicate cookie names while maintaining priority order
        const uniqueCookieNames = Array.from(new Set(candidateCookieNames));

        for (const cookieName of uniqueCookieNames) {
            const token = cookieStore.get(cookieName)?.value;
            if (!token) continue;

            try {
                const payload = await verifyToken(token);
                const session = await validateSession(payload.sessionId);
                if (!session) continue;

                const user = await (prisma.user as any).findUnique({
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
                                plan: true,
                                status: true,
                            },
                        },
                    },
                });

                if (!user || !user.isActive || user.clientId !== payload.clientId) {
                    continue;
                }

                return {
                    id: user.id,
                    clientId: user.clientId,
                    username: user.username,
                    name: user.name,
                    role: user.role,
                    plan: user.client.plan,
                    clientStatus: user.client.status,
                };
            } catch {
                // Token invalid/expired for this cookie, try next candidate
                continue;
            }
        }

        return null;
    } catch {
        return null;
    }
}

/**
 * Require authentication - throws if not authenticated.
 */
export async function requireAuth(roleHint?: string): Promise<CurrentUser> {
    const user = await getCurrentUser(roleHint);
    if (!user) {
        throw new AuthError("AUTH_REQUIRED", 401, "Authentication required");
    }

    const blockedStatuses: ClientStatus[] = [
        "SUSPENDED",
        "ARCHIVED",
        "PROVISIONING_FAILED",
        "CANCELED",
    ];

    if (blockedStatuses.includes(user.clientStatus)) {
        throw new AuthError(
            "TENANT_INACTIVE",
            403,
            `Tenant is not active (${user.clientStatus})`,
            { clientStatus: user.clientStatus, clientId: user.clientId }
        );
    }

    return user;
}

/**
 * Require specific role(s) - throws if not authenticated or wrong role.
 */
export async function requireRole(allowedRoles: UserRole[]): Promise<CurrentUser> {
    const primaryRoleHint = allowedRoles && allowedRoles.length > 0 ? allowedRoles[0] : undefined;
    const user = await requireAuth(primaryRoleHint);
    if (!allowedRoles.includes(user.role)) {
        console.warn(`[AUTH_GATE] Access denied for user ${user.username} (${user.id}) | role=${user.role} | allowed=${allowedRoles.join(",")}`);
        throw new AuthError(
            "ROLE_FORBIDDEN",
            403,
            `Access denied. Required roles: ${allowedRoles.join(", ")}`,
            { userRole: user.role, allowedRoles }
        );
    }
    return user;
}
