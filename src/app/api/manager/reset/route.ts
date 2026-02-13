
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { resetTenantData } from "@/lib/services/tenant";

/**
 * POST /api/manager/reset
 * Factory Reset for the CURRENT hotel only.
 * Restricted to ADMIN role.
 */
export async function POST(request: NextRequest) {
    try {
        const user = await requireRole(["ADMIN"]);
        const { clientId, id: userId } = user;

        const body = await request.json();
        const { confirmText } = body;

        // Production Safety: Require explicit confirmation string
        if (confirmText !== "RESET") {
            return NextResponse.json({
                success: false,
                error: "Invalid confirmation. Please type RESET to proceed."
            }, { status: 400 });
        }

        await resetTenantData(clientId, userId);

        return NextResponse.json({
            success: true,
            message: "All hotel data has been cleared. Your account is still active."
        });

    } catch (error: any) {
        console.error("[RESET_API_ERROR]", error);
        return NextResponse.json({
            success: false,
            error: error?.message || "Reset failed"
        }, { status: 500 });
    }
}
