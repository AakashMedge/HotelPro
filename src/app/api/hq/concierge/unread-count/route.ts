
import { NextResponse } from "next/server";
import { getUnreadCountForHQ } from "@/lib/hq/concierge";
import { requireSuperAdmin } from "@/lib/hq/auth";

export async function GET() {
    try {
        await requireSuperAdmin();
        const count = await getUnreadCountForHQ();
        return NextResponse.json({ success: true, count });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
}
