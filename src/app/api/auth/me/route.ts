import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, getAuthFailure } from "@/lib/auth";

export async function GET(request: NextRequest) {
    try {
        const searchRole = request.nextUrl.searchParams.get("role");
        const headerRole = request.headers.get("x-role-hint");
        const referer = request.headers.get("referer") || "";

        let roleHint = searchRole || headerRole || undefined;
        if (!roleHint) {
            if (referer.includes("/waiter")) roleHint = "WAITER";
            else if (referer.includes("/admin") || referer.includes("/manager")) roleHint = "ADMIN";
            else if (referer.includes("/kitchen")) roleHint = "KITCHEN";
            else if (referer.includes("/cashier")) roleHint = "CASHIER";
            else if (referer.includes("/hq")) roleHint = "SUPER_ADMIN";
        }

        const user = await getCurrentUser(roleHint);

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
