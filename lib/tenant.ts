/**
 * Tenant Resolution Contract
 * 
 * THE SOURCE OF TRUTH for multi-tenant isolation.
 * Every API route and Server Component MUST use this to identify the hotel.
 * 
 * Resolution Hierarchy (strict, no fallbacks):
 * 1. Staff JWT: Extract `clientId` from verified auth-token cookie (highest priority)
 * 2. Customer Cookie: Read `hp-tenant-id` cookie (signed, contains clientId UUID)
 * 3. Hard Fail: Return null — caller must 401/redirect to access-code entry
 * 
 * NEVER falls back to demo data. NEVER guesses the tenant.
 */

import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

// ============================================
// Types
// ============================================

export interface TenantConfig {
    id: string;       // clientId UUID — the ONLY identity that matters
    name: string;
    slug: string;
    plan: string;
    status: string;
}

// ============================================
// Tenant Cookie Signing (HMAC-based)
// ============================================

const TENANT_COOKIE_NAME = "hp-tenant-id";
const TENANT_COOKIE_MAX_AGE = 4 * 60 * 60; // 4 hours

function getTenantSecret(): Uint8Array {
    // Re-use JWT_SECRET for signing tenant cookies (same security level)
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32) {
        throw new Error("JWT_SECRET must be set (32+ chars) for tenant cookie signing");
    }
    return new TextEncoder().encode(secret);
}

/**
 * Create a signed tenant cookie value containing the clientId.
 * This is set after access-code verification or QR scan.
 */
export async function signTenantToken(clientId: string): Promise<string> {
    const secret = getTenantSecret();
    const token = await new SignJWT({ clientId })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime(`${TENANT_COOKIE_MAX_AGE}s`)
        .setIssuer("hotelpro-tenant")
        .sign(secret);
    return token;
}

/**
 * Verify and extract clientId from a signed tenant cookie.
 */
async function verifyTenantToken(token: string): Promise<string | null> {
    try {
        const secret = getTenantSecret();
        const { payload } = await jwtVerify(token, secret, {
            issuer: "hotelpro-tenant",
        });
        return (payload as any).clientId || null;
    } catch {
        return null; // Invalid/expired token
    }
}

// ============================================
// Core Resolution
// ============================================

/**
 * Detect the current tenant (hotel) from the request context.
 * 
 * Priority:
 * 1. Staff auth-token JWT -> extract clientId (staff is LOCKED to their hotel)
 * 2. Signed hp-tenant-id cookie -> extract clientId (customer session)
 * 3. null -> caller MUST handle (401 / redirect to access-code page)
 * 
 * @returns TenantConfig or null (hard fail)
 */
export async function getTenantFromRequest(): Promise<TenantConfig | null> {
    const cookieStore = await cookies();

    // ─── Priority 1: Staff JWT (highest authority) ───
    const authToken = cookieStore.get("auth-token")?.value;
    if (authToken) {
        try {
            // Import dynamically to avoid circular deps
            const { verifyToken } = await import("@/lib/auth/jwt");
            const payload = await verifyToken(authToken);
            if (payload.clientId) {
                const client = await (prisma.client as any).findUnique({
                    where: { id: payload.clientId },
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        plan: true,
                        status: true,
                    },
                });
                if (client) {
                    if (client.status === "ARCHIVED") {
                        console.warn(`[TENANT] Blocked access to archived tenant: ${client.name}`);
                        return null;
                    }
                    console.log(`[TENANT] Resolved via staff JWT: ${client.name} (${client.id})`);
                    return {
                        id: client.id,
                        name: client.name,
                        slug: client.slug,
                        plan: client.plan,
                        status: client.status,
                    };
                }
            }
        } catch {
            // JWT invalid/expired — fall through to customer cookie
        }
    }

    // ─── Priority 2: Signed Customer Tenant Cookie ───
    const tenantToken = cookieStore.get(TENANT_COOKIE_NAME)?.value;
    if (tenantToken) {
        const clientId = await verifyTenantToken(tenantToken);
        if (clientId) {
            const client = await (prisma.client as any).findUnique({
                where: { id: clientId },
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    plan: true,
                    status: true,
                },
            });
            if (client) {
                if (client.status === "ARCHIVED") {
                    console.warn(`[TENANT] Blocked customer access to archived tenant: ${client.name}`);
                    return null;
                }
                console.log(`[TENANT] Resolved via customer cookie: ${client.name} (${client.id})`);
                return {
                    id: client.id,
                    name: client.name,
                    slug: client.slug,
                    plan: client.plan,
                    status: client.status,
                };
            }
        }
    }

    // ─── Hard Fail ───
    console.warn("[TENANT] ✗ No tenant resolved. Caller must handle auth redirect.");
    return null;
}

// ============================================
// Helpers
// ============================================

/**
 * Get the tenant cookie name and max age for setting from API routes.
 */
export function getTenantCookieConfig() {
    return {
        name: TENANT_COOKIE_NAME,
        maxAge: TENANT_COOKIE_MAX_AGE,
    };
}

/**
 * Validate that the current user belongs to the current tenant.
 * Security boundary for multi-tenancy.
 */
export function validateTenantAccess(userClientId: string, currentClientId: string): boolean {
    return userClientId === currentClientId;
}
