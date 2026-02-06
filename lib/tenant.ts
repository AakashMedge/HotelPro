import { prisma } from "@/lib/db";
import { headers, cookies } from "next/headers";

/**
 * Tenant Utilities for Multi-Tenancy
 * 
 * Handles client detection from hostname and subdomain.
 */

export interface TenantConfig {
    id: string;
    name: string;
    slug: string;
    plan: string;
}

/**
 * Detect the current tenant (clientId) from the request headers.
 * Looks at host to determine subdomain.
 */
export async function getTenantFromRequest(): Promise<TenantConfig | null> {
    const headerList = await headers();
    const host = headerList.get("host") || "";

    // 0. Check for X-Tenant-Slug header (set by our Proxy Middleware)
    const tenantSlug = headerList.get("x-tenant-slug");
    if (tenantSlug) {
        const clientByHeader = await prisma.client.findUnique({
            where: { slug: tenantSlug },
            select: { id: true, name: true, slug: true, plan: true }
        });
        if (clientByHeader) return clientByHeader;
    }

    // 0b. Cookie-based override for localhost/demo purposes
    const cookieStore = await cookies();
    const cookieToken = cookieStore.get("hp-tenant")?.value;
    if (cookieToken) {
        const clientByCookie = await prisma.client.findUnique({
            where: { slug: cookieToken },
            select: { id: true, name: true, slug: true, plan: true }
        });
        if (clientByCookie) return clientByCookie;
    }

    // 1. Fallback: Subdomain detection (e.g., taj.hotelpro.com)
    const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || "localhost:3000";

    if (host.endsWith(baseDomain) && host !== baseDomain) {
        const slug = host.replace(`.${baseDomain}`, "");
        if (slug && slug !== 'www') {
            const clientBySlug = await prisma.client.findUnique({
                where: { slug: slug },
                select: { id: true, name: true, slug: true, plan: true }
            });
            return clientBySlug;
        }
    }

    return null;
}

/**
 * Validate that the current user belongs to the current tenant.
 * Security boundary for multi-tenancy.
 */
export function validateTenantAccess(userClientId: string, currentClientId: string): boolean {
    return userClientId === currentClientId;
}
