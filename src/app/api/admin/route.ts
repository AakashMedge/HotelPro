
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export async function GET(request: NextRequest) {
    try {
        await requireRole(["ADMIN", "MANAGER"]);

        const [userCount, tableCount, menuCount, orderCount] = await Promise.all([
            prisma.user.count(),
            prisma.table.count(),
            prisma.menuItem.count(),
            prisma.order.count()
        ]);

        const stats = {
            users: userCount,
            tables: tableCount,
            items: menuCount,
            orders: orderCount,
            uptime: formatUptime(process.uptime()),
            dbStatus: 'HEALTHY',
            version: 'v2.4.0-stable'
        };

        return NextResponse.json({ success: true, stats });
    } catch (error) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
}

function formatUptime(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
}
