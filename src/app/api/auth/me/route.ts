import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
        }

        return NextResponse.json({ success: true, user });
    } catch (error) {
        console.error("[AUTH_ME] Error:", error);
        return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
    }
}
