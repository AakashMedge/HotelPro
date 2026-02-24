import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/server";
import { NextResponse } from "next/server";
import { eventEmitter } from "@/lib/services/eventEmitter";

export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user || !['ADMIN', 'MANAGER'].includes(user.role)) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const { messageId, resolvedNote } = await req.json();

        if (!messageId) return NextResponse.json({ success: false, error: "Message ID required" }, { status: 400 });

        const message = await (prisma as any).chatMessage.findUnique({
            where: { id: messageId },
            include: { channel: true }
        });

        if (!message || !message.complaintId) {
            return NextResponse.json({ success: false, error: "Linkable complaint not found" }, { status: 404 });
        }

        // Update the complaint
        const complaint = await (prisma as any).customerComplaint.update({
            where: { id: message.complaintId },
            data: {
                status: 'RESOLVED',
                resolvedById: user.id,
                resolvedAt: new Date(),
                resolvedNote: resolvedNote || "Resolved via staff chat."
            }
        });

        // Update the chat message severity to visually indicate resolution
        await (prisma as any).chatMessage.update({
            where: { id: messageId },
            data: {
                severity: 'INFO',
            }
        });

        // Emit events
        eventEmitter.emit('COMPLAINT_UPDATED', { complaintId: message.complaintId, status: 'RESOLVED', orderId: complaint.orderId });
        eventEmitter.emit('CHAT_MESSAGE_RECEIVED', { channelId: message.channelId });

        return NextResponse.json({ success: true, complaint });
    } catch (error) {
        console.error("[CHAT RESOLVE] Error:", error);
        return NextResponse.json({ success: false, error: "Failed to resolve issue" }, { status: 500 });
    }
}
