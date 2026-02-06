
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { hashPassword } from "@/lib/auth";

/**
 * GET /api/staff
 * List all staff members for the current tenant
 */
export async function GET(request: NextRequest) {
    try {
        // Get authenticated user with clientId
        const user = await requireRole(["MANAGER", "ADMIN"]);
        const clientId = user.clientId;

        // Only fetch staff for this tenant
        const staff = await prisma.user.findMany({
            where: { clientId },
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
                    } as any
                }
            } as any
        });

        return NextResponse.json({ success: true, staff });
    } catch (error: any) {
        console.error("[STAFF_GET_ERROR]", error);
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
        const clientId = currentUser.clientId;

        const body = await request.json();

        const { name, username, password, role } = body;

        if (!name || !username || !password || !role) {
            return NextResponse.json({ success: false, error: "Missing fields" }, { status: 400 });
        }

        // Check if username exists
        const existing = await prisma.user.findUnique({ where: { username } });
        if (existing) {
            return NextResponse.json({ success: false, error: "Username taken" }, { status: 409 });
        }

        const passwordHash = await hashPassword(password);

        // Create staff member for THIS tenant
        const newUser = await prisma.user.create({
            data: {
                clientId, // Tenant isolation - staff belongs to this client
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
