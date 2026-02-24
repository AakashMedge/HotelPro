import { NextRequest, NextResponse } from "next/server";
import { sendMessage } from "@/lib/hq/concierge";
import { getCurrentUser } from "@/lib/auth";
import { requireSuperAdmin } from "@/lib/hq/auth";

export async function POST(request: NextRequest) {
    try {
        let user: any = null;
        let senderRole: 'HOTEL_ADMIN' | 'SUPER_ADMIN' = 'HOTEL_ADMIN';

        // Try getting tenant user
        user = await getCurrentUser();

        // If not a tenant user, try getting super admin
        if (!user) {
            try {
                user = await requireSuperAdmin();
                senderRole = 'SUPER_ADMIN';
            } catch (err) {
                // Both failed
                return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
            }
        } else {
            senderRole = 'HOTEL_ADMIN';
        }

        const body = await request.json();
        const targetClientId = body.clientId || user?.clientId;

        if (!targetClientId) {
            return NextResponse.json({ success: false, error: "Client ID required" }, { status: 400 });
        }

        const message = await sendMessage({
            clientId: targetClientId,
            conversationId: body.conversationId,
            content: body.content,
            senderRole,
            metadataSnapshot: body.metadataSnapshot
        });

        return NextResponse.json({ success: true, data: message });
    } catch (error: any) {
        console.error("[CONCIERGE_MESSAGES_POST_ERROR]", error);
        return NextResponse.json({
            success: false,
            error: error.message || "Internal Server Error"
        }, { status: 500 });
    }
}
