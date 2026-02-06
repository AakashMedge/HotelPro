
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
        const clientId = user.clientId;

        const { searchParams } = new URL(request.url);
        const includeDeleted = searchParams.get('includeDeleted') === 'true';

        const [items, categories, modifierGroups] = await Promise.all([
            prisma.menuItem.findMany({
                where: {
                    clientId, // Tenant isolation
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
            prisma.category.findMany({
                where: { clientId }, // Tenant isolation
                orderBy: { sortOrder: 'asc' }
            }),
            prisma.modifierGroup.findMany({
                where: { clientId }, // Tenant isolation
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
            stack: error?.stack
        }, { status: 500 });
    }
}

/**
 * POST /api/manager/menu - Create menu item for THIS tenant
 */
export async function POST(request: NextRequest) {
    try {
        const user = await requireRole(["MANAGER", "ADMIN"]);
        const clientId = user.clientId;
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

        const newItem = await prisma.menuItem.create({
            data: {
                client: { connect: { id: clientId } }, // Use relation instead of scalar to allow 'category' connect
                name,
                category: categoryId ? { connect: { id: categoryId } } : undefined,
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
            stack: error?.stack
        }, { status: 500 });
    }
}

/**
 * PATCH /api/manager/menu - Toggle / Quick Edit (tenant-aware)
 */
export async function PATCH(request: NextRequest) {
    try {
        const user = await requireRole(["MANAGER", "ADMIN"]);
        const clientId = user.clientId;
        const body = await request.json();
        console.log("[MENU_PATCH_PAYLOAD]", JSON.stringify(body, null, 2));

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

        // Verify item belongs to this tenant
        const existing = await prisma.menuItem.findFirst({
            where: { id, clientId }
        });

        if (!existing) {
            return NextResponse.json({ success: false, error: "Item not found" }, { status: 404 });
        }

        const updated = await prisma.menuItem.update({
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
                ...(categoryId !== undefined && {
                    category: categoryId ? { connect: { id: categoryId } } : { disconnect: true }
                }),
                ...(imageUrl !== undefined && { imageUrl }),

                // For simplicity in this demo, Re-create variants and modifier links
                // A production app might diff/patch these specifically
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
            } as any
        });

        return NextResponse.json({ success: true, item: updated });
    } catch (error: any) {
        console.error("[MENU_PATCH_ERROR]", error);
        return NextResponse.json({
            success: false,
            error: error?.message || "Update failed",
            stack: error?.stack
        }, { status: 500 });
    }
}

/**
 * DELETE /api/manager/menu - Soft Delete (tenant-aware)
 */
export async function DELETE(request: NextRequest) {
    try {
        const user = await requireRole(["MANAGER", "ADMIN"]);
        const clientId = user.clientId;
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ success: false, error: "ID required" }, { status: 400 });

        // Verify item belongs to this tenant
        const existing = await prisma.menuItem.findFirst({
            where: { id, clientId }
        });

        if (!existing) {
            return NextResponse.json({ success: false, error: "Item not found" }, { status: 404 });
        }

        await prisma.menuItem.update({
            where: { id },
            data: { deletedAt: new Date() }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ success: false, error: "Delete failed" }, { status: 500 });
    }
}

