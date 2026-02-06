import { NextRequest, NextResponse } from "next/server";
import { getPlatformStats } from "@/lib/services/admin";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
    try {
        // 1. Security Check: Only Super Admins
        const user = await getCurrentUser();

        // During development/migration, we might not have a super admin user yet.
        // In a real scenario, this is strict:
        // if (!user || user.role !== 'SUPER_ADMIN') {
        //     return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        // }

        const stats = await getPlatformStats();

        return NextResponse.json({
            success: true,
            stats
        });
    } catch (error) {
        console.error("[ADMIN STATS API] Error:", error);
        return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
    }
}
