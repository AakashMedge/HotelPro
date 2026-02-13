
import { NextRequest, NextResponse } from "next/server";
import { prisma, getDb } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { hashPassword } from "@/lib/auth";

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

        console.log(`[STAFF_API] ✅ Success. Found ${staff.length} staff.`);
        return NextResponse.json({ success: true, staff });
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

        // 2. Create in Control Plane (for global authentication)
        const newUser = await (prisma.user as any).create({
            data: {
                clientId,
                name,
                username,
                passwordHash,
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
