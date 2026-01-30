/**
 * Tables API
 * 
 * GET /api/tables - Get all tables with their status
 * GET /api/tables/[tableCode] - Get a specific table by code
 * 
 * Public endpoint for QR-based ordering.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

interface TableResponse {
    id: string;
    tableCode: string;
    capacity: number;
    status: string;
}

interface TablesListResponse {
    success: boolean;
    tables?: TableResponse[];
    error?: string;
}

/**
 * GET /api/tables
 * 
 * Get all tables with their current status.
 */
export async function GET(
    request: NextRequest
): Promise<NextResponse<TablesListResponse>> {
    try {
        // Optional: filter by tableCode query param
        const { searchParams } = new URL(request.url);
        const tableCode = searchParams.get("code");

        const where = tableCode
            ? { tableCode }
            : {};

        const tables = await prisma.table.findMany({
            where,
            orderBy: {
                tableCode: "asc",
            },
        });

        // Map and ensure capacity exists (fallback for sync issues)
        const formattedTables = tables.map(t => ({
            id: t.id,
            tableCode: t.tableCode,
            capacity: (t as any).capacity ?? 4,
            status: t.status,
        }));

        return NextResponse.json({
            success: true,
            tables: formattedTables,
        });
    } catch (error) {
        console.error("[TABLES API] Error fetching tables:", error);

        return NextResponse.json(
            { success: false, error: "Failed to fetch tables" },
            { status: 500 }
        );
    }
}
