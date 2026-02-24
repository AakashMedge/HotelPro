import { NextRequest, NextResponse } from "next/server";
import { getConversationByClientId, markAsRead } from "@/lib/hq/concierge";
import { getCurrentUser } from "@/lib/auth";
import { requireSuperAdmin } from "@/lib/hq/auth";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ clientId: string }> }
) {
    try {
        const { clientId } = await params;
        if (!clientId) {
            return NextResponse.json({ success: false, error: "Client ID required" }, { status: 400 });
        }

        let user: any = null;
        let isSuperAdmin = false;

        // Try getting super admin first
        try {
            user = await requireSuperAdmin();
            isSuperAdmin = true;
        } catch (err) {
            // Not a super admin, try regular user
            user = await getCurrentUser();
        }

        if (!user) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        // Security check
        if (!isSuperAdmin && user.clientId !== clientId) {
            console.warn(`[CONCIERGE_SECURITY] User ${user.id} tried to access client ${clientId}`);
            return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
        }

        const conversation = await getConversationByClientId(clientId);

        // Mark as read if found
        if (conversation) {
            const roleToMark = isSuperAdmin ? 'HOTEL_ADMIN' : 'SUPER_ADMIN';
            await markAsRead(conversation.id, roleToMark);
        }

        return NextResponse.json({ success: true, data: conversation });
    } catch (error: any) {
        console.error("[CONCIERGE_CONV_GET_ERROR]", error);
        return NextResponse.json({
            success: false,
            error: error.message || "Internal Server Error"
        }, { status: 500 });
    }
}
