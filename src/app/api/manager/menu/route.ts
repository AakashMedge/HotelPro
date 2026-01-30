
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";

/**
 * GET /api/manager/menu
 * List ALL menu items (including unavailable/86'd)
 */
export async function GET(request: NextRequest) {
    try {
        await requireRole(["MANAGER", "ADMIN"]);

        const items = await prisma.menuItem.findMany({
            where: { deletedAt: null },
            orderBy: { category: 'asc' }
        });

        return NextResponse.json({ success: true, items });
    } catch (error) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
}

/**
 * POST /api/manager/menu
 * Create new menu item
 */
export async function POST(request: NextRequest) {
    try {
        await requireRole(["MANAGER", "ADMIN"]);
        const body = await request.json();
        const { name, category, description, price } = body;

        const newItem = await prisma.menuItem.create({
            data: {
                name,
                category,
                description,
                price: Number(price),
                isAvailable: true
            }
        });

        return NextResponse.json({ success: true, item: newItem });
    } catch (error) {
        return NextResponse.json({ success: false, error: "Failed to create item" }, { status: 500 });
    }
}

/**
 * PATCH /api/manager/menu
 * Quick Update (e.g. Availability toggle)
 */
export async function PATCH(request: NextRequest) {
    try {
        await requireRole(["MANAGER", "ADMIN"]);
        const body = await request.json();
        const { id, isAvailable, price } = body;

        const updateData: any = {};
        if (typeof isAvailable === 'boolean') updateData.isAvailable = isAvailable;
        if (price) updateData.price = Number(price);

        const updated = await prisma.menuItem.update({
            where: { id },
            data: updateData
        });

        return NextResponse.json({ success: true, item: updated });
    } catch (error) {
        return NextResponse.json({ success: false, error: "Failed to update item" }, { status: 500 });
    }
}
