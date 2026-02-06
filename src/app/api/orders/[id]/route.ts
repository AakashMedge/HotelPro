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
import type { OrderStatus } from "@prisma/client";

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
    total: number; // For backward compatibility
    subtotal: number;
    gstAmount: number;
    serviceChargeAmount: number;
    grandTotal: number;
    createdAt: string;
    closedAt?: string;
    customerName: string | null;
    sessionId: string | null;
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
            total: Number((order as any).grandTotal || total),
            subtotal: Number((order as any).subtotal || total),
            gstAmount: Number((order as any).gstAmount || 0),
            serviceChargeAmount: Number((order as any).serviceChargeAmount || 0),
            grandTotal: Number((order as any).grandTotal || total),
            createdAt: order.createdAt.toISOString(),
            closedAt: order.closedAt?.toISOString(),
            customerName: order.customerName,
            sessionId: order.sessionId,
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

        const { status, version, customerName } = body as { status: OrderStatus; version: number; customerName?: string };

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

        // Update order (now supports customerName for billing flow)
        const order = await updateOrderStatus(id, status, version, actorId, customerName);

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
            subtotal: Number((order as any).subtotal || total),
            gstAmount: Number((order as any).gstAmount || 0),
            serviceChargeAmount: Number((order as any).serviceChargeAmount || 0),
            grandTotal: Number((order as any).grandTotal || total),
            createdAt: order.createdAt.toISOString(),
            closedAt: order.closedAt?.toISOString(),
            customerName: order.customerName,
            sessionId: order.sessionId,
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
