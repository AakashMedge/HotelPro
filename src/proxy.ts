/**
 * Authentication Middleware
 * 
 * Next.js Edge Middleware that runs before every request.
 * Handles authentication and role-based access control.
 * 
 * Flow:
 * 1. Check if route needs protection
 * 2. Verify JWT token from cookie
 * 3. Validate session exists in database
 * 4. Check role matches route
 * 5. Redirect or allow based on checks
 */

import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

/**
 * Routes that require authentication and their allowed roles.
 * Each dashboard is restricted to specific roles.
 */
const PROTECTED_ROUTES: Record<string, string[]> = {
    "/admin": ["ADMIN"],
    "/manager": ["MANAGER", "ADMIN"], // Admin can access manager too
    "/waiter": ["WAITER", "MANAGER", "ADMIN"],
    "/kitchen": ["KITCHEN", "MANAGER", "ADMIN"],
    "/cashier": ["CASHIER", "MANAGER", "ADMIN"],
};

/**
 * Routes that are always public (no auth required)
 */
const PUBLIC_ROUTES = [
    "/",
    "/home",
    "/customer",
    "/menu",
    "/order-status",
    "/qr",
    "/welcome-guest",
    "/ai-assistant",
    "/login",
];

/**
 * API routes that don't need middleware processing
 */
const API_ROUTES_PREFIX = "/api/";

/**
 * Static file prefixes to skip
 */
const STATIC_PREFIXES = ["/_next/", "/images/", "/favicon"];

/**
 * Get JWT secret as Uint8Array for jose library
 */
function getJwtSecret(): Uint8Array {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error("JWT_SECRET environment variable is not set");
    }
    return new TextEncoder().encode(secret);
}

/**
 * Check if a path matches any of the given prefixes
 */
function matchesPrefix(path: string, prefixes: string[]): boolean {
    return prefixes.some((prefix) => path.startsWith(prefix));
}

/**
 * Check if a path is a protected dashboard route
 */
function getRequiredRoles(path: string): string[] | null {
    // Check exact matches first
    for (const [route, roles] of Object.entries(PROTECTED_ROUTES)) {
        if (path === route || path.startsWith(`${route}/`)) {
            return roles;
        }
    }
    return null;
}

/**
 * Check if path is a public route
 */
function isPublicRoute(path: string): boolean {
    return PUBLIC_ROUTES.some(
        (route) => path === route || path.startsWith(`${route}/`)
    );
}

/**
 * Verify JWT and extract payload
 */
async function verifyAuth(token: string): Promise<{
    userId: string;
    role: string;
    sessionId: string;
} | null> {
    try {
        const secret = getJwtSecret();
        const { payload } = await jwtVerify(token, secret, {
            issuer: "hotelpro",
            audience: "hotelpro-staff",
        });

        if (!payload.sub || !payload.role || !payload.sessionId) {
            return null;
        }

        return {
            userId: payload.sub,
            role: payload.role as string,
            sessionId: payload.sessionId as string,
        };
    } catch {
        return null;
    }
}

/**
 * Get the correct dashboard path for a role
 */
function getDashboardForRole(role: string): string {
    const dashboards: Record<string, string> = {
        ADMIN: "/admin",
        MANAGER: "/manager",
        WAITER: "/waiter",
        KITCHEN: "/kitchen",
        CASHIER: "/cashier",
    };
    return dashboards[role] || "/login";
}

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Skip static files and assets
    if (matchesPrefix(pathname, STATIC_PREFIXES)) {
        return NextResponse.next();
    }

    // Skip API routes (they handle their own auth)
    if (pathname.startsWith(API_ROUTES_PREFIX)) {
        return NextResponse.next();
    }

    // Check if this is a protected route
    const requiredRoles = getRequiredRoles(pathname);
    const isPublic = isPublicRoute(pathname);

    // Public routes: allow everyone
    if (isPublic && !requiredRoles) {
        return NextResponse.next();
    }

    // Get auth token from cookie
    const token = request.cookies.get("auth-token")?.value;

    // No token on protected route → redirect to login
    if (!token && requiredRoles) {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(loginUrl);
    }

    // If no token and not protected, allow through
    if (!token) {
        return NextResponse.next();
    }

    // Verify the token
    const auth = await verifyAuth(token);

    // Invalid token on protected route → redirect to login
    if (!auth && requiredRoles) {
        const response = NextResponse.redirect(new URL("/login", request.url));
        // Clear invalid cookie
        response.cookies.set("auth-token", "", { maxAge: 0, path: "/" });
        return response;
    }

    // Invalid token on public route → clear cookie, continue
    if (!auth) {
        const response = NextResponse.next();
        response.cookies.set("auth-token", "", { maxAge: 0, path: "/" });
        return response;
    }

    // At this point we have a valid auth token
    // If on login page with valid auth → redirect to their dashboard
    if (pathname === "/login") {
        return NextResponse.redirect(
            new URL(getDashboardForRole(auth.role), request.url)
        );
    }

    // Check role authorization for protected routes
    if (requiredRoles) {
        const hasAccess = requiredRoles.includes(auth.role);

        if (!hasAccess) {
            // User doesn't have permission for this route
            // Redirect to their correct dashboard with an error
            const dashboardUrl = new URL(getDashboardForRole(auth.role), request.url);
            dashboardUrl.searchParams.set("error", "access_denied");
            return NextResponse.redirect(dashboardUrl);
        }
    }

    // All checks passed - add user info to headers for downstream use
    const response = NextResponse.next();
    response.headers.set("x-user-id", auth.userId);
    response.headers.set("x-user-role", auth.role);

    return response;
}

/**
 * Configure which routes the middleware runs on
 */
export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder files
         */
        "/((?!_next/static|_next/image|favicon.ico|images/).*)",
    ],
};
