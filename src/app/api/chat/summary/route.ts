import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/server";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== 'ADMIN') {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const channelId = searchParams.get('channelId');

        if (!channelId) return NextResponse.json({ success: false, error: "Channel ID required" }, { status: 400 });

        // Fetch last 50 messages to summarize
        const messages = await (prisma as any).chatMessage.findMany({
            where: { channelId },
            take: 50,
            orderBy: { createdAt: 'desc' },
            include: { sender: true }
        });

        if (messages.length === 0) {
            return NextResponse.json({ success: true, summary: "No recent activity to summarize." });
        }

        // Mock AI Summary logic (In production, call OpenAI/Anthropic/Gemini)
        const total = messages.length;
        const urgent = messages.filter((m: any) => m.severity === 'URGENT' || m.severity === 'STOCK_OUT').length;
        const senders = new Set(messages.map((m: any) => m.sender.name)).size;

        const summary = `Pulse Summary: In the last 50 updates, there were ${urgent} critical alerts from ${senders} staff members. Key focus remains on operational flow and stock management. Message volume is ${total > 20 ? 'High' : 'Normal'}.`;

        return NextResponse.json({ success: true, summary });
    } catch (error) {
        return NextResponse.json({ success: false, error: "Failed to generate summary" }, { status: 500 });
    }
}
