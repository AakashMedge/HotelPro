
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";

/**
 * Categories API - Tenant-Aware
 */
export async function GET(request: NextRequest) {
    try {
        const user = await requireRole(["MANAGER", "ADMIN"]);
        const clientId = user.clientId;

        const categories = await prisma.category.findMany({
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
            stack: error?.stack
        }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = await requireRole(["MANAGER", "ADMIN"]);
        const clientId = user.clientId;
        const { name } = await request.json();

        const category = await prisma.category.create({
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
        const clientId = user.clientId;
        const { id, isActive, name } = await request.json();

        // Verify category belongs to this tenant
        const existing = await prisma.category.findFirst({
            where: { id, clientId }
        });

        if (!existing) {
            return NextResponse.json({ success: false, error: "Category not found" }, { status: 404 });
        }

        const category = await prisma.category.update({
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

