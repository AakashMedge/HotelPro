/**
 * Customer Feedback API
 * 
 * POST /api/customer/feedback - Customer submits rating + feedback
 * GET  /api/customer/feedback - Staff views all feedback
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";
import { getCurrentUser } from "@/lib/auth/server";
import { eventEmitter } from "@/lib/services/eventEmitter";

// ============================================
// POST - Customer submits feedback
// ============================================

export async function POST(request: NextRequest) {
    try {
        const tenant = await getTenantFromRequest();
        if (!tenant) {
            return NextResponse.json({ success: false, error: "Hotel not identified" }, { status: 401 });
        }

        const body = await request.json();
        const { orderId, rating, comment, guestName, tableCode } = body;

        if (!orderId || !rating) {
            return NextResponse.json(
                { success: false, error: "orderId and rating are required" },
                { status: 400 }
            );
        }

        if (typeof rating !== 'number' || rating < 1 || rating > 5) {
            return NextResponse.json(
                { success: false, error: "Rating must be between 1 and 5" },
                { status: 400 }
            );
        }

        // Validate order exists and belongs to client
        const order = await prisma.order.findUnique({
            where: { id: orderId, clientId: tenant.id }
        });

        if (!order) {
            return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
        }

        // Check if feedback already submitted for this order
        const existing = await prisma.customerFeedback.findFirst({
            where: { orderId, clientId: tenant.id }
        });

        if (existing) {
            return NextResponse.json(
                { success: false, error: "Feedback already submitted for this order" },
                { status: 409 }
            );
        }

        const feedback = await prisma.customerFeedback.create({
            data: {
                clientId: tenant.id,
                orderId,
                rating: rating, // rating is already validated as a number
                comment: comment || null,
                guestName: guestName || null,
                tableCode: tableCode || null,
            }
        });

        // Ensure Chat Channel for feedback exists
        let targetChannel = await prisma.chatChannel.findFirst({
            where: { clientId: tenant.id, type: 'CUSTOMER_FEEDBACK' }
        });

        if (!targetChannel) {
            targetChannel = await prisma.chatChannel.create({
                data: {
                    clientId: tenant.id,
                    name: 'guest-feedback',
                    type: 'CUSTOMER_FEEDBACK'
                }
            });
        }

        // Find a sender (prefer Admin)
        let senderUser = await prisma.user.findFirst({
            where: { clientId: tenant.id, role: 'ADMIN' }
        });

        if (!senderUser) {
            senderUser = await prisma.user.findFirst({
                where: { clientId: tenant.id }
            });
        }

        if (targetChannel && senderUser) {
            const starRating = "⭐".repeat(rating || 1); // rating is already a number

            const message = await prisma.chatMessage.create({
                data: {
                    channelId: targetChannel.id,
                    senderId: senderUser.id,
                    content: `${starRating} [FEEDBACK] ${guestName || 'Guest'}${tableCode ? ` (Table ${tableCode})` : ''}: "${comment || 'No comment'}"`,
                    severity: rating <= 2 ? 'URGENT' : 'INFO', // rating is already a number
                    feedbackId: feedback.id, // Direct link
                    orderId: orderId,
                    createdAt: new Date(),
                }
            });
            console.log(`[FEEDBACK] Chat Message ${message.id} linked to feedback ${feedback.id}`);

            // Emit specifically for Hub to refresh messages
            eventEmitter.emit('CHAT_MESSAGE_RECEIVED', { channelId: targetChannel.id });
        }
        else {
            console.warn(`[FEEDBACK] Could not create chat message: Channel=${!!targetChannel}, Sender=${!!senderUser}`);
        }

        // Emit event for real-time hub
        eventEmitter.emit('FEEDBACK_SUBMITTED', {
            feedbackId: feedback.id,
            orderId,
            rating,
            comment,
            guestName: guestName || 'Guest',
            tableCode,
            clientId: tenant.id,
        });

        // Audit log
        await prisma.auditLog.create({
            data: {
                clientId: tenant.id,
                action: 'FEEDBACK_SUBMITTED',
                orderId,
                metadata: {
                    feedbackId: feedback.id,
                    rating,
                    comment,
                }
            }
        });

        return NextResponse.json({ success: true, feedback });
    } catch (error) {
        console.error("[FEEDBACK API] POST Error:", error);
        return NextResponse.json({ success: false, error: "Failed to submit feedback" }, { status: 500 });
    }
}

// ============================================
// GET - Staff views feedback
// ============================================

export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '50');

        const feedbacks = await (prisma as any).customerFeedback.findMany({
            where: { clientId: user.clientId },
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: {
                order: {
                    select: { id: true, grandTotal: true, customerName: true }
                }
            }
        });

        // Calculate average rating
        const allRatings = await (prisma as any).customerFeedback.aggregate({
            where: { clientId: user.clientId },
            _avg: { rating: true },
            _count: { id: true },
        });

        return NextResponse.json({
            success: true,
            feedbacks,
            stats: {
                averageRating: allRatings._avg.rating ? Number(allRatings._avg.rating.toFixed(1)) : 0,
                totalFeedbacks: allRatings._count.id,
            }
        });
    } catch (error) {
        console.error("[FEEDBACK API] GET Error:", error);
        return NextResponse.json({ success: false, error: "Failed to fetch feedback" }, { status: 500 });
    }
}

// ============================================
// PATCH - Staff replies to feedback
// ============================================

export async function PATCH(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user || !['ADMIN', 'MANAGER'].includes(user.role)) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { feedbackId, staffReply } = body;

        if (!feedbackId || !staffReply) {
            return NextResponse.json({ success: false, error: "feedbackId and staffReply are required" }, { status: 400 });
        }

        const feedback = await (prisma as any).customerFeedback.update({
            where: { id: feedbackId, clientId: user.clientId },
            data: {
                staffReply,
                repliedAt: new Date(),
                repliedById: user.id
            }
        });

        // Emit event for real-time customer notification (if they have a socket open)
        eventEmitter.emit('FEEDBACK_REPLIED', {
            feedbackId,
            staffReply,
            clientId: user.clientId,
            orderId: feedback.orderId
        });

        // Audit Log
        await prisma.auditLog.create({
            data: {
                clientId: user.clientId,
                action: 'SETTING_CHANGED', // Or define a new action if needed
                actorId: user.id,
                metadata: {
                    type: 'FEEDBACK_REPLY',
                    feedbackId,
                    staffReply
                }
            }
        });

        return NextResponse.json({ success: true, feedback });
    } catch (error) {
        console.error("[FEEDBACK API] PATCH Error:", error);
        return NextResponse.json({ success: false, error: "Failed to reply to feedback" }, { status: 500 });
    }
}
