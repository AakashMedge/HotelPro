
import { NextRequest, NextResponse } from "next/server";
import { prisma, getDb } from "@/lib/db";
import { requireRole, hashPassword, encryptPassword, decryptPassword } from "@/lib/auth";

/**
 * GET /api/staff
 * List all staff members for the current tenant
 */
export async function GET(request: NextRequest) {
    try {
        console.log("[STAFF_API] 🚀 Fetching staff roster...");

        // Get authenticated user with clientId and routing info
        const user = await requireRole(["MANAGER", "ADMIN"]);
        const { clientId } = user;

        // Get the correct database client
        const db = getDb();

        // Fetch staff from the operational database - filtered for operational roles
        const staff = await (db.user as any).findMany({
            where: {
                clientId,
                role: { in: ['WAITER', 'CASHIER', 'KITCHEN', 'MANAGER', 'ADMIN'] }
            },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                name: true,
                username: true,
                role: true,
                isActive: true,
                passwordEncrypted: true,
                createdAt: true,
                totalOrders: true,
                totalSales: true,
                assignedTables: {
                    select: {
                        id: true,
                        tableCode: true,
                        section: true,
                        status: true
                    }
                }
            }
        });

        // Decrypt passwords for the Admin
        const staffWithPasswords = staff.map((s: any) => ({
            ...s,
            password: s.passwordEncrypted ? decryptPassword(s.passwordEncrypted) : null,
            passwordEncrypted: undefined // Hide the raw encrypted blob from frontend
        }));

        console.log(`[STAFF_API] ✅ Success. Found ${staffWithPasswords.length} staff.`);
        return NextResponse.json({ success: true, staff: staffWithPasswords });
    } catch (error: any) {
        console.error("[STAFF_API] 💥 CRITICAL ERROR:", error);
        if (error?.message === "Authentication required" || error?.message?.includes("Access denied")) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }
        return NextResponse.json({ success: false, error: error?.message || "Failed to fetch staff" }, { status: 500 });
    }
}

/**
 * POST /api/staff
 * Create a new staff member for the current tenant
 */
export async function POST(request: NextRequest) {
    try {
        // Get authenticated user with clientId
        const currentUser = await requireRole(["MANAGER", "ADMIN"]);
        const { clientId } = currentUser;

        const body = await request.json();
        const { name, username, password, role } = body;

        if (!name || !username || !password || !role) {
            return NextResponse.json({ success: false, error: "Missing fields" }, { status: 400 });
        }

        if (currentUser.role === 'MANAGER' && (role === 'ADMIN' || role === 'MANAGER')) {
            return NextResponse.json({ success: false, error: "Managers cannot create Admin or Manager accounts." }, { status: 403 });
        }

        // 1. Check if username exists globally (Control Plane)
        const existing = await (prisma.user as any).findUnique({ where: { username } });
        if (existing) {
            return NextResponse.json({ success: false, error: "Username taken" }, { status: 409 });
        }

        const passwordHash = await hashPassword(password);
        const passwordEncrypted = encryptPassword(password);

        // 2. Create in Control Plane (for global authentication)
        const newUser = await (prisma.user as any).create({
            data: {
                clientId,
                name,
                username,
                passwordHash,
                passwordEncrypted,
                role,
                isActive: true
            },
            select: { id: true, name: true, role: true }
        });


        return NextResponse.json({ success: true, user: newUser });

    } catch (error) {
        console.error("Create Staff Error:", error);
        return NextResponse.json({ success: false, error: "Failed to create user" }, { status: 500 });
    }
}

/**
 * PATCH /api/staff
 * Update staff member details or reset password
 */
export async function PATCH(request: NextRequest) {
    try {
        const currentUser = await requireRole(["ADMIN"]);
        const { clientId } = currentUser;

        const body = await request.json();
        const { id, name, password, isActive } = body;

        if (!id) {
            return NextResponse.json({ success: false, error: "Staff ID required" }, { status: 400 });
        }

        const updateData: any = {};
        if (name) updateData.name = name;
        if (typeof isActive === 'boolean') updateData.isActive = isActive;
        if (password && password.trim().length > 0) {
            updateData.passwordHash = await hashPassword(password.trim());
            updateData.passwordEncrypted = encryptPassword(password.trim());
        }

        const updated = await (prisma.user as any).update({
            where: { id, clientId },
            data: updateData,
            select: { id: true, name: true, username: true, role: true }
        });

        return NextResponse.json({ success: true, user: updated });
    } catch (error: any) {
        console.error("[STAFF_PATCH_ERROR]", error);
        return NextResponse.json({ success: false, error: error?.message || "Failed to update staff" }, { status: 500 });
    }
}

/**
 * DELETE /api/staff
 * Delete staff member account for THIS tenant
 */
export async function DELETE(request: NextRequest) {
    try {
        const currentUser = await requireRole(["ADMIN"]);
        const { clientId, id: currentUserId } = currentUser;

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ success: false, error: "Staff ID required" }, { status: 400 });
        }

        if (id === currentUserId) {
            return NextResponse.json({ success: false, error: "Cannot delete your own admin account" }, { status: 400 });
        }

        await (prisma.user as any).delete({
            where: { id, clientId }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("[STAFF_DELETE_ERROR]", error);
        return NextResponse.json({ success: false, error: error?.message || "Failed to delete staff" }, { status: 500 });
    }
}
