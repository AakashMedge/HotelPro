
import { NextRequest, NextResponse } from "next/server";
import { prisma, getDb } from "@/lib/db";
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
 */
export async function GET(request: NextRequest): Promise<NextResponse<MenuResponse>> {
    try {
        // 1. Detect Tenant (Multi-Tenancy)
        const tenant = await getTenantFromRequest();
        if (!tenant) {
            return NextResponse.json({ success: false, error: "Identifying tenant failed" }, { status: 400 });
        }

        const db = prisma;

        const menuItems = await (db.menuItem as any).findMany({
            where: {
                clientId: tenant.id,
                deletedAt: null,
                isAvailable: true,
                OR: [
                    { category: { isActive: true } },
                    { categoryId: null }
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
            specialPrice: item.specialPrice ? Number(item.specialPrice) : undefined,
            isSpecialPriceActive: item.isSpecialPriceActive,
            specialPriceStart: item.specialPriceStart,
            specialPriceEnd: item.specialPriceEnd,
            isChefSpecial: item.isChefSpecial,
            isGlutenFree: item.isGlutenFree,
            isAvailable: item.isAvailable,
            isVeg: Boolean(item.isVeg),
            imageUrl: item.imageUrl,
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
