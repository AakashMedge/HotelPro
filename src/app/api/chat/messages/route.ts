import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/server";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const channelId = searchParams.get('channelId');

        if (!channelId) return NextResponse.json({ success: false, error: "Channel ID required" }, { status: 400 });

        // Role-based channel access check
        const channel = await (prisma as any).chatChannel.findFirst({
            where: { id: channelId, clientId: user.clientId }
        });
        if (!channel) return NextResponse.json({ success: false, error: "Channel not found" }, { status: 404 });

        if (channel.type === 'ADMIN_ONLY' && !['ADMIN', 'MANAGER'].includes(user.role)) {
            return NextResponse.json({ success: false, error: "Unauthorized for this channel" }, { status: 403 });
        }

        const messages = await (prisma as any).chatMessage.findMany({
            where: {
                channelId,
                channel: { clientId: user.clientId } // Security check
            },
            include: {
                sender: { select: { id: true, name: true, role: true } },
                acks: { select: { userId: true } }
            },
            orderBy: { createdAt: 'asc' },
            take: 100 // Limit history
        });

        console.log(`[CHAT] Fetched ${messages.length} messages for channel ${channelId} (Client: ${user.clientId})`);

        return NextResponse.json({ success: true, messages });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ success: false, error: "Server Error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

        const { channelId, content, severity, orderId, attachmentUrl, attachmentType } = await req.json();

        console.log('Chat Post Payload:', { channelId, content, attachmentUrl, attachmentType });
        console.log('Prisma Instance keys:', Object.keys(prisma as any));

        // Check if user has access to this channel type
        const channel = await (prisma as any).chatChannel.findFirst({
            where: { id: channelId, clientId: user.clientId }
        });

        if (!channel) return NextResponse.json({ success: false, error: "Channel not found" }, { status: 404 });

        if (channel.type === 'ADMIN_ONLY' && !['ADMIN', 'MANAGER'].includes(user.role)) {
            return NextResponse.json({ success: false, error: "Unauthorized for this channel" }, { status: 403 });
        }

        const message = await (prisma as any).chatMessage.create({
            data: {
                channelId,
                senderId: user.id,
                content: content || (attachmentType === 'AUDIO' ? 'Voice Message' : 'Image'),
                severity: severity || 'INFO',
                orderId,
                attachmentUrl,
                attachmentType
            },
            include: {
                sender: { select: { name: true, role: true } }
            }
        });

        return NextResponse.json({ success: true, message });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ success: false, error: "Failed to send message" }, { status: 500 });
    }
}
