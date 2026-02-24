
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
// import { PrismaClient } from "@prisma/client";
// const prisma = new PrismaClient();
import { verifySuperAdminToken } from "@/lib/hq/auth";
import { cookies } from "next/headers";

async function requireSuperAdmin() {
    const cookieStore = await cookies();
    const token = cookieStore.get("hq-token")?.value;
    if (!token) return null;
    return verifySuperAdminToken(token);
}

export async function GET() {
    const admin = await requireSuperAdmin();
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const broadcasts = await prisma.platformBroadcast.findMany({
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json({ broadcasts });
    } catch (error: any) {
        console.error("❌ GET /api/hq/broadcasts error:", error.message);
        return NextResponse.json({ error: "Failed to fetch broadcasts" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const admin = await requireSuperAdmin();
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await req.json();
        const { title, content, type, priority, target } = body;

        const broadcast = await prisma.platformBroadcast.create({
            data: {
                title,
                content,
                type: type || 'ANNOUNCEMENT',
                priority: priority || 'MEDIUM',
                target: target || 'ALL',
                sentBy: admin.email,
            }
        });

        return NextResponse.json({ broadcast }, { status: 201 });
    } catch (error) {
        console.error("[HQ/BROADCASTS] POST error:", error);
        return NextResponse.json({ error: "Failed to create broadcast" }, { status: 500 });
    }
}
