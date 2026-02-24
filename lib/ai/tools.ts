/**
 * AI Tool Calling Engine — The Brain's Hands (Production)
 * 
 * This module defines all the "actions" the AI can request.
 * The AI NEVER touches the database directly.
 * It returns structured intents → this engine executes them safely.
 * 
 * Actions:
 *  - RECOMMEND: Search menu by criteria
 *  - ADD_TO_CART: Add item(s) to session cart (new order)
 *  - ADD_TO_ORDER: Add item(s) to an existing active order (upsell)
 *  - REMOVE_FROM_CART: Remove item from cart
 *  - SHOW_CART: Display current cart
 *  - PLACE_ORDER: Fire cart to kitchen
 *  - CHECK_STATUS: Get real-time order status from DB
 *  - REQUEST_BILL: Request bill
 */

// ============================================
// Types
// ============================================

export interface MenuItem {
    id: string;
    name: string;
    category: string;
    description?: string;
    price: number;
    isVeg: boolean;
    isAvailable: boolean;
    isChefSpecial?: boolean;
    isGlutenFree?: boolean;
    specialPrice?: number;
    isSpecialPriceActive?: boolean;
}

export interface CartItem {
    menuItemId: string;
    name: string;
    price: number;
    quantity: number;
    category: string;
    isVeg: boolean;
}

export interface ActiveOrderInfo {
    id: string;
    status: string;
    createdAt: string;
    items: {
        id: string;
        itemName: string;
        quantity: number;
        status: string;
        price: number;
    }[];
    subtotal: number;
    grandTotal: number;
}

export interface SessionState {
    tableId: string;
    tableCode: string;
    guestName: string;
    language: string;
    cart: CartItem[];
    activeOrderId?: string;
    activeOrder?: ActiveOrderInfo | null;
    menuItems: MenuItem[];
    hotelName: string;
}

export interface AiAction {
    type: 'RECOMMEND' | 'ADD_TO_CART' | 'ADD_TO_ORDER' | 'REMOVE_FROM_CART' | 'SHOW_CART' | 'PLACE_ORDER' | 'CHECK_STATUS' | 'REQUEST_BILL' | 'NONE';
    itemName?: string;
    quantity?: number;
    criteria?: string;
}

export interface AiToolResult {
    response: string;
    actions: AiAction[];
    updatedCart: CartItem[];
    uiCommands: UiCommand[];
}

export interface UiCommand {
    type: 'SHOW_ITEMS' | 'UPDATE_CART' | 'NAVIGATE_ORDER_STATUS' | 'SHOW_BILL' | 'ADD_TO_EXISTING_ORDER' | 'ORDER_STATUS_NARRATION';
    data?: any;
}

// ============================================
// Fuzzy Item Matching
// ============================================

function fuzzyMatchItem(query: string, menuItems: MenuItem[]): MenuItem | null {
    const q = query.toLowerCase().trim();

    // 1. Exact match
    const exact = menuItems.find(i => i.name.toLowerCase() === q);
    if (exact) return exact;

    // 2. Starts with
    const startsWith = menuItems.find(i => i.name.toLowerCase().startsWith(q));
    if (startsWith) return startsWith;

    // 3. Contains all words
    const words = q.split(/\s+/);
    const containsAll = menuItems.find(i => {
        const name = i.name.toLowerCase();
        return words.every(w => name.includes(w));
    });
    if (containsAll) return containsAll;

    // 4. Contains any word (>= 3 chars)
    const significantWords = words.filter(w => w.length >= 3);
    if (significantWords.length > 0) {
        let bestMatch: MenuItem | null = null;
        let bestScore = 0;
        for (const item of menuItems) {
            const name = item.name.toLowerCase();
            const score = significantWords.filter(w => name.includes(w)).length;
            if (score > bestScore) {
                bestScore = score;
                bestMatch = item;
            }
        }
        if (bestMatch && bestScore > 0) return bestMatch;
    }

    return null;
}

// ============================================
// Action Executors
// ============================================

function executeRecommend(criteria: string | undefined, session: SessionState): { items: MenuItem[]; text: string } {
    const available = session.menuItems.filter(i => i.isAvailable);
    const c = (criteria || '').toLowerCase().trim();

    if (!c) {
        const specials = available.filter(i => i.isChefSpecial);
        return {
            items: (specials.length > 0 ? specials : available).slice(0, 5),
            text: "Here are some of our chef's signature dishes I highly recommend:"
        };
    }

    let filtered = available;

    // 1. Veg/Non-veg filters
    if (c.includes('veg') && !c.includes('non')) {
        filtered = filtered.filter(i => i.isVeg);
    } else if (c.includes('non-veg') || c.includes('nonveg') || c.includes('non veg')) {
        filtered = filtered.filter(i => !i.isVeg);
    }

    if (c.includes('spic')) {
        filtered = filtered.filter(i =>
            i.description?.toLowerCase().includes('spic') ||
            i.category.toLowerCase().includes('main') ||
            i.category.toLowerCase().includes('starter')
        );
    }

    // 2. Category / Meal-time Intelligent Matching
    const categories = Array.from(new Set(available.map(i => i.category.toLowerCase())));
    const matchedCategory = categories.find(cat => c.includes(cat) || cat.includes(c));

    if (matchedCategory) {
        filtered = filtered.filter(i => i.category.toLowerCase() === matchedCategory);
    } else if (c.includes('breakfast') || c.includes('morning')) {
        filtered = filtered.filter(i =>
            i.category.toLowerCase().includes('breakfast') ||
            i.category.toLowerCase().includes('morning') ||
            i.name.toLowerCase().includes('poha') ||
            i.name.toLowerCase().includes('idli') ||
            i.name.toLowerCase().includes('dosa') ||
            i.name.toLowerCase().includes('omelette') ||
            i.name.toLowerCase().includes('paratha')
        );
    } else if (c.includes('lunch') || c.includes('dinner') || c.includes('meal')) {
        filtered = filtered.filter(i =>
            i.category.toLowerCase().includes('main') ||
            i.category.toLowerCase().includes('thali') ||
            i.category.toLowerCase().includes('rice') ||
            i.category.toLowerCase().includes('biryani')
        );
    } else if (c.includes('sweet') || c.includes('dessert') || c.includes('mithai')) {
        filtered = filtered.filter(i =>
            i.category.toLowerCase().includes('dessert') ||
            i.description?.toLowerCase().includes('sweet')
        );
    } else if (c.includes('drink') || c.includes('beverage') || c.includes('juice') || c.includes('chai') || c.includes('coffee')) {
        filtered = filtered.filter(i =>
            i.category.toLowerCase().includes('drink') ||
            i.category.toLowerCase().includes('beverage')
        );
    } else if (c.includes('chef') || c.includes('special') || c.includes('best') || c.includes('popular') || c.includes('top')) {
        filtered = filtered.filter(i => i.isChefSpecial);
        if (filtered.length === 0) filtered = available.slice(0, 5);
    } else if (c.includes('gluten') || c.includes('gf')) {
        filtered = filtered.filter(i => i.isGlutenFree);
    } else if (c.length > 2) {
        // Generic keyword search
        const keywords = c.split(/\s+/).filter(w => w.length > 2);
        if (keywords.length > 0) {
            filtered = filtered.filter(i => {
                const searchStr = `${i.name} ${i.category} ${i.description || ''}`.toLowerCase();
                return keywords.some(k => searchStr.includes(k));
            });
        }
    }

    // Budget filter
    const budgetMatch = c.match(/under\s*(\d+)|below\s*(\d+)|budget\s*(\d+)/);
    if (budgetMatch) {
        const maxPrice = parseInt(budgetMatch[1] || budgetMatch[2] || budgetMatch[3]);
        filtered = filtered.filter(i => i.price <= maxPrice);
    }

    // Fallback
    if (filtered.length === available.length && c.length > 0) {
        const specials = filtered.filter(i => i.isChefSpecial);
        if (specials.length > 0) filtered = specials;
    }

    const results = filtered.slice(0, 5);

    if (results.length === 0) {
        const fallback = available.filter(i => i.isChefSpecial).slice(0, 3);
        return {
            items: fallback.length > 0 ? fallback : available.slice(0, 3),
            text: `I couldn't find exact matches for "${c}", but may I suggest these house specials?`
        };
    }

    return {
        items: results,
        text: `Based on your interest in "${c}", here are my humble recommendations:`
    };
}

function executeAddToCart(
    itemName: string,
    quantity: number,
    session: SessionState
): { success: boolean; item?: MenuItem; cart: CartItem[]; text: string } {
    const matched = fuzzyMatchItem(itemName, session.menuItems);

    if (!matched) {
        return {
            success: false,
            cart: session.cart,
            text: `I couldn't find "${itemName}" on our menu. Could you try a different name?`
        };
    }

    if (!matched.isAvailable) {
        return {
            success: false,
            cart: session.cart,
            text: `Sorry, ${matched.name} is currently unavailable. May I suggest something similar?`
        };
    }

    const updatedCart = [...session.cart];
    const existing = updatedCart.find(c => c.menuItemId === matched.id);
    const effectivePrice = (matched.isSpecialPriceActive && matched.specialPrice) ? matched.specialPrice : matched.price;

    if (existing) {
        existing.quantity += quantity;
    } else {
        updatedCart.push({
            menuItemId: matched.id,
            name: matched.name,
            price: effectivePrice,
            quantity: quantity,
            category: matched.category,
            isVeg: matched.isVeg,
        });
    }

    return {
        success: true,
        item: matched,
        cart: updatedCart,
        text: `Added ${quantity}× ${matched.name} (₹${effectivePrice}) to your selection.`
    };
}

function executeRemoveFromCart(
    itemName: string,
    session: SessionState
): { cart: CartItem[]; text: string } {
    const q = itemName.toLowerCase().trim();
    const updatedCart = session.cart.filter(c =>
        !c.name.toLowerCase().includes(q)
    );

    if (updatedCart.length === session.cart.length) {
        return {
            cart: session.cart,
            text: `I couldn't find "${itemName}" in your current selection.`
        };
    }

    return {
        cart: updatedCart,
        text: `Removed ${itemName} from your selection.`
    };
}

function showCart(session: SessionState): { text: string; total: number } {
    if (session.cart.length === 0) {
        return { text: "Your selection is currently empty. Would you like me to recommend something?", total: 0 };
    }

    const lines = session.cart.map(c =>
        `• ${c.quantity}× ${c.name} — ₹${c.price * c.quantity}`
    );
    const total = session.cart.reduce((s, c) => s + c.price * c.quantity, 0);

    return {
        text: `Here's your current selection:\n${lines.join('\n')}\n\nTotal: ₹${total}\n\nWould you like to add anything else or shall I send this to the kitchen?`,
        total,
    };
}

function narrateOrderStatus(session: SessionState): string {
    const order = session.activeOrder;
    if (!order) return "You don't have an active order at the moment. Would you like to place one?";

    const statusMap: Record<string, string> = {
        'NEW': 'received and is waiting for the kitchen to pick it up',
        'PREPARING': 'being prepared by our chefs right now',
        'READY': 'ready and being plated for you',
        'SERVED': 'served. I hope you are enjoying your meal',
        'BILL_REQUESTED': 'served and we are preparing your bill',
        'CLOSED': 'completed. Thank you for dining with us',
        'CANCELLED': 'cancelled',
    };

    const statusDesc = statusMap[order.status] || 'being processed';

    // Build per-item status
    const itemLines = order.items
        .filter(i => i.status !== 'CANCELLED')
        .map(i => {
            const itemStatusMap: Record<string, string> = {
                'PENDING': '⏳ Waiting',
                'PREPARING': '🔥 Cooking',
                'READY': '✅ Ready',
                'SERVED': '🍽️ Served',
            };
            return `${i.quantity}× ${i.itemName} — ${itemStatusMap[i.status] || i.status}`;
        });

    return `Your order has been ${statusDesc}.\n\n${itemLines.join('\n')}\n\nOrder Total: ₹${order.grandTotal}`;
}

// ============================================
// System Prompt Builder (Production-Grade)
// ============================================

export function buildSystemPrompt(session: SessionState): string {
    const menuByCategory: Record<string, MenuItem[]> = {};
    for (const item of session.menuItems.filter(i => i.isAvailable)) {
        if (!menuByCategory[item.category]) menuByCategory[item.category] = [];
        menuByCategory[item.category].push(item);
    }

    const menuText = Object.entries(menuByCategory)
        .map(([cat, items]) => {
            const itemLines = items.map(i => {
                const tags = [];
                if (i.isVeg) tags.push('🟢 VEG');
                else tags.push('🔴 NON-VEG');
                if (i.isChefSpecial) tags.push('⭐ BESTSELLER');
                if (i.isGlutenFree) tags.push('GF');
                const priceStr = (i.isSpecialPriceActive && i.specialPrice)
                    ? `₹${i.specialPrice} (was ₹${i.price})`
                    : `₹${i.price}`;
                return `  - ${i.name} | ${priceStr} | ${tags.join(', ')}${i.description ? ' | ' + i.description : ''}`;
            }).join('\n');
            return `[${cat}]\n${itemLines}`;
        })
        .join('\n\n');

    const cartText = session.cart.length > 0
        ? session.cart.map(c => `  - ${c.quantity}× ${c.name} (₹${c.price * c.quantity})`).join('\n')
        : '  (empty)';

    const cartTotal = session.cart.reduce((s, c) => s + c.price * c.quantity, 0);

    // Build active order context
    let orderContext = 'No active order.';
    if (session.activeOrder) {
        const o = session.activeOrder;
        const statusLabel: Record<string, string> = {
            'NEW': '📋 Ordered (waiting for kitchen)',
            'PREPARING': '🔥 Kitchen is cooking',
            'READY': '✅ Food is ready',
            'SERVED': '🍽️ Food has been served',
            'BILL_REQUESTED': '💳 Bill requested',
        };
        const itemLines = o.items
            .filter(i => i.status !== 'CANCELLED')
            .map(i => `    ${i.quantity}× ${i.itemName} — ${i.status}`)
            .join('\n');
        orderContext = `Active Order (${o.id.slice(0, 8)}):\n  Status: ${statusLabel[o.status] || o.status}\n  Items:\n${itemLines}\n  Total: ₹${o.grandTotal}`;
    }

    return `You are "The Master Waiter", an elite AI dining concierge for "${session.hotelName}".

CONTEXT:
- Guest: ${session.guestName || 'Sir/Madam'}
- Table: ${session.tableCode}
- Hotel: ${session.hotelName}

COMPLETE MENU:
${menuText}

CURRENT DRAFT SELECTION:
${cartText}

LIVE ORDER STATUS:
${orderContext}

CRITICAL RULES:
1. You are a JSON-generating engine.
2. You must output a single valid JSON object.
3. DO NOT output any text, markdown, or code blocks before or after the JSON.
4. If the user asks for a recommendation, use "RECOMMEND" action.
5. If the user wants to order, use "ADD_TO_CART" action.

RESPONSE FORMAT:
{
  "message": "Your conversational response to the guest (keep it polite and brief)",
  "actions": [
    { "type": "ACTION_TYPE", "itemName": "Exact Name From Menu", "quantity": 1, "criteria": "search term" }
  ]
}

ACTION TYPES:
- "RECOMMEND": Suggest items (Use when user asks "what is good?", "suggest something", "show me menu", "what do you have?").
- "ADD_TO_CART": Add items to draft (Use when user says "add", "I want", "order", "bring me").
- "ADD_TO_ORDER": Add items to active order (Use ONLY if active order exists).
- "REMOVE_FROM_CART": Remove from draft.
- "SHOW_CART": Show current draft.
- "PLACE_ORDER": User confirms to send draft to kitchen.
- "CHECK_STATUS": Check active order.
- "REQUEST_BILL": Request bill.
- "NONE": General conversation.
`;
}

// ============================================
// Parse AI Response
// ============================================

export function parseAiResponse(rawText: string): { message: string; actions: AiAction[] } {
    try {
        let cleaned = rawText.trim();

        // 1. Try to find the first JSON object
        const firstOpen = cleaned.indexOf('{');
        const lastClose = cleaned.lastIndexOf('}');

        if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
            cleaned = cleaned.substring(firstOpen, lastClose + 1);
            try {
                const parsed = JSON.parse(cleaned);
                return {
                    message: parsed.message || parsed.response || "Here is what I found.",
                    actions: Array.isArray(parsed.actions) ? parsed.actions : [],
                };
            } catch (e) {
                console.error("JSON parse failed on substring:", cleaned);
            }
        }

        // 2. If simple JSON parsing fails, try to repair common issues
        // Sometimes AI adds comments or trailing commas
        cleaned = cleaned.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
        try {
            const parsed = JSON.parse(cleaned);
            return {
                message: parsed.message || parsed.response || "Here is what I found.",
                actions: Array.isArray(parsed.actions) ? parsed.actions : [],
            };
        } catch (e) {
            // checking for python style False/True
            cleaned = cleaned.replace(/False/g, 'false').replace(/True/g, 'true');
            try {
                const parsed = JSON.parse(cleaned);
                return {
                    message: parsed.message || parsed.response || "Here is what I found.",
                    actions: Array.isArray(parsed.actions) ? parsed.actions : [],
                };
            } catch (e2) { }
        }

        // 3. Fallback: Treat as plain text response with no actions
        console.warn("AI didn't return valid JSON. Generating plain response.");
        return {
            message: rawText,
            actions: [{ type: 'NONE' }],
        };

    } catch (error) {
        console.error("Critical parse error:", error);
        return {
            message: rawText,
            actions: [{ type: 'NONE' }],
        };
    }
}

// ============================================
// Execute All Actions
// ============================================

export function executeActions(
    actions: AiAction[],
    session: SessionState
): { updatedCart: CartItem[]; uiCommands: UiCommand[]; actionResults: string[] } {
    let cart = [...session.cart];
    const uiCommands: UiCommand[] = [];
    const actionResults: string[] = [];

    for (const action of actions) {
        switch (action.type) {
            case 'RECOMMEND': {
                const result = executeRecommend(action.criteria, { ...session, cart });
                uiCommands.push({
                    type: 'SHOW_ITEMS',
                    data: result.items.map(i => ({
                        id: i.id,
                        name: i.name,
                        price: i.price,
                        category: i.category,
                        isVeg: i.isVeg,
                        isChefSpecial: i.isChefSpecial,
                        description: i.description,
                    })),
                });
                actionResults.push(result.text);
                break;
            }
            case 'ADD_TO_CART': {
                if (action.itemName) {
                    const result = executeAddToCart(
                        action.itemName,
                        action.quantity || 1,
                        { ...session, cart }
                    );
                    cart = result.cart;
                    uiCommands.push({ type: 'UPDATE_CART', data: cart });
                    actionResults.push(result.text);
                }
                break;
            }
            case 'ADD_TO_ORDER': {
                // Signal the frontend to add items to existing order via API
                if (action.itemName) {
                    const matched = fuzzyMatchItem(action.itemName, session.menuItems);
                    if (matched && matched.isAvailable) {
                        uiCommands.push({
                            type: 'ADD_TO_EXISTING_ORDER',
                            data: {
                                menuItemId: matched.id,
                                name: matched.name,
                                quantity: action.quantity || 1,
                                price: matched.price,
                            }
                        });
                        actionResults.push(`Adding ${action.quantity || 1}× ${matched.name} to your active order.`);
                    } else {
                        actionResults.push(`Sorry, I couldn't find "${action.itemName}" or it's currently unavailable.`);
                    }
                }
                break;
            }
            case 'REMOVE_FROM_CART': {
                if (action.itemName) {
                    const result = executeRemoveFromCart(action.itemName, { ...session, cart });
                    cart = result.cart;
                    uiCommands.push({ type: 'UPDATE_CART', data: cart });
                    actionResults.push(result.text);
                }
                break;
            }
            case 'SHOW_CART': {
                const result = showCart({ ...session, cart });
                uiCommands.push({ type: 'UPDATE_CART', data: cart });
                actionResults.push(result.text);
                break;
            }
            case 'PLACE_ORDER': {
                uiCommands.push({ type: 'NAVIGATE_ORDER_STATUS' });
                actionResults.push('Order placement initiated.');
                break;
            }
            case 'CHECK_STATUS': {
                const narration = narrateOrderStatus(session);
                uiCommands.push({ type: 'ORDER_STATUS_NARRATION', data: narration });
                actionResults.push(narration);
                break;
            }
            case 'REQUEST_BILL': {
                uiCommands.push({ type: 'SHOW_BILL' });
                actionResults.push('Bill request sent to cashier.');
                break;
            }
            case 'NONE':
            default:
                break;
        }
    }

    return { updatedCart: cart, uiCommands, actionResults };
}
