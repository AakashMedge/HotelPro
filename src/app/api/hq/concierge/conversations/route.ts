
import { NextRequest, NextResponse } from "next/server";
import { getConversationsForHQ } from "@/lib/hq/concierge";
import { requireSuperAdmin } from "@/lib/hq/auth";
import { ConversationStatus, ConversationPriority } from "@prisma/client";

export async function GET(request: NextRequest) {
    try {
        await requireSuperAdmin();
        const { searchParams } = new URL(request.url);

        const filters = {
            status: searchParams.get('status') as ConversationStatus || undefined,
            priority: searchParams.get('priority') as ConversationPriority || undefined,
            plan: searchParams.get('plan') || undefined
        };

        const conversations = await getConversationsForHQ(filters);
        return NextResponse.json({ success: true, data: conversations });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
}
