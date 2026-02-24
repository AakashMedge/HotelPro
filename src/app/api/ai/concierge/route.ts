/**
 * AI Concierge API — The Brain (Production)
 * 
 * POST /api/ai/concierge
 * 
 * Receives customer messages, processes through LLM with tool calling,
 * and returns structured responses with UI commands.
 * 
 * Now includes: Real-time order tracking, menu intelligence, and upsell flow.
 * Supports: Ollama (dev) / Groq (production) — auto-detected.
 * Cost: ₹0
 */

import { prisma } from '@/lib/db';
import { getTenantFromRequest } from '@/lib/tenant';
import { generateCompletion, getAiHealth } from '@/lib/ai/provider';
import {
    buildSystemPrompt,
    parseAiResponse,
    executeActions,
    type SessionState,
    type MenuItem,
    type CartItem,
    type ActiveOrderInfo,
} from '@/lib/ai/tools';

export async function POST(req: Request) {
    const startTime = Date.now();

    try {
        // 1. Detect Tenant
        const tenant = await getTenantFromRequest();
        if (!tenant) {
            return Response.json({
                success: false,
                error: 'Hotel identity required',
            }, { status: 400 });
        }

        // 2. Parse Request
        const body = await req.json();
        const {
            message,
            guestName = 'Guest',
            tableCode = 'Unknown',
            tableId = '',
            cart = [],
            conversationHistory = [],
            language = 'en',
            activeOrderId,
        } = body;

        if (!message || typeof message !== 'string') {
            return Response.json({
                success: false,
                error: 'Message is required',
            }, { status: 400 });
        }

        // 3. Fetch Menu (Tenant Isolated)
        const rawMenuItems = await (prisma.menuItem as any).findMany({
            where: {
                clientId: tenant.id,
                deletedAt: null,
            },
            include: {
                category: true,
            },
        });

        const menuItems: MenuItem[] = rawMenuItems.map((item: any) => ({
            id: item.id,
            name: item.name,
            category: item.category?.name || 'General',
            description: item.description || undefined,
            price: Number(item.price),
            isVeg: Boolean(item.isVeg),
            isAvailable: Boolean(item.isAvailable),
            isChefSpecial: Boolean(item.isChefSpecial),
            isGlutenFree: Boolean(item.isGlutenFree),
            specialPrice: item.specialPrice ? Number(item.specialPrice) : undefined,
            isSpecialPriceActive: Boolean(item.isSpecialPriceActive),
        }));

        // 4. Fetch Active Order Status (Real-time from DB)
        let activeOrder: ActiveOrderInfo | null = null;
        if (activeOrderId) {
            try {
                const order = await prisma.order.findFirst({
                    where: {
                        id: activeOrderId,
                        clientId: tenant.id,
                    },
                    include: {
                        items: {
                            include: {
                                menuItem: { select: { name: true } }
                            }
                        },
                    },
                });

                if (order && order.status !== 'CLOSED' && order.status !== 'CANCELLED') {
                    activeOrder = {
                        id: order.id,
                        status: order.status,
                        createdAt: order.createdAt.toISOString(),
                        items: order.items.map((i: any) => ({
                            id: i.id,
                            itemName: i.itemName || i.menuItem?.name || 'Unknown Item',
                            quantity: i.quantity,
                            status: i.status,
                            price: Number(i.priceSnapshot || 0),
                        })),
                        subtotal: Number(order.subtotal || 0),
                        grandTotal: Number(order.grandTotal || 0),
                    };
                }
            } catch (e) {
                console.error('[AI Concierge] Failed to fetch active order:', e);
            }
        }

        // 5. Build Session State
        const session: SessionState = {
            tableId,
            tableCode,
            guestName,
            language,
            cart: cart as CartItem[],
            activeOrderId,
            activeOrder,
            menuItems,
            hotelName: tenant.name,
        };

        // 6. Build System Prompt with Full Context
        const systemPrompt = buildSystemPrompt(session);

        // 7. Build Conversation Messages (keep last 10 for context)
        const recentHistory = (conversationHistory as any[]).slice(-10);
        const messages = [
            { role: 'system' as const, content: systemPrompt },
            ...recentHistory.map((msg: any) => ({
                role: msg.role as 'user' | 'assistant',
                content: msg.content,
            })),
            { role: 'user' as const, content: message },
        ];

        // 8. Call LLM (auto-selects Ollama/Groq)
        console.log(`[AI Concierge] Processing: "${message.substring(0, 50)}..." for ${tenant.name} | Menu: ${menuItems.length} items | Order: ${activeOrder?.status || 'none'}`);

        const aiResponse = await generateCompletion({
            messages,
            temperature: 0.7,
            maxTokens: 512,
            jsonMode: true,
        });

        console.log(`[AI Concierge] Raw Response (${aiResponse.provider}):`, aiResponse.text);

        // 9. Parse AI Response to extract actions
        const parsed = parseAiResponse(aiResponse.text);
        console.log(`[AI Concierge] Parsed Actions:`, JSON.stringify(parsed.actions));

        // 10. Execute Actions (tool calling)
        const executionResult = executeActions(parsed.actions, session);

        // 11. Return structured response
        // PRIORITIZE Tool Results over AI Chatter
        let finalMessage = parsed.message;
        if (executionResult.actionResults.length > 0) {
            finalMessage = executionResult.actionResults.join('\n');
        }

        return Response.json({
            success: true,
            message: finalMessage,
            actions: parsed.actions,
            updatedCart: executionResult.updatedCart,
            uiCommands: executionResult.uiCommands,
            activeOrder: activeOrder,
            meta: {
                provider: aiResponse.provider,
                model: aiResponse.model,
                latencyMs: aiResponse.latencyMs,
                totalMs: Date.now() - startTime,
                menuItemsCount: menuItems.length,
                hasActiveOrder: !!activeOrder,
            },
        });

    } catch (error: any) {
        console.error('[AI Concierge] Error:', error);

        return Response.json({
            success: true,
            message: "I apologize, I'm having a moment. Could you please try again? 🙏",
            actions: [{ type: 'NONE' }],
            updatedCart: [],
            uiCommands: [],
            meta: {
                error: error.message,
                totalMs: Date.now() - startTime,
            },
        });
    }
}

/**
 * GET /api/ai/concierge — Health check
 */
export async function GET() {
    try {
        const health = await getAiHealth();
        return Response.json({
            success: true,
            ...health,
        });
    } catch (error: any) {
        return Response.json({
            success: false,
            error: error.message,
        }, { status: 500 });
    }
}
