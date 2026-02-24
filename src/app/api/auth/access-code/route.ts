/**
 * Access Code Resolver API
 * POST /api/auth/access-code
 * 
 * The "Front Door" of the customer flow.
 * Maps a hotel access code -> clientId, sets a signed tenant cookie.
 * 
 * Security:
 * - Rate limited via Arcjet
 * - Generic error messages (no code enumeration)
 * - Synthetic delay to prevent timing attacks
 * - Audit logging for all attempts
 * 
 * Request:  { "code": "ROYAL99" }
 * Response: { "success": true, "hotel": { "name": "Taj Royal", "slug": "taj" } }
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { signTenantToken, getTenantCookieConfig } from "@/lib/tenant";
import { aj } from "@/lib/arcjet";

// ============================================
// Types
// ============================================

interface AccessCodeRequest {
    code: string;
}

interface AccessCodeSuccessResponse {
    success: true;
    hotel: {
        id: string;
        name: string;
        slug: string;
        plan: string;
    };
}

interface AccessCodeErrorResponse {
    success: false;
    error: string;
}

// ============================================
// Helpers
// ============================================

/** Synthetic delay (500-1000ms) to prevent timing-based enumeration */
async function syntheticDelay(): Promise<void> {
    const delay = 500 + Math.random() * 500;
    return new Promise((resolve) => setTimeout(resolve, delay));
}

/** Normalize access code: trim, uppercase */
function normalizeCode(code: string): string {
    return code.trim().toUpperCase();
}

// ============================================
// POST /api/auth/access-code
// ============================================

export async function POST(
    request: NextRequest
): Promise<NextResponse<AccessCodeSuccessResponse | AccessCodeErrorResponse>> {
    // 0. Security: Arcjet rate limiting
    try {
        const decision = await aj.protect(request);
        if (decision.isDenied()) {
            if (decision.reason.isRateLimit()) {
                return NextResponse.json(
                    { success: false, error: "Too many attempts. Please wait a moment." },
                    { status: 429 }
                );
            }
            return NextResponse.json(
                { success: false, error: "Access denied." },
                { status: 403 }
            );
        }
    } catch (e) {
        // Arcjet might fail in dev — proceed but log
        console.warn("[ACCESS-CODE] Arcjet check failed, proceeding:", e);
    }

    try {
        // 1. Parse body
        const body = await request.json().catch(() => null);
        if (!body) {
            await syntheticDelay();
            return NextResponse.json(
                { success: false, error: "Invalid request." },
                { status: 400 }
            );
        }

        const { code } = body as AccessCodeRequest;
        if (!code || typeof code !== "string" || code.trim().length < 2) {
            await syntheticDelay();
            return NextResponse.json(
                { success: false, error: "Please enter a valid access code." },
                { status: 400 }
            );
        }

        const normalized = normalizeCode(code);

        // 2. Lookup client by access code
        // We Use 'as any' here to bypass Prisma's lagging IDE types for newly added @unique fields
        const client = await (prisma.client as any).findUnique({
            where: { accessCode: normalized },
            select: {
                id: true,
                name: true,
                slug: true,
                status: true,
                plan: true,
            },
        });

        // Always add synthetic delay (prevents timing-based enumeration)
        await syntheticDelay();

        // 3. Generic "not found" message (security)
        if (!client) {
            console.log(`[ACCESS-CODE] Failed lookup for code: ${normalized.slice(0, 2)}***`);
            return NextResponse.json(
                { success: false, error: "Invalid access code. Please check with your hotel." },
                { status: 401 }
            );
        }

        // 4. Check hotel status
        if (client.status === "SUSPENDED") {
            return NextResponse.json(
                { success: false, error: "This hotel is currently unavailable. Please contact management." },
                { status: 403 }
            );
        }

        // 5. Sign tenant cookie (contains clientId, HMAC-signed)
        const tenantToken = await signTenantToken(client.id);
        const cookieConfig = getTenantCookieConfig();

        // 6. Build response
        const response = NextResponse.json<AccessCodeSuccessResponse>({
            success: true,
            hotel: {
                id: client.id,
                name: client.name,
                slug: client.slug,
                plan: client.plan,
            },
        });

        // 7. Set signed tenant cookie
        response.cookies.set(cookieConfig.name, tenantToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: cookieConfig.maxAge,
        });

        // 8. Also set legacy cookie for backward compatibility during migration
        response.cookies.set("hp-tenant", client.slug, {
            httpOnly: false, // Legacy: was readable by client-side JS
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: cookieConfig.maxAge,
        });

        // 9. Audit log: Successful entry
        try {
            await prisma.auditLog.create({
                data: {
                    clientId: client.id,
                    action: "LOGIN_SUCCESS",
                    metadata: {
                        type: "customer_access_code",
                        codePrefix: normalized.slice(0, 2),
                    },
                },
            });
        } catch { /* non-blocking */ }

        console.log(`[ACCESS-CODE] ✓ Customer entered hotel: ${client.name} (${client.id})`);

        return response;
    } catch (error) {
        console.error("[ACCESS-CODE] Unexpected error:", error);
        return NextResponse.json(
            { success: false, error: "Something went wrong. Please try again." },
            { status: 500 }
        );
    }
}
