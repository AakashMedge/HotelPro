
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";

/**
 * GET /api/manager/menu
 * Get all menu items for THIS tenant only
 */
export async function GET(request: NextRequest) {
    try {
        const user = await requireRole(["MANAGER", "ADMIN"]);
        const { clientId } = user;

        console.log(`[MENU_API] Fetching for Client: ${clientId}`);

        const { searchParams } = new URL(request.url);
        const includeDeleted = searchParams.get('includeDeleted') === 'true';

        const db = prisma;

        const [items, categories, modifierGroups] = await Promise.all([
            (db.menuItem as any).findMany({
                where: {
                    clientId,
                    ...(includeDeleted ? {} : { deletedAt: null })
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
                orderBy: { name: 'asc' }
            }),
            (db.category as any).findMany({
                where: { clientId },
                orderBy: { sortOrder: 'asc' }
            }),
            (db.modifierGroup as any).findMany({
                where: { clientId },
                include: { options: true },
                orderBy: { name: 'asc' }
            })
        ]);

        return NextResponse.json({ success: true, items, categories, modifierGroups });
    } catch (error: any) {
        console.error("[MENU_GET_ERROR]", error);
        if (error?.message === "Authentication required" || error?.message?.includes("Access denied")) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }
        return NextResponse.json({
            success: false,
            error: error?.message || "Internal Server Error",
        }, { status: 500 });
    }
}

/**
 * POST /api/manager/menu - Create menu item for THIS tenant
 */
export async function POST(request: NextRequest) {
    try {
        const user = await requireRole(["MANAGER", "ADMIN"]);
        const { clientId } = user;
        const body = await request.json();

        const {
            name,
            categoryId,
            description,
            price = 0,
            isVeg = true,
            isChefSpecial = false,
            isGlutenFree = false,
            specialPrice = null,
            isSpecialPriceActive = false,
            specialPriceStart = null,
            specialPriceEnd = null,
            variants = [],
            modifierGroupIds = [],
            imageUrl = null
        } = body;

        const db = prisma;

        const newItem = await (db.menuItem as any).create({
            data: {
                clientId,
                name,
                categoryId: categoryId || null,
                description,
                price: Number(price),
                isVeg: Boolean(isVeg),
                isChefSpecial: Boolean(isChefSpecial),
                isGlutenFree: Boolean(isGlutenFree),
                specialPrice: specialPrice ? Number(specialPrice) : null,
                isSpecialPriceActive: Boolean(isSpecialPriceActive),
                specialPriceStart,
                specialPriceEnd,
                isAvailable: true,
                imageUrl: imageUrl || null,
                variants: {
                    create: Array.isArray(variants) ? variants.map((v: any) => ({
                        name: v.name,
                        price: Number(v.price)
                    })) : []
                },
                modifierGroups: {
                    create: Array.isArray(modifierGroupIds) ? modifierGroupIds.map((id: string, index: number) => ({
                        modifierGroupId: id,
                        displayOrder: index
                    })) : []
                }
            },
            include: {
                category: true,
                variants: true
            }
        });

        return NextResponse.json({ success: true, item: newItem });
    } catch (error: any) {
        console.error("[MENU_POST_ERROR]", error);
        return NextResponse.json({
            success: false,
            error: error?.message || "Failed to create item",
        }, { status: 500 });
    }
}

/**
 * PATCH /api/manager/menu - Toggle / Quick Edit (tenant-aware)
 */
export async function PATCH(request: NextRequest) {
    try {
        const user = await requireRole(["MANAGER", "ADMIN"]);
        const { clientId } = user;
        const body = await request.json();

        const {
            id,
            name,
            description,
            price,
            isVeg,
            isChefSpecial,
            isGlutenFree,
            specialPrice,
            isSpecialPriceActive,
            specialPriceStart,
            specialPriceEnd,
            isAvailable,
            categoryId,
            imageUrl,
            variants,
            modifierGroupIds,
            restore
        } = body;

        const db = prisma;

        // Verify item belongs to this tenant
        const existing = await (db.menuItem as any).findFirst({
            where: { id, clientId }
        });

        if (!existing) {
            return NextResponse.json({ success: false, error: "Item not found" }, { status: 404 });
        }

        const updated = await (db.menuItem as any).update({
            where: { id },
            data: {
                ...(restore === true && { deletedAt: null }),
                ...(name !== undefined && { name }),
                ...(description !== undefined && { description }),
                ...(price !== undefined && { price: Number(price) }),
                ...(typeof isVeg === 'boolean' && { isVeg }),
                ...(typeof isChefSpecial === 'boolean' && { isChefSpecial }),
                ...(typeof isGlutenFree === 'boolean' && { isGlutenFree }),
                ...(specialPrice !== undefined && { specialPrice: specialPrice ? Number(specialPrice) : null }),
                ...(typeof isSpecialPriceActive === 'boolean' && { isSpecialPriceActive }),
                ...(specialPriceStart !== undefined && { specialPriceStart }),
                ...(specialPriceEnd !== undefined && { specialPriceEnd }),
                ...(typeof isAvailable === 'boolean' && { isAvailable }),
                ...(categoryId !== undefined && { categoryId: categoryId || null }),
                ...(imageUrl !== undefined && { imageUrl }),
                ...(variants !== undefined && {
                    variants: {
                        deleteMany: {},
                        create: Array.isArray(variants) ? variants.map((v: any) => ({
                            name: v.name,
                            price: Number(v.price)
                        })) : []
                    }
                }),
                ...(modifierGroupIds !== undefined && {
                    modifierGroups: {
                        deleteMany: {},
                        create: Array.isArray(modifierGroupIds) ? modifierGroupIds.map((mid: string, index: number) => ({
                            modifierGroupId: mid,
                            displayOrder: index
                        })) : []
                    }
                })
            }
        });

        return NextResponse.json({ success: true, item: updated });
    } catch (error: any) {
        console.error("[MENU_PATCH_ERROR]", error);
        return NextResponse.json({
            success: false,
            error: error?.message || "Update failed",
        }, { status: 500 });
    }
}

/**
 * DELETE /api/manager/menu - Soft Delete (tenant-aware)
 */
export async function DELETE(request: NextRequest) {
    try {
        const user = await requireRole(["MANAGER", "ADMIN"]);
        const { clientId } = user;
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ success: false, error: "ID required" }, { status: 400 });

        const db = prisma;

        // Verify item belongs to this tenant
        const existing = await (db.menuItem as any).findFirst({
            where: { id, clientId }
        });

        if (!existing) {
            return NextResponse.json({ success: false, error: "Item not found" }, { status: 404 });
        }

        await (db.menuItem as any).update({
            where: { id },
            data: { deletedAt: new Date() }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ success: false, error: "Delete failed" }, { status: 500 });
    }
}
