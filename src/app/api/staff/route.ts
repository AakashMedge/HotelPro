
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { hashPassword } from "@/lib/auth";

/**
 * GET /api/staff
 * List all staff members
 */
export async function GET(request: NextRequest) {
    try {
        await requireRole(["MANAGER", "ADMIN"]);

        const staff = await prisma.user.findMany({
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                name: true,
                username: true,
                role: true,
                isActive: true,
                createdAt: true
            }
        });

        return NextResponse.json({ success: true, staff });
    } catch (error) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
}

/**
 * POST /api/staff
 * Create a new staff member
 */
export async function POST(request: NextRequest) {
    try {
        await requireRole(["MANAGER", "ADMIN"]);
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

        const newUser = await prisma.user.create({
            data: {
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
