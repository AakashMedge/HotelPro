/**
 * Authentication Utilities
 * 
 * Central export point for all authentication-related utilities.
 * 
 * Usage:
 * import { hashPassword, signToken, createSession } from "@/lib/auth";
 */

// Password utilities
export { hashPassword, verifyPassword } from "./password";

// JWT utilities
export { signToken, verifyToken, decodeTokenUnsafe } from "./jwt";
export type { AuthTokenPayload } from "./jwt";

// Session service
export {
    createSession,
    validateSession,
    deleteSession,
    deleteAllUserSessions,
    cleanupExpiredSessions,
    getUserActiveSessions,
    extendSession,
} from "./session";

// Server-side utilities (for Server Components and API routes)
export { getCurrentUser, requireAuth, requireRole } from "./server";
export type { CurrentUser } from "./server";
