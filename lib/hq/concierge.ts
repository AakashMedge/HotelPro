// lib/hq/concierge.ts
import { prisma } from "@/lib/db";

/**
 * 🛠️ DE-COUPLED TYPES FOR STABILITY
 * Resolves desync between generated Prisma Client and App runtime
 */
type ConversationStatus = 'OPEN' | 'CLOSED' | 'ESCALATED';
type ConversationPriority = 'LOW' | 'NORMAL' | 'HIGH';

const p = prisma as any;

export async function getConversationsForHQ(filters: {
    status?: ConversationStatus;
    priority?: ConversationPriority;
    plan?: string;
}) {
    if (!p.platformConversation) return [];
    return await p.platformConversation.findMany({
        where: {
            status: filters.status,
            priority: filters.priority,
            planTierSnapshot: filters.plan
        },
        include: {
            client: {
                select: {
                    name: true,
                    slug: true,
                    plan: true
                }
            },
            _count: {
                select: {
                    messages: {
                        where: { isRead: false, senderRole: 'HOTEL_ADMIN' }
                    }
                }
            }
        },
        orderBy: { lastMessageAt: 'desc' }
    });
}

export async function getConversationByClientId(clientId: string) {
    if (!p.platformConversation) {
        console.error("[CONCIERGE_FATAL] platformConversation model MISSING.");
        return null;
    }
    return await p.platformConversation.findFirst({
        where: { clientId },
        include: {
            messages: {
                orderBy: { createdAt: 'asc' }
            }
        }
    });
}

export async function sendMessage({
    clientId,
    conversationId,
    content,
    senderRole,
    metadataSnapshot
}: {
    clientId?: string;
    conversationId?: string;
    content: string;
    senderRole: 'HOTEL_ADMIN' | 'SUPER_ADMIN';
    metadataSnapshot?: any;
}) {
    return await prisma.$transaction(async (tx) => {
        const txAny = tx as any;
        let convId = conversationId;

        // 1. Find or create conversation if only clientId provided
        if (!convId && clientId) {
            const client = await txAny.client.findUnique({
                where: { id: clientId },
                select: { plan: true }
            });

            if (!client) throw new Error("Client not found");

            const existing = await txAny.platformConversation.findFirst({
                where: { clientId, status: 'OPEN' }
            });

            if (existing) {
                convId = existing.id;
            } else {
                const newConv = await txAny.platformConversation.create({
                    data: {
                        clientId,
                        planTierSnapshot: client.plan,
                        status: 'OPEN',
                        priority: 'NORMAL'
                    }
                });
                convId = newConv.id;
            }
        }

        if (!convId) throw new Error("Conversation ID or Client ID required");

        // 2. Create message
        const message = await txAny.platformMessage.create({
            data: {
                conversationId: convId,
                senderRole,
                messageContent: content,
                metadataSnapshot,
                isRead: false
            }
        });

        // 3. Update lastMessageAt
        await txAny.platformConversation.update({
            where: { id: convId },
            data: { lastMessageAt: new Date() }
        });

        return message;
    });
}

export async function markAsRead(conversationId: string, roleToMark: 'HOTEL_ADMIN' | 'SUPER_ADMIN') {
    if (!p.platformMessage) return null;
    return await p.platformMessage.updateMany({
        where: {
            conversationId,
            senderRole: roleToMark,
            isRead: false
        },
        data: { isRead: true }
    });
}

export async function getUnreadCountForHQ() {
    if (!p.platformMessage) return 0;
    const unread = await p.platformMessage.count({
        where: {
            senderRole: 'HOTEL_ADMIN',
            isRead: false
        }
    });
    return unread;
}
