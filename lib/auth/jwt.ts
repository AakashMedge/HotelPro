/**
 * JWT Utilities
 * 
 * Provides JWT token creation and verification using the `jose` library.
 * Uses HS256 algorithm with a secret key from environment variables.
 * 
 * Security notes:
 * - Uses jose library (edge-runtime compatible, modern API)
 * - Secret must be at least 32 characters for HS256
 * - Tokens are short-lived (configurable via SESSION_DURATION_HOURS)
 * - Claims include userId, role, and sessionId for stateless auth
 */

import { SignJWT, jwtVerify, JWTPayload } from "jose";
import type { UserRole } from "@/generated/prisma";

/**
 * JWT payload structure for HotelPro authentication.
 */
export interface AuthTokenPayload extends JWTPayload {
    /** User's database ID */
    sub: string;
    /** User's role (ADMIN, MANAGER, WAITER, KITCHEN, CASHIER) */
    role: UserRole;
    /** Session ID for revocation support */
    sessionId: string;
    /** Issued at timestamp */
    iat: number;
    /** Expiration timestamp */
    exp: number;
}

/**
 * Get the JWT secret as a Uint8Array (required by jose).
 * Throws if JWT_SECRET is not configured.
 */
function getJwtSecret(): Uint8Array {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
        throw new Error("JWT_SECRET environment variable is not set");
    }

    if (secret.length < 32) {
        throw new Error("JWT_SECRET must be at least 32 characters for HS256");
    }

    return new TextEncoder().encode(secret);
}

/**
 * Get session duration from environment (defaults to 8 hours).
 */
function getSessionDurationMs(): number {
    const hours = parseInt(process.env.SESSION_DURATION_HOURS || "8", 10);
    return hours * 60 * 60 * 1000; // Convert to milliseconds
}

/**
 * Create a signed JWT token for an authenticated user.
 * 
 * @param userId - The user's database ID (User.id)
 * @param role - The user's role (UserRole enum)
 * @param sessionId - The session ID from the Session table
 * @returns Signed JWT string
 * 
 * @example
 * const session = await createSession(user.id);
 * const token = await signToken(user.id, user.role, session.id);
 */
export async function signToken(
    userId: string,
    role: UserRole,
    sessionId: string
): Promise<string> {
    const secret = getJwtSecret();
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = Math.floor(getSessionDurationMs() / 1000);

    const token = await new SignJWT({
        role,
        sessionId,
    })
        .setProtectedHeader({ alg: "HS256" })
        .setSubject(userId)
        .setIssuedAt(now)
        .setExpirationTime(now + expiresIn)
        .setIssuer("hotelpro")
        .setAudience("hotelpro-staff")
        .sign(secret);

    return token;
}

/**
 * Verify and decode a JWT token.
 * 
 * @param token - The JWT string to verify
 * @returns The decoded payload if valid
 * @throws If the token is invalid, expired, or malformed
 * 
 * @example
 * try {
 *   const payload = await verifyToken(token);
 *   console.log(payload.sub); // userId
 *   console.log(payload.role); // UserRole
 * } catch (error) {
 *   // Token is invalid or expired
 * }
 */
export async function verifyToken(token: string): Promise<AuthTokenPayload> {
    const secret = getJwtSecret();

    const { payload } = await jwtVerify(token, secret, {
        issuer: "hotelpro",
        audience: "hotelpro-staff",
    });

    // Validate required claims exist
    if (!payload.sub || !payload.role || !payload.sessionId) {
        throw new Error("Token is missing required claims");
    }

    return payload as AuthTokenPayload;
}

/**
 * Decode a JWT token WITHOUT verification.
 * Use only for extracting claims when verification isn't needed
 * (e.g., displaying user info after token is already verified).
 * 
 * WARNING: This does NOT verify the signature. Never trust
 * unverified tokens for authorization decisions.
 * 
 * @param token - The JWT string to decode
 * @returns The decoded payload or null if malformed
 */
export function decodeTokenUnsafe(token: string): AuthTokenPayload | null {
    try {
        const parts = token.split(".");
        if (parts.length !== 3) return null;

        const payload = JSON.parse(
            Buffer.from(parts[1], "base64url").toString("utf-8")
        );

        return payload as AuthTokenPayload;
    } catch {
        return null;
    }
}
