/**
 * Table Lookup API
 * POST /api/auth/table-lookup
 * 
 * Resolves a global Table Code or QR ShortCode to a specific Hotel and Table.
 * Sets the tenant cookie for the resolved hotel.
 * 
 * This allows guests to "Walk In" and identify their table without an access code.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { signTenantToken, getTenantCookieConfig } from "@/lib/tenant";

export async function POST(request: NextRequest) {
    try {
        const { code } = await request.json();

        if (!code || typeof code !== "string") {
            return NextResponse.json({ success: false, error: "Please enter a valid table code." }, { status: 400 });
        }

        const normalizedCode = code.trim().toUpperCase();

        // 1. Try to find by QR ShortCode (Global Unique ID)
        let qrCode = await (prisma as any).qRCode.findFirst({
            where: { shortCode: normalizedCode, isActive: true },
            include: {
                client: true,
                table: true
            }
        });

        // 2. If not found, try to find by Table Code (less unique, but searchable)
        // Note: In a true global system, Table Codes like "T-01" would collide.
        // However, we can look for the most active or unique match, 
        // or require the "ShortCode" (which includes the prefix like MH-T01).
        if (!qrCode) {
            // Check if it's a Table Code. We'll search for active tables 
            // where tableCode matches exactly.
            const tables = await (prisma as any).table.findMany({
                where: {
                    tableCode: { equals: normalizedCode, mode: 'insensitive' },
                    deletedAt: null
                },
                include: { client: true, qrCodes: { where: { isActive: true }, take: 1 } }
            });

            if (tables.length === 1) {
                // If only one hotel has this table code globally, we can resolve it
                const table = tables[0];
                const client = table.client;
                qrCode = { table, client, shortCode: table.qrCodes[0]?.shortCode || null };
            } else if (tables.length > 1) {
                // Collision! We need more info or the ShortCode.
                return NextResponse.json({
                    success: false,
                    error: "Table code is ambiguous. Please enter the full code (e.g. MH-T01) or scan the QR."
                }, { status: 409 });
            }
        }

        if (!qrCode || !qrCode.client || !qrCode.table) {
            return NextResponse.json({ success: false, error: "Table identity not found. Please scan the QR or ask staff." }, { status: 404 });
        }

        const client = qrCode.client;
        const table = qrCode.table;

        // 3. Check hotel status
        if (client.status === "SUSPENDED") {
            return NextResponse.json({ success: false, error: "This hotel is currently unavailable." }, { status: 403 });
        }

        // 4. Sign tenant cookie
        const tenantToken = await signTenantToken(client.id);
        const cookieConfig = getTenantCookieConfig();

        // 5. Build response
        const response = NextResponse.json({
            success: true,
            hotel: {
                id: client.id,
                name: client.name,
                slug: client.slug,
                plan: client.plan,
            },
            table: {
                id: table.id,
                tableCode: table.tableCode,
            }
        });

        // 6. Set signed tenant cookie
        response.cookies.set(cookieConfig.name, tenantToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: cookieConfig.maxAge,
        });

        return response;

    } catch (error) {
        console.error("[TABLE-LOOKUP] Error:", error);
        return NextResponse.json({ success: false, error: "Something went wrong." }, { status: 500 });
    }
}
