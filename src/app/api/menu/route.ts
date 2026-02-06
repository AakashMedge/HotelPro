/**
 * Menu API
 * 
 * GET /api/menu - Get all available menu items
 * 
 * This is a public endpoint (no auth required) for customers
 * to browse the menu via QR scan.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

// Updated Interface to include new fields
interface MenuItemResponse {
    id: string;
    name: string;
    category: string;
    description?: string;
    price: number;
    isAvailable: boolean;
    isVeg: boolean;
    imageUrl?: string | null;
    variants: any[];
    modifierGroups: any[];
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
 * NOW UPDATED: Respects Manager's "Active Collection" Toggles.
 */
export async function GET(request: NextRequest): Promise<NextResponse<MenuResponse>> {
    try {
        // 1. Detect Tenant (Multi-Tenancy)
        const tenant = await getTenantFromRequest();
        if (!tenant) {
            return NextResponse.json({ success: false, error: "Identifying tenant failed" }, { status: 400 });
        }

        const menuItems = await prisma.menuItem.findMany({
            where: {
                clientId: tenant.id,
                deletedAt: null,
                isAvailable: true,
                // Feature: Only show items from Active Categories (Time-based menu)
                OR: [
                    { category: { isActive: true } },
                    { categoryId: null } // Show uncategorized items (fallback)
                ]
            },
            include: {
                category: true,
                variants: true,
                modifierGroups: {
                    include: {
                        modifierGroup: {
                            include: { options: true }
                        }
                    },
                    orderBy: { displayOrder: 'asc' }
                }
            },
            orderBy: {
                name: "asc",
            },
        });

        // Convert Decimal to number for JSON serialization
        // Map relational Category Name to string for frontend compatibility
        const items: MenuItemResponse[] = menuItems.map((item: any) => ({
            id: item.id,
            name: item.name,
            category: item.category?.name || "General",
            description: item.description || undefined,
            price: Number(item.price),
            // New fields
            specialPrice: item.specialPrice ? Number(item.specialPrice) : undefined,
            isSpecialPriceActive: item.isSpecialPriceActive,
            specialPriceStart: item.specialPriceStart,
            specialPriceEnd: item.specialPriceEnd,
            isChefSpecial: item.isChefSpecial,
            isGlutenFree: item.isGlutenFree,

            isAvailable: item.isAvailable,
            isVeg: Boolean(item.isVeg),
            imageUrl: item.imageUrl,
            // Pass through the new complex data
            variants: item.variants.map((v: any) => ({
                id: v.id,
                name: v.name,
                price: Number(v.price)
            })),
            modifierGroups: item.modifierGroups.map((mg: any) => ({
                modifierGroup: {
                    id: mg.modifierGroup.id,
                    name: mg.modifierGroup.name,
                    minSelection: mg.modifierGroup.minSelection,
                    maxSelection: mg.modifierGroup.maxSelection,
                    options: mg.modifierGroup.options.map((opt: any) => ({
                        id: opt.id,
                        name: opt.name,
                        price: Number(opt.price)
                    }))
                }
            }))
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
