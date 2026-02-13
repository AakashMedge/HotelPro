
import { NextRequest, NextResponse } from "next/server";
import { prisma, getDb } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

/**
 * GET /api/kitchen/inventory
 * 
 * Returns menu items with their current stock levels for the current hotel.
 */
export async function GET() {
    try {
        const tenant = await getTenantFromRequest();
        if (!tenant) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const db = getDb();

        const stockItems = await (db.menuItem as any).findMany({
            where: {
                clientId: tenant.id,
                deletedAt: null
            },
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

        const formattedItems = stockItems.map((item: any) => ({
            id: item.id,
            name: item.name,
            category: item.category?.name || 'General',
            quantity: item.inventory?.quantity || 0,
            isAvailable: item.isAvailable,
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
        const tenant = await getTenantFromRequest();
        if (!tenant) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const { menuItemId, quantity, isAvailable } = await request.json();

        const db = getDb();

        // 1. Verify ownership
        const item = await (db.menuItem as any).findFirst({
            where: { id: menuItemId, clientId: tenant.id }
        });

        if (!item) {
            return NextResponse.json({ success: false, error: "Item not found" }, { status: 404 });
        }

        // 2. If quantity is provided, update/upsert inventory
        if (quantity !== undefined) {
            await (db.inventory as any).upsert({
                where: { menuItemId },
                update: { quantity: parseInt(quantity) },
                create: { menuItemId, quantity: parseInt(quantity) }
            });
        }

        // 3. If isAvailable is provided, update menu item
        if (isAvailable !== undefined) {
            await (db.menuItem as any).update({
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
