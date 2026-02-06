import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/kitchen/inventory
 * 
 * Returns all menu items with their current stock levels.
 */
export async function GET() {
    try {
        const stockItems = await prisma.menuItem.findMany({
            where: { deletedAt: null },
            include: {
                inventory: true,
                category: true
            },
            orderBy: {
                category: {
                    name: 'asc'
                }
            }
        });

        const formattedItems = stockItems.map(item => ({
            id: item.id,
            name: item.name,
            category: item.category?.name || 'General',
            quantity: item.inventory?.quantity || 0,
            isAvailable: item.isAvailable, // Added availability status
            unit: 'pcs',
            threshold: 10,
            lastUpdated: item.inventory ? getTimeAgo(item.inventory.updatedAt) : 'Never'
        }));

        return NextResponse.json({
            success: true,
            items: formattedItems
        });
    } catch (error) {
        console.error("[INVENTORY API] Error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch inventory" },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/kitchen/inventory
 * Update stock levels or availability (86-ing).
 */
export async function PATCH(request: NextRequest) {
    try {
        const { menuItemId, quantity, isAvailable } = await request.json();

        // If quantity is provided, update/upsert inventory
        if (quantity !== undefined) {
            await prisma.inventory.upsert({
                where: { menuItemId },
                update: { quantity: parseInt(quantity) },
                create: { menuItemId, quantity: parseInt(quantity) }
            });
        }

        // If isAvailable is provided, update menu item
        if (isAvailable !== undefined) {
            await prisma.menuItem.update({
                where: { id: menuItemId },
                data: { isAvailable }
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[INVENTORY_UPDATE] Error:", error);
        return NextResponse.json({ success: false, error: "Failed to update stock" }, { status: 500 });
    }
}

function getTimeAgo(date: Date) {
    const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    if (mins < 1) return 'now';
    if (mins >= 60) return `${Math.floor(mins / 60)}h ago`;
    return `${mins}m ago`;
}
