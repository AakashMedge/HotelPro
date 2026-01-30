/**
 * Logout API Endpoint
 * POST /api/auth/logout
 * 
 * Ends a user's session by deleting it from the database
 * and clearing the auth cookie.
 * 
 * Request: No body required, reads JWT from cookie
 * 
 * Response:
 * - 200: { success: true }
 * - 401: { success: false, error: "..." } (no valid token)
 * - 500: { success: false, error: "..." } (server error)
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyToken, deleteSession } from "@/lib/auth";

/**
 * Logout response types
 */
interface LogoutSuccessResponse {
    success: true;
}

interface LogoutErrorResponse {
    success: false;
    error: string;
}

export async function POST(
    request: NextRequest
): Promise<NextResponse<LogoutSuccessResponse | LogoutErrorResponse>> {
    try {
        // 1. Get token from cookie
        const token = request.cookies.get("auth-token")?.value;

        if (!token) {
            // No token = already logged out, still clear cookie and succeed
            const response = NextResponse.json<LogoutSuccessResponse>(
                { success: true },
                { status: 200 }
            );

            response.cookies.set("auth-token", "", {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                path: "/",
                maxAge: 0, // Expire immediately
            });

            return response;
        }

        // 2. Verify token and extract session ID
        let sessionId: string | undefined;

        try {
            const payload = await verifyToken(token);
            sessionId = payload.sessionId;
        } catch {
            // Token is invalid/expired, but we still want to clear the cookie
            // This is not an error for logout - we're achieving the goal
        }

        // 3. Delete session from database (if we have a valid session ID)
        if (sessionId) {
            await deleteSession(sessionId);
        }

        // 4. Build response
        const response = NextResponse.json<LogoutSuccessResponse>(
            { success: true },
            { status: 200 }
        );

        // 5. Clear the auth cookie
        response.cookies.set("auth-token", "", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 0, // Expire immediately
        });

        return response;

    } catch (error) {
        console.error("Logout error:", error);

        // Even on error, try to clear the cookie
        const response = NextResponse.json<LogoutErrorResponse>(
            { success: false, error: "An unexpected error occurred" },
            { status: 500 }
        );

        response.cookies.set("auth-token", "", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 0,
        });

        return response;
    }
}
