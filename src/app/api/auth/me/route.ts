import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, getAuthFailure } from "@/lib/auth";

export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json(
                { success: false, error: "Not authenticated", code: "AUTH_REQUIRED" },
                { status: 401 }
            );
        }

        return NextResponse.json({ success: true, user });
    } catch (error) {
        const authFailure = getAuthFailure(error);
        if (authFailure) {
            return NextResponse.json(
                { success: false, error: authFailure.message, code: authFailure.code },
                { status: authFailure.status }
            );
        }

        console.error("[AUTH_ME] Error:", error);
        return NextResponse.json(
            { success: false, error: "Internal server error", code: "INTERNAL_ERROR" },
            { status: 500 }
        );
    }
}
