
import { NextRequest, NextResponse } from "next/server";
import {
    getOrderById,
    updateOrderStatus,
    cancelOrder,
    OrderError,
} from "@/lib/services/order";
import { verifyToken } from "@/lib/auth";
import { getTenantFromRequest } from "@/lib/tenant";
import { getDb } from "@/lib/db";
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

        // 1. Detect Tenant (Multi-Tenancy)
        const tenant = await getTenantFromRequest();
        if (!tenant) {
            return NextResponse.json(
                { success: false, error: "Hotel not identified. Please enter your access code first.", code: "AUTH_REQUIRED" },
                { status: 401 }
            );
        }

        const db = getDb();
        const order = await getOrderById(id, tenant.id, db);

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

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<OrderSuccessResponse | OrderErrorResponse>> {
    try {
        const { id } = await params;

        // 1. Detect Tenant (Multi-Tenancy)
        const tenant = await getTenantFromRequest();
        if (!tenant) {
            return NextResponse.json(
                { success: false, error: "Authentication required", code: "AUTH_REQUIRED" },
                { status: 401 }
            );
        }

        const db = getDb();

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

        const {
            status,
            version,
            customerName,
            customerPhone,
            subtotal,
            discountAmount,
            gstAmount,
            serviceChargeAmount,
            grandTotal,
            appliedGstRate
        } = body;

        console.log(`[ORDER API] Payload for ${id}:`, { status, subtotal, gstAmount, grandTotal });

        // ...

        // Update order
        const order = await updateOrderStatus(
            id,
            status,
            version,
            tenant.id,
            actorId,
            customerName,
            customerPhone,
            db,
            {
                subtotal,
                discountAmount,
                gstAmount,
                serviceChargeAmount,
                grandTotal,
                appliedGstRate
            }
        );

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

// ============================================
// DELETE /api/orders/[id] - Cancel Entire Order
// ============================================

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<OrderSuccessResponse | OrderErrorResponse>> {
    try {
        const { id } = await params;

        // 1. Detect Tenant
        const tenant = await getTenantFromRequest();
        if (!tenant) {
            return NextResponse.json(
                { success: false, error: "Authentication required" },
                { status: 401 }
            );
        }

        const db = getDb();

        // 2. Cancel Order
        await cancelOrder(id, tenant.id, undefined, db);

        return NextResponse.json({
            success: true,
            order: {} as any
        });
    } catch (error) {
        if (error instanceof OrderError) {
            return NextResponse.json(
                { success: false, error: error.message, code: error.code },
                { status: 400 }
            );
        }
        console.error("[ORDER API] Error cancelling order:", error);
        return NextResponse.json(
            { success: false, error: "Failed to cancel order" },
            { status: 500 }
        );
    }
}
