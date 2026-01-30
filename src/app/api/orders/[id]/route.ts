/**
 * Single Order API
 * 
 * GET /api/orders/[id] - Get order details
 * PATCH /api/orders/[id] - Update order status
 */

import { NextRequest, NextResponse } from "next/server";
import {
    getOrderById,
    updateOrderStatus,
    OrderError,
} from "@/lib/services/order";
import { verifyToken } from "@/lib/auth";
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
    items: OrderItemResponse[];
    total: number;
    createdAt: string;
    closedAt?: string;
}

interface OrderSuccessResponse {
    success: true;
    order: OrderResponse;
}

interface OrderErrorResponse {
    success: false;
    error: string;
    code?: string;
}

// ============================================
// GET /api/orders/[id] - Get Order Details
// ============================================

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<OrderSuccessResponse | OrderErrorResponse>> {
    try {
        const { id } = await params;

        const order = await getOrderById(id);

        if (!order) {
            return NextResponse.json(
                { success: false, error: "Order not found", code: "ORDER_NOT_FOUND" },
                { status: 404 }
            );
        }

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
            closedAt: order.closedAt?.toISOString(),
        };

        return NextResponse.json({
            success: true,
            order: response,
        });
    } catch (error) {
        console.error("[ORDER API] Error fetching order:", error);

        return NextResponse.json(
            { success: false, error: "Failed to fetch order" },
            { status: 500 }
        );
    }
}

// ============================================
// PATCH /api/orders/[id] - Update Order Status
// ============================================

/**
 * Update order status.
 * 
 * Used by:
 * - Kitchen: NEW → PREPARING → READY
 * - Waiter: READY → SERVED
 * - Cashier: SERVED → CLOSED
 * 
 * Request Body:
 * {
 *   status: "PREPARING" | "READY" | "SERVED" | "CLOSED",
 *   version: number  // For optimistic locking
 * }
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<OrderSuccessResponse | OrderErrorResponse>> {
    try {
        const { id } = await params;

        // Get actor ID from token (optional - for audit)
        let actorId: string | undefined;
        const token = request.cookies.get("auth-token")?.value;
        if (token) {
            try {
                const payload = await verifyToken(token);
                actorId = payload.sub;
            } catch {
                // Token invalid, continue without actor
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

        const { status, version } = body as { status: OrderStatus; version: number };

        // Validate status
        const validStatuses: OrderStatus[] = ["NEW", "PREPARING", "READY", "SERVED", "BILL_REQUESTED", "CLOSED"];
        if (!status || !validStatuses.includes(status)) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
                    code: "INVALID_INPUT",
                },
                { status: 400 }
            );
        }

        // Validate version
        if (typeof version !== "number") {
            return NextResponse.json(
                {
                    success: false,
                    error: "version is required for optimistic locking",
                    code: "INVALID_INPUT",
                },
                { status: 400 }
            );
        }

        // Update order
        const order = await updateOrderStatus(id, status, version, actorId);

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
            closedAt: order.closedAt?.toISOString(),
        };

        console.log(`[ORDER API] Order ${id} status updated to ${status}`);

        return NextResponse.json({
            success: true,
            order: response,
        });
    } catch (error) {
        // Handle known order errors
        if (error instanceof OrderError) {
            const statusMap: Record<string, number> = {
                ORDER_NOT_FOUND: 404,
                VERSION_CONFLICT: 409,
                INVALID_TRANSITION: 400,
            };

            return NextResponse.json(
                { success: false, error: error.message, code: error.code },
                { status: statusMap[error.code] || 400 }
            );
        }

        console.error("[ORDER API] Error updating order:", error);

        return NextResponse.json(
            { success: false, error: "Failed to update order" },
            { status: 500 }
        );
    }
}
