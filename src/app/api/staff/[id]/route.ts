
import { NextRequest, NextResponse } from "next/server";
import { prisma, getDb } from "@/lib/db";
import { requireRole, hashPassword } from "@/lib/auth";

/**
 * PATCH /api/staff/[id]
 * Update staff member (toggle active status, update details)
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await requireRole(["MANAGER", "ADMIN"]);
        const { id } = await params;
        const { clientId } = user;
        const body = await request.json();

        // 1. Verify staff belongs to same client in Control Plane
        const existingStaff = await (prisma.user as any).findFirst({
            where: { id, clientId }
        });

        if (!existingStaff) {
            return NextResponse.json(
                { success: false, error: "Staff member not found" },
                { status: 404 }
            );
        }

        if (existingStaff.role === 'ADMIN') {
            return NextResponse.json(
                { success: false, error: "Cannot modify admin users" },
                { status: 403 }
            );
        }

        let passwordHash = undefined;
        if (body.password) {
            passwordHash = await hashPassword(body.password);
        }

        const updateData = {
            isActive: body.isActive !== undefined ? body.isActive : existingStaff.isActive,
            name: body.name !== undefined ? body.name : existingStaff.name,
            role: body.role !== undefined ? body.role : existingStaff.role,
            ...(passwordHash && { passwordHash })
        };

        // 2. Update in Control Plane
        const updated = await (prisma.user as any).update({
            where: { id },
            data: updateData,
            select: { id: true, name: true, isActive: true, role: true }
        });


        return NextResponse.json({ success: true, user: updated });
    } catch (error) {
        console.error("Update Staff Error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to update staff" },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/staff/[id]
 * Deactivate/Delete a staff member
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await requireRole(["MANAGER", "ADMIN"]);
        const { id } = await params;
        const { clientId } = user;

        // 1. Verify staff belongs to same client in Control Plane
        const existingStaff = await (prisma.user as any).findFirst({
            where: { id, clientId }
        });

        if (!existingStaff) {
            return NextResponse.json(
                { success: false, error: "Staff member not found" },
                { status: 404 }
            );
        }

        if (existingStaff.role === 'ADMIN') {
            return NextResponse.json(
                { success: false, error: "Cannot delete admin users" },
                { status: 403 }
            );
        }

        // 2. Delete from Control Plane
        await (prisma.user as any).delete({
            where: { id }
        });


        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete Staff Error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to delete user" },
            { status: 500 }
        );
    }
}
