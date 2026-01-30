/**
 * Menu API
 * 
 * GET /api/menu - Get all available menu items
 * 
 * This is a public endpoint (no auth required) for customers
 * to browse the menu via QR scan.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

interface MenuItemResponse {
    id: string;
    name: string;
    category: string;
    description?: string;
    price: number;
    isAvailable: boolean;
}

interface MenuResponse {
    success: boolean;
    items?: MenuItemResponse[];
    error?: string;
}

/**
 * GET /api/menu
 * 
 * Returns all available menu items.
 * Customers use this to view the menu before ordering.
 */
export async function GET(): Promise<NextResponse<MenuResponse>> {
    try {
        const menuItems = await prisma.menuItem.findMany({
            where: {
                deletedAt: null,
                isAvailable: true,
            },
            select: {
                id: true,
                name: true,
                category: true,
                description: true,
                price: true,
                isAvailable: true,
            },
            orderBy: {
                name: "asc",
            },
        });

        // Convert Decimal to number for JSON serialization
        const items: MenuItemResponse[] = menuItems.map((item) => ({
            id: item.id,
            name: item.name,
            category: item.category,
            description: item.description || undefined,
            price: Number(item.price),
            isAvailable: item.isAvailable,
        }));

        return NextResponse.json({
            success: true,
            items,
        });
    } catch (error) {
        console.error("[MENU API] Error fetching menu:", error);

        return NextResponse.json(
            { success: false, error: "Failed to fetch menu" },
            { status: 500 }
        );
    }
}
