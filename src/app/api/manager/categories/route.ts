
import { NextRequest, NextResponse } from "next/server";
import { prisma, getDb } from "@/lib/db";
import { requireRole } from "@/lib/auth";

/**
 * Categories API - Tenant-Aware
 */
export async function GET(request: NextRequest) {
    try {
        const user = await requireRole(["MANAGER", "ADMIN"]);
        const { clientId } = user;

        const db = prisma;

        const categories = await (db.category as any).findMany({
            where: { clientId },
            orderBy: { sortOrder: 'asc' }
        });

        return NextResponse.json({ success: true, categories });
    } catch (error: any) {
        console.error("[CATEGORIES_GET_ERROR]", error);
        if (error?.message === "Authentication required" || error?.message?.includes("Access denied")) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }
        return NextResponse.json({
            success: false,
            error: error?.message || "Internal Server Error",
        }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = await requireRole(["MANAGER", "ADMIN"]);
        const { clientId } = user;
        const { name } = await request.json();

        const db = prisma;

        const category = await (db.category as any).create({
            data: { clientId, name, isActive: true }
        });

        return NextResponse.json({ success: true, category });
    } catch (error) {
        return NextResponse.json({ success: false, error: "Failed to create category" }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const user = await requireRole(["MANAGER", "ADMIN"]);
        const { clientId } = user;
        const { id, isActive, name } = await request.json();

        const db = prisma;

        // Verify category belongs to this tenant
        const existing = await (db.category as any).findFirst({
            where: { id, clientId }
        });

        if (!existing) {
            return NextResponse.json({ success: false, error: "Category not found" }, { status: 404 });
        }

        const category = await (db.category as any).update({
            where: { id },
            data: {
                ...(isActive !== undefined && { isActive }),
                ...(name !== undefined && { name })
            }
        });

        return NextResponse.json({ success: true, category });
    } catch (error) {
        return NextResponse.json({ success: false, error: "Failed to update category" }, { status: 500 });
    }
}

