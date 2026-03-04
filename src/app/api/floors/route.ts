/**
 * Floors API — Zone Management
 * GET    /api/floors   → List all floors/zones for tenant
 * POST   /api/floors   → Create a new floor/zone (Admin/Manager)
 * PATCH  /api/floors   → Update a floor/zone (Admin/Manager)
 * DELETE /api/floors   → Soft-deactivate a floor (Admin only)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";

// ============================================
// GET /api/floors — List Zones
// ============================================
export async function GET() {
    try {
        const user = await requireRole(["ADMIN", "MANAGER"]);
        const db = prisma;

        const floors = await db.floor.findMany({
            where: { clientId: user.clientId },
            include: {
                tables: {
                    where: { deletedAt: null },
                    select: {
                        id: true,
                        tableCode: true,
                        status: true,
                        capacity: true,
                        floorId: true,
                        qrCodes: {
                            where: { isActive: true },
                            select: {
                                id: true,
                                shortCode: true,
                                version: true,
                                scanCount: true,
                                lastScannedAt: true,
                                createdAt: true,
                            },
                            take: 1,
                            orderBy: { createdAt: 'desc' as const },
                        },
                    },
                    orderBy: { tableCode: 'asc' as const },
                },
                _count: {
                    select: { tables: true },
                },
            },
            orderBy: { sortOrder: 'asc' as const },
        });

        // Also get unassigned tables (tables without a floor)
        const unassignedTables = await db.table.findMany({
            where: {
                clientId: user.clientId,
                deletedAt: null,
                floorId: null,
            },
            select: {
                id: true,
                tableCode: true,
                status: true,
                capacity: true,
                floorId: true,
                qrCodes: {
                    where: { isActive: true },
                    select: {
                        id: true,
                        shortCode: true,
                        version: true,
                        scanCount: true,
                        lastScannedAt: true,
                        createdAt: true,
                    },
                    take: 1,
                    orderBy: { createdAt: 'desc' as const },
                },
            },
            orderBy: { tableCode: 'asc' as const },
        });

        return NextResponse.json({
            success: true,
            floors,
            unassignedTables,
        });
    } catch (error: any) {
        console.error("[FLOORS_GET]", error.message);
        if (error?.message?.includes("Authentication") || error?.message?.includes("Access denied")) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }
        return NextResponse.json({ success: false, error: "Failed to fetch floors" }, { status: 500 });
    }
}

// ============================================
// POST /api/floors — Create Zone
// ============================================
export async function POST(request: NextRequest) {
    try {
        const user = await requireRole(["ADMIN", "MANAGER"]);
        const db = prisma;
        const { name, type, prefix } = await request.json();

        if (!name || !prefix) {
            return NextResponse.json(
                { success: false, error: "Zone name and prefix are required." },
                { status: 400 }
            );
        }

        // Validate prefix format (2-5 uppercase chars)
        const cleanPrefix = prefix.trim().toUpperCase();
        if (!/^[A-Z0-9]{2,5}$/.test(cleanPrefix)) {
            return NextResponse.json(
                { success: false, error: "Prefix must be 2-5 uppercase alphanumeric characters." },
                { status: 400 }
            );
        }

        // Check for duplicate name
        const existingName = await db.floor.findFirst({
            where: { clientId: user.clientId, name: { equals: name.trim(), mode: 'insensitive' } },
        });
        if (existingName) {
            return NextResponse.json(
                { success: false, error: `Zone "${name}" already exists.` },
                { status: 409 }
            );
        }

        // Check for duplicate prefix
        const existingPrefix = await db.floor.findFirst({
            where: { clientId: user.clientId, prefix: cleanPrefix },
        });
        if (existingPrefix) {
            return NextResponse.json(
                { success: false, error: `Prefix "${cleanPrefix}" is already in use by "${existingPrefix.name}".` },
                { status: 409 }
            );
        }

        // Get next sort order
        const maxSort = await db.floor.aggregate({
            where: { clientId: user.clientId },
            _max: { sortOrder: true },
        });

        const floor = await db.floor.create({
            data: {
                clientId: user.clientId,
                name: name.trim(),
                type: type || 'MAIN_HALL',
                prefix: cleanPrefix,
                sortOrder: (maxSort._max.sortOrder || 0) + 1,
            },
            include: {
                tables: true,
                _count: { select: { tables: true } },
            },
        });

        console.log(`[FLOORS_CREATE] ✓ "${floor.name}" created by ${user.username}`);
        return NextResponse.json({ success: true, floor });

    } catch (error: any) {
        console.error("[FLOORS_CREATE]", error.message);
        if (error?.message?.includes("Authentication") || error?.message?.includes("Access denied")) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }
        return NextResponse.json({ success: false, error: "Failed to create zone" }, { status: 500 });
    }
}

// ============================================
// PATCH /api/floors — Update Zone
// ============================================
export async function PATCH(request: NextRequest) {
    try {
        const user = await requireRole(["ADMIN", "MANAGER"]);
        const db = prisma;
        const { id, name, type, prefix, isActive } = await request.json();

        if (!id) {
            return NextResponse.json({ success: false, error: "Floor ID is required." }, { status: 400 });
        }

        const existing = await db.floor.findFirst({
            where: { id, clientId: user.clientId },
        });
        if (!existing) {
            return NextResponse.json({ success: false, error: "Zone not found." }, { status: 404 });
        }

        const updateData: any = {};
        if (name !== undefined) updateData.name = name.trim();
        if (type !== undefined) updateData.type = type;
        if (prefix !== undefined) updateData.prefix = prefix.trim().toUpperCase();
        if (isActive !== undefined) updateData.isActive = isActive;

        const floor = await db.floor.update({
            where: { id },
            data: updateData,
            include: {
                tables: {
                    where: { deletedAt: null },
                    select: { id: true, tableCode: true, status: true, capacity: true },
                    orderBy: { tableCode: 'asc' as const },
                },
                _count: { select: { tables: true } },
            },
        });

        console.log(`[FLOORS_UPDATE] ✓ "${floor.name}" updated by ${user.username}`);
        return NextResponse.json({ success: true, floor });

    } catch (error: any) {
        console.error("[FLOORS_UPDATE]", error.message);
        return NextResponse.json({ success: false, error: "Failed to update zone" }, { status: 500 });
    }
}

// ============================================
// DELETE /api/floors — Delete Zone (Admin only)
// ============================================
export async function DELETE(request: NextRequest) {
    try {
        const user = await requireRole(["ADMIN"]);
        const db = prisma;
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ success: false, error: "Floor ID is required." }, { status: 400 });
        }

        const existing = await db.floor.findFirst({
            where: { id, clientId: user.clientId },
            include: { _count: { select: { tables: true } } },
        });

        if (!existing) {
            return NextResponse.json({ success: false, error: "Zone not found." }, { status: 404 });
        }

        // Unassign tables from this floor before deleting
        await db.table.updateMany({
            where: { floorId: id, clientId: user.clientId },
            data: { floorId: null },
        });

        await db.floor.delete({ where: { id } });

        console.log(`[FLOORS_DELETE] ✓ "${existing.name}" deleted by ${user.username}`);
        return NextResponse.json({ success: true, message: `Zone "${existing.name}" deleted. ${existing._count.tables} tables unassigned.` });

    } catch (error: any) {
        console.error("[FLOORS_DELETE]", error.message);
        return NextResponse.json({ success: false, error: "Failed to delete zone" }, { status: 500 });
    }
}
