
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";

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
        const body = await request.json();

        // Verify staff belongs to same client (tenant isolation)
        const existingStaff = await prisma.user.findFirst({
            where: { id, clientId: user.clientId }
        });

        if (!existingStaff) {
            return NextResponse.json(
                { success: false, error: "Staff member not found" },
                { status: 404 }
            );
        }

        // Prevent modifying ADMIN users (security)
        if (existingStaff.role === 'ADMIN') {
            return NextResponse.json(
                { success: false, error: "Cannot modify admin users" },
                { status: 403 }
            );
        }

        // Update allowed fields
        const updated = await prisma.user.update({
            where: { id },
            data: {
                isActive: body.isActive !== undefined ? body.isActive : existingStaff.isActive,
                name: body.name !== undefined ? body.name : existingStaff.name,
            },
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

        // Verify staff belongs to same client (tenant isolation)
        const existingStaff = await prisma.user.findFirst({
            where: { id, clientId: user.clientId }
        });

        if (!existingStaff) {
            return NextResponse.json(
                { success: false, error: "Staff member not found" },
                { status: 404 }
            );
        }

        // Prevent deleting ADMIN users (security)
        if (existingStaff.role === 'ADMIN') {
            return NextResponse.json(
                { success: false, error: "Cannot delete admin users" },
                { status: 403 }
            );
        }

        await prisma.user.delete({
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
