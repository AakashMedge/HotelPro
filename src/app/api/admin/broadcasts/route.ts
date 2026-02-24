import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export async function GET(request: NextRequest) {
    try {
        const user = await requireRole(["ADMIN", "MANAGER"]);
        const { clientId } = user;

        // Get the client's current plan to filter broadcasts
        const client = await prisma.client.findUnique({
            where: { id: clientId },
            select: { plan: true }
        });

        if (!client) {
            return NextResponse.json({ error: "Client not found" }, { status: 404 });
        }

        const broadcasts = await prisma.platformBroadcast.findMany({
            where: {
                OR: [
                    { target: 'ALL' },
                    { target: client.plan }
                ]
            },
            orderBy: { createdAt: 'desc' },
            take: 5
        });

        return NextResponse.json({ broadcasts });
    } catch (error: any) {
        console.error("[ADMIN_BROADCASTS_GET]", error);
        return NextResponse.json({ broadcasts: [] });
    }
}
