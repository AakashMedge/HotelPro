/**
 * Order Items API
 * 
 * POST /api/orders/[id]/items - Add items to existing order
 * 
 * Used by waiters to add upsells or additional items to an order.
 */

import { NextRequest, NextResponse } from "next/server";
import { addItemsToOrder, OrderError } from "@/lib/services/order";
import { verifyToken } from "@/lib/auth";
import { getTenantFromRequest } from "@/lib/tenant";
import { getDb } from "@/lib/db";

interface OrderItemResponse {
    id: string;
    menuItemId: string;
    itemName: string;
    price: number;
    quantity: number;
    status: string;
}

interface OrderResponse {
    id: string;
    tableId: string;
    tableCode: string;
    status: string;
    version: number;
    items: OrderItemResponse[];
    total: number;
    createdAt: string;
}

interface SuccessResponse {
    success: true;
    order: OrderResponse;
}

interface ErrorResponse {
    success: false;
    error: string;
    code?: string;
}

/**
 * POST /api/orders/[id]/items
 * 
 * Add items to an existing order.
 * 
 * Request Body:
 * {
 *   items: [{ menuItemId: string, quantity: number }]
 * }
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<SuccessResponse | ErrorResponse>> {
    try {
        const { id: orderId } = await params;

        // 1. Detect Tenant (Multi-Tenancy)
        const tenant = await getTenantFromRequest();
        if (!tenant) {
            return NextResponse.json(
                { success: false, error: "Authentication required", code: "AUTH_REQUIRED" },
                { status: 401 }
            );
        }

        // Get actor ID from token
        let actorId: string | undefined;
        const token = request.cookies.get("auth-token")?.value;
        if (token) {
            try {
                const payload = await verifyToken(token);
                actorId = payload.sub;
            } catch {
                // Continue without actor
            }
        }

        // Parse body
        const body = await request.json().catch(() => null);

        if (!body) {
            return NextResponse.json(
                { success: false, error: "Invalid request body" },
                { status: 400 }
            );
        }

        const { items } = body as { items: { menuItemId: string; quantity: number }[] };

        // Validate items
        if (!Array.isArray(items) || items.length === 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: "At least one item is required",
                    code: "INVALID_INPUT",
                },
                { status: 400 }
            );
        }

        for (const item of items) {
            if (!item.menuItemId || typeof item.quantity !== "number" || item.quantity < 1) {
                return NextResponse.json(
                    {
                        success: false,
                        error: "Each item must have menuItemId and quantity >= 1",
                        code: "INVALID_INPUT",
                    },
                    { status: 400 }
                );
            }
        }

        const db = getDb();

        // Add items to order
        const order = await addItemsToOrder(orderId, items, tenant.id, actorId, db);

        // Calculate total
        const total = order.items.reduce((sum, item) => {
            return sum + Number(item.priceSnapshot) * item.quantity;
        }, 0);

        const response: OrderResponse = {
            id: order.id,
            tableId: order.tableId,
            tableCode: order.table.tableCode,
            status: order.status,
            version: order.version,
            items: order.items.map((item) => ({
                id: item.id,
                menuItemId: item.menuItemId,
                itemName: item.itemName,
                price: Number(item.priceSnapshot),
                quantity: item.quantity,
                status: item.status,
            })),
            total,
            createdAt: order.createdAt.toISOString(),
        };

        console.log(`[ORDER ITEMS API] Added ${items.length} items to order ${orderId}`);

        return NextResponse.json({
            success: true,
            order: response,
        });
    } catch (error) {
        if (error instanceof OrderError) {
            const statusMap: Record<string, number> = {
                ORDER_NOT_FOUND: 404,
                ORDER_CLOSED: 400,
                MENU_ITEM_UNAVAILABLE: 400,
                INVALID_INPUT: 400,
            };

            return NextResponse.json(
                { success: false, error: error.message, code: error.code },
                { status: statusMap[error.code] || 400 }
            );
        }

        console.error("[ORDER ITEMS API] Error adding items:", error);

        return NextResponse.json(
            { success: false, error: "Failed to add items to order" },
            { status: 500 }
        );
    }
}
