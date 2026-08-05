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

import { ALL_AUTH_COOKIES } from "@/lib/auth/server";

export async function POST(
    request: NextRequest
): Promise<NextResponse<LogoutSuccessResponse | LogoutErrorResponse>> {
    try {
        // 1. Get token from any role cookie
        let token: string | undefined;
        for (const cookieName of ALL_AUTH_COOKIES) {
            const val = request.cookies.get(cookieName)?.value;
            if (val) {
                token = val;
                break;
            }
        }

        if (!token) {
            // No token = already logged out, still clear all cookies and succeed
            const response = NextResponse.json<LogoutSuccessResponse>(
                { success: true },
                { status: 200 }
            );

            for (const cookieName of ALL_AUTH_COOKIES) {
                response.cookies.set(cookieName, "", {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === "production",
                    sameSite: "lax",
                    path: "/",
                    maxAge: 0,
                });
            }

            return response;
        }

        // 2. Verify token and extract session ID
        let sessionId: string | undefined;

        try {
            const payload = await verifyToken(token);
            sessionId = payload.sessionId;
        } catch {
            // Token is invalid/expired, but we still want to clear the cookies
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

        // 5. Clear all auth cookies
        for (const cookieName of ALL_AUTH_COOKIES) {
            response.cookies.set(cookieName, "", {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                path: "/",
                maxAge: 0,
            });
        }

        return response;

    } catch (error) {
        console.error("Logout error:", error);

        // Even on error, try to clear all cookies
        const response = NextResponse.json<LogoutErrorResponse>(
            { success: false, error: "An unexpected error occurred" },
            { status: 500 }
        );

        for (const cookieName of ALL_AUTH_COOKIES) {
            response.cookies.set(cookieName, "", {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                path: "/",
                maxAge: 0,
            });
        }

        return response;
    }
}
