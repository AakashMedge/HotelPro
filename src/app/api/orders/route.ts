/**
 * Orders API
 * 
 * POST /api/orders - Create a new order (customer)
 * GET /api/orders - Get orders (staff)
 * 
 * This is the HEART of the POS system.
 */

import { NextRequest, NextResponse } from "next/server";
import {
    createOrder,
    getOrdersByStatus,
    OrderError,
    type CreateOrderInput,
} from "@/lib/services/order";
import { prisma } from "@/lib/db";
import type { OrderStatus } from "@/generated/prisma";

// ============================================
// Response Types
// ============================================

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
    customerName: string | null;
    items: OrderItemResponse[];
    total: number;
    createdAt: string;
}

interface CreateOrderSuccessResponse {
    success: true;
    order: OrderResponse;
}

interface OrderErrorResponse {
    success: false;
    error: string;
    code?: string;
}

interface OrdersListResponse {
    success: boolean;
    orders?: OrderResponse[];
    error?: string;
}

// ============================================
// POST /api/orders - Create Order
// ============================================

/**
 * Create a new order.
 * 
 * Customer scans QR → selects items → submits order.
 * 
 * Request Body:
 * {
 *   tableId: string,
 *   items: [{ menuItemId: string, quantity: number }]
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   order: { id, tableCode, status, items, total, createdAt }
 * }
 */
export async function POST(
    request: NextRequest
): Promise<NextResponse<CreateOrderSuccessResponse | OrderErrorResponse>> {
    try {
        // Parse request body
        const body = await request.json().catch(() => null);

        if (!body) {
            return NextResponse.json(
                { success: false, error: "Invalid request body" },
                { status: 400 }
            );
        }

        // Validate required fields
        const { tableId, tableCode, items, customerName } = body as any;

        let resolvedTableId = tableId;

        // Auto-resolve tableId from tableCode if missing (Magic Demo Mode)
        if (!resolvedTableId && tableCode) {
            console.log(`[ORDERS API] Attempting to resolve tableCode: ${tableCode}`);
            const table = await prisma.table.findFirst({
                where: {
                    OR: [
                        { tableCode: String(tableCode) },
                        { tableCode: `T-${String(tableCode).padStart(2, '0')}` }
                    ]
                }
            });

            if (table) {
                resolvedTableId = table.id;
            } else {
                // Create table on the fly for demo if it doesn't exist
                const newTable = await prisma.table.create({
                    data: {
                        tableCode: String(tableCode).startsWith('T-') ? tableCode : `T-${String(tableCode).padStart(2, '0')}`,
                        capacity: 4,
                        status: 'ACTIVE'
                    }
                });
                resolvedTableId = newTable.id;
            }
        }

        if (!resolvedTableId || typeof resolvedTableId !== "string") {
            return NextResponse.json(
                { success: false, error: "tableId or tableCode is required", code: "INVALID_INPUT" },
                { status: 400 }
            );
        }

        if (!Array.isArray(items) || items.length === 0) {
            return NextResponse.json(
                { success: false, error: "At least one item is required", code: "INVALID_INPUT" },
                { status: 400 }
            );
        }

        // Validate each item
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

        // Create order via service
        const order = await createOrder({ tableId: resolvedTableId, items, customerName });

        // Calculate total
        const total = order.items.reduce((sum, item) => {
            return sum + Number(item.priceSnapshot) * item.quantity;
        }, 0);

        // Format response
        const response: OrderResponse = {
            id: order.id,
            tableId: order.tableId,
            tableCode: order.table.tableCode,
            status: order.status,
            version: order.version,
            customerName: order.customerName,
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

        console.log(`[ORDERS API] Order created: ${order.id} for table ${order.table.tableCode}`);

        return NextResponse.json({
            success: true,
            order: response,
        });
    } catch (error) {
        // Handle known order errors
        if (error instanceof OrderError) {
            const statusMap: Record<string, number> = {
                INVALID_INPUT: 400,
                TABLE_NOT_FOUND: 404,
                TABLE_DELETED: 404,
                MENU_ITEM_NOT_FOUND: 404,
                MENU_ITEM_UNAVAILABLE: 400,
            };

            return NextResponse.json(
                { success: false, error: error.message, code: error.code },
                { status: statusMap[error.code] || 400 }
            );
        }

        console.error("[ORDERS API] Error creating order:", error);

        return NextResponse.json(
            { success: false, error: "Failed to create order" },
            { status: 500 }
        );
    }
}

// ============================================
// GET /api/orders - List Orders
// ============================================

/**
 * Get orders, optionally filtered by status.
 * 
 * Query params:
 * - status: comma-separated list (e.g., "NEW,PREPARING")
 * - limit: max number of orders
 * 
 * Used by:
 * - Kitchen: status=NEW,PREPARING
 * - Waiter: status=READY,SERVED
 * - Cashier: status=SERVED
 */
export async function GET(
    request: NextRequest
): Promise<NextResponse<OrdersListResponse>> {
    try {
        const { searchParams } = new URL(request.url);

        // Parse status filter
        const statusParam = searchParams.get("status");
        const statuses: OrderStatus[] = statusParam
            ? (statusParam.split(",") as OrderStatus[])
            : ["NEW", "PREPARING", "READY", "SERVED"];

        // Parse limit
        const limitParam = searchParams.get("limit");
        const limit = limitParam ? parseInt(limitParam, 10) : 50;

        // Fetch orders
        const orders = await getOrdersByStatus(statuses, { limit });

        // Format response
        const formattedOrders: OrderResponse[] = orders.map((order) => {
            const total = order.items.reduce((sum, item) => {
                return sum + Number(item.priceSnapshot) * item.quantity;
            }, 0);

            return {
                id: order.id,
                tableId: order.tableId,
                tableCode: order.table.tableCode,
                status: order.status,
                version: order.version,
                customerName: order.customerName,
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
        });

        return NextResponse.json({
            success: true,
            orders: formattedOrders,
        });
    } catch (error) {
        console.error("[ORDERS API] Error fetching orders:", error);

        return NextResponse.json(
            { success: false, error: "Failed to fetch orders" },
            { status: 500 }
        );
    }
}
