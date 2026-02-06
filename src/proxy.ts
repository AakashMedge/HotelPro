import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Global Multi-Tenant & Routing Middleware
 */

const STATIC_PREFIXES = ["/_next/", "/images/", "/favicon", "/fonts/"];

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const host = request.headers.get("host") || "";

    // 1. Skip static assets
    if (STATIC_PREFIXES.some(p => pathname.startsWith(p))) {
        return NextResponse.next();
    }

    // 2. DETECT TENANT
    const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || "localhost:3000";
    let tenantSlug = "";
    let isSuperAdmin = false;

    // A. Super Admin detection: hq subdomain OR /hq path on main domain
    if (host === `hq.${baseDomain}` || (host === baseDomain && (pathname === "/hq" || pathname.startsWith("/hq/")))) {
        isSuperAdmin = true;
    } else if (host.endsWith(baseDomain) && host !== baseDomain) {
        // B. Subdomain detection (e.g., taj.hotelpro.com)
        tenantSlug = host.replace(`.${baseDomain}`, "");
    }

    // 3. ROUTE THE REQUEST
    if (isSuperAdmin) {
        if (pathname === "/hq") {
            return NextResponse.redirect(new URL("/hq/dashboard", request.url));
        }
        return NextResponse.next();
    }

    // 4. Client / Hotel Rewriting
    if (tenantSlug && tenantSlug !== 'www') {
        // Rewrite the request to the internal group: /(public)/path or /(dashboard)/path
        // Next.js will handle the grouping automatically if we just leave the path as is
        // but we can set headers for the app to know which tenant we are.
        const response = NextResponse.next();
        response.headers.set("x-tenant-slug", tenantSlug);
        return response;
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/((?!api/|static/|_next/static|_next/image|favicon.ico|images/).*)",
        "/hq/:path*",
    ],
};
