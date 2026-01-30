/**
 * Login API Endpoint
 * POST /api/auth/login
 * 
 * Authenticates a staff member and creates a session.
 * Sets an HttpOnly cookie with the JWT token.
 * 
 * Request body:
 * {
 *   "username": "string",
 *   "password": "string"
 * }
 * 
 * Response:
 * - 200: { success: true, user: { name, role } }
 * - 400: { success: false, error: "..." } (validation)
 * - 401: { success: false, error: "..." } (auth failure)
 * - 500: { success: false, error: "..." } (server error)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword, signToken, createSession } from "@/lib/auth";

/** Session duration in seconds for cookie maxAge */
const SESSION_DURATION_SECONDS =
    parseInt(process.env.SESSION_DURATION_HOURS || "8", 10) * 60 * 60;

/**
 * Login request body schema
 */
interface LoginRequest {
    username: string;
    password: string;
}

/**
 * Login response for successful authentication
 */
interface LoginSuccessResponse {
    success: true;
    user: {
        name: string;
        role: string;
    };
}

/**
 * Login response for failed authentication
 */
interface LoginErrorResponse {
    success: false;
    error: string;
}

export async function POST(
    request: NextRequest
): Promise<NextResponse<LoginSuccessResponse | LoginErrorResponse>> {
    try {
        // 1. Parse and validate request body
        const body = await request.json().catch(() => null);

        if (!body) {
            return NextResponse.json(
                { success: false, error: "Invalid request body" },
                { status: 400 }
            );
        }

        const { username, password } = body as LoginRequest;

        if (!username || typeof username !== "string") {
            return NextResponse.json(
                { success: false, error: "Username is required" },
                { status: 400 }
            );
        }

        if (!password || typeof password !== "string") {
            return NextResponse.json(
                { success: false, error: "Password is required" },
                { status: 400 }
            );
        }

        // 2. Find user by username
        const user = await prisma.user.findUnique({
            where: { username: username.toLowerCase().trim() },
            select: {
                id: true,
                username: true,
                name: true,
                passwordHash: true,
                role: true,
                isActive: true,
            },
        });

        // 3. Check if user exists (use generic message to prevent enumeration)
        if (!user) {
            return NextResponse.json(
                { success: false, error: "Invalid credentials" },
                { status: 401 }
            );
        }

        // 4. Check if user is active
        if (!user.isActive) {
            return NextResponse.json(
                { success: false, error: "Account is deactivated" },
                { status: 401 }
            );
        }

        // 5. Verify password
        const isPasswordValid = await verifyPassword(password, user.passwordHash);

        if (!isPasswordValid) {
            return NextResponse.json(
                { success: false, error: "Invalid credentials" },
                { status: 401 }
            );
        }

        // 6. Create session in database
        const session = await createSession(user.id);

        // 7. Sign JWT token
        const token = await signToken(user.id, user.role, session.id);

        // 8. Build response with user info
        const response = NextResponse.json<LoginSuccessResponse>(
            {
                success: true,
                user: {
                    name: user.name,
                    role: user.role,
                },
            },
            { status: 200 }
        );

        // 9. Set HttpOnly cookie
        response.cookies.set("auth-token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: SESSION_DURATION_SECONDS,
        });

        return response;

    } catch (error) {
        console.error("Login error:", error);

        return NextResponse.json(
            { success: false, error: "An unexpected error occurred" },
            { status: 500 }
        );
    }
}
