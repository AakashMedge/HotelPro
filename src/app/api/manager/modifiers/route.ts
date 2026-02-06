
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";

/**
 * GET /api/manager/modifiers
 * Fetch all modifier groups for THIS tenant
 */
export async function GET(request: NextRequest) {
    try {
        const user = await requireRole(["MANAGER", "ADMIN"]);
        const clientId = user.clientId;

        const groups = await prisma.modifierGroup.findMany({
            where: { clientId },
            include: { options: true },
            orderBy: { name: 'asc' }
        });
        return NextResponse.json({ success: true, groups });
    } catch (error) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
}

/**
 * POST /api/manager/modifiers
 * Create new modifier group for THIS tenant
 */
export async function POST(request: NextRequest) {
    try {
        const user = await requireRole(["MANAGER", "ADMIN"]);
        const clientId = user.clientId;
        const { name, minSelection, maxSelection, options } = await request.json();

        const group = await prisma.modifierGroup.create({
            data: {
                clientId, // Tenant isolation
                name,
                minSelection: Number(minSelection),
                maxSelection: maxSelection ? Number(maxSelection) : null,
                options: {
                    create: options.map((opt: any) => ({
                        name: opt.name,
                        price: Number(opt.price)
                    }))
                }
            },
            include: { options: true }
        });

        return NextResponse.json({ success: true, group });
    } catch (error) {
        return NextResponse.json({ success: false, error: "Failed to create modifier group" }, { status: 500 });
    }
}

/**
 * DELETE /api/manager/modifiers
 * Delete a modifier group (tenant-aware)
 */
export async function DELETE(request: NextRequest) {
    try {
        const user = await requireRole(["MANAGER", "ADMIN"]);
        const clientId = user.clientId;
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ success: false, error: "ID required" }, { status: 400 });

        // Verify modifier group belongs to this tenant
        const existing = await prisma.modifierGroup.findFirst({
            where: { id, clientId }
        });

        if (!existing) {
            return NextResponse.json({ success: false, error: "Modifier group not found" }, { status: 404 });
        }

        await prisma.modifierGroup.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ success: false, error: "Failed to delete" }, { status: 500 });
    }
}

