import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

        const { messageId } = await req.json();

        // Check if message has linked complaint/feedback and update status
        const message = await prisma.chatMessage.findUnique({
            where: { id: messageId },
            select: { id: true, complaintId: true, feedbackId: true }
        });

        if (message?.complaintId) {
            await prisma.customerComplaint.update({
                where: { id: message.complaintId },
                data: { status: 'ACKNOWLEDGED' }
            });

            // Emit for real-time update
            const { eventEmitter } = await import("@/lib/services/eventEmitter");
            eventEmitter.emit('COMPLAINT_UPDATED', { complaintId: message.complaintId });
        }

        const ack = await prisma.chatAck.upsert({
            where: {
                messageId_userId: {
                    messageId,
                    userId: user.id
                }
            },
            update: {}, // If already exists, do nothing
            create: {
                messageId,
                userId: user.id
            }
        });

        return NextResponse.json({ success: true, ack });
    } catch (error) {
        console.error("[CHAT ACK] Error:", error);
        return NextResponse.json({ success: false, error: "Failed to acknowledge message" }, { status: 500 });
    }
}
