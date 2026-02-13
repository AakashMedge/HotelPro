/**
 * Orders API — Real-time POS Core
 * 
 * POST /api/orders - Create a new order (customer)
 * GET /api/orders - Get orders (staff)
 * 
 * This is the HEART of the POS system.
 */

import { aj } from "@/lib/arcjet";
import { NextRequest, NextResponse } from "next/server";
import {
    createOrder,
    getOrdersByStatus,
    OrderError,
    type CreateOrderInput,
} from "@/lib/services/order";
import { prisma, getDb } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";
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
    selectedVariant?: any;
    selectedModifiers?: any;
    notes?: string | null;
}

interface OrderResponse {
    id: string;
    tableId: string;
    tableCode: string;
    status: string;
    version: number;
    customerName: string | null;
    customerPhone?: string | null;
    items: OrderItemResponse[];
    total: number;
    subtotal: number;
    gstAmount: number;
    serviceChargeAmount: number;
    grandTotal: number;
    createdAt: string;
    closedAt?: string;
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

export async function POST(
    request: NextRequest
): Promise<NextResponse<CreateOrderSuccessResponse | OrderErrorResponse>> {
    // 0. Security Layer: Arcjet
    const decision = await aj.protect(request);
    if (decision.isDenied()) {
        if (decision.reason.isRateLimit()) {
            return NextResponse.json({ success: false, error: "Too many requests. Please slow down." }, { status: 429 });
        }
        if (decision.reason.isBot()) {
            return NextResponse.json({ success: false, error: "Bots are not allowed." }, { status: 403 });
        }
        return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    try {
        const body = await request.json().catch(() => null);

        if (!body) {
            return NextResponse.json(
                { success: false, error: "Invalid request body" },
                { status: 400 }
            );
        }

        const { tableId, tableCode, items, customerName, sessionId } = body as any;

        // 1. Detect Tenant (Multi-Tenancy) — Strict Resolution, No Fallbacks
        const tenant = await getTenantFromRequest();

        if (!tenant) {
            return NextResponse.json(
                { success: false, error: "Hotel not identified. Please enter your hotel access code first." },
                { status: 401 }
            );
        }

        const db = prisma;

        let resolvedTableId = tableId;

        // Auto-resolve tableId from tableCode if missing (Magic Demo Mode)
        if (!resolvedTableId && tableCode) {
            console.log(`[ORDERS API] Attempting to resolve tableCode: ${tableCode} for client ${tenant.slug}`);
            const table = await db.table.findFirst({
                where: {
                    clientId: tenant.id,
                    OR: [
                        { tableCode: String(tableCode) },
                        { tableCode: `T-${String(tableCode).padStart(2, '0')}` }
                    ]
                }
            });

            if (table) {
                resolvedTableId = table.id;
            } else {
                const newTable = await db.table.create({
                    data: {
                        clientId: tenant.id,
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

        const order = await createOrder({
            tableId: resolvedTableId,
            items,
            customerName,
            sessionId,
            clientId: tenant.id,
            db // Pass the routed DB
        });

        const total = order.items.reduce((sum, item) => {
            return sum + Number(item.priceSnapshot) * item.quantity;
        }, 0);

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
                selectedVariant: item.selectedVariant,
                selectedModifiers: item.selectedModifiers,
                notes: item.notes
            })),
            total: Number((order as any).grandTotal || total),
            subtotal: Number((order as any).subtotal || total),
            gstAmount: Number((order as any).gstAmount || 0),
            serviceChargeAmount: Number((order as any).serviceChargeAmount || 0),
            grandTotal: Number((order as any).grandTotal || total),
            createdAt: order.createdAt.toISOString(),
        };

        return NextResponse.json({
            success: true,
            order: response,
        });
    } catch (error) {
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

export async function GET(
    request: NextRequest
): Promise<NextResponse<OrdersListResponse>> {
    try {
        // 1. Detect Tenant (Multi-Tenancy)
        const tenant = await getTenantFromRequest();
        if (!tenant) {
            return NextResponse.json({ success: false, error: "Identifying hotel failed" }, { status: 400 });
        }

        const { searchParams } = new URL(request.url);

        const statusParam = searchParams.get("status");
        const statuses: OrderStatus[] = statusParam
            ? (statusParam.split(",") as OrderStatus[])
            : ["NEW", "PREPARING", "READY", "SERVED"];

        const limitParam = searchParams.get("limit");
        const limit = limitParam ? parseInt(limitParam, 10) : 50;

        const db = prisma;
        const orders = await getOrdersByStatus(statuses, { limit, clientId: tenant.id, db });

        const formattedOrders: OrderResponse[] = orders.map((o) => {
            const total = o.items.reduce((sum, item) => {
                return sum + Number(item.priceSnapshot) * item.quantity;
            }, 0);

            const mapped: OrderResponse = {
                id: o.id,
                tableId: o.tableId,
                tableCode: o.table.tableCode,
                status: o.status,
                version: o.version,
                customerName: o.customerName,
                items: o.items.map((item: any) => ({
                    id: item.id,
                    menuItemId: item.menuItemId,
                    itemName: item.itemName,
                    price: Number(item.priceSnapshot),
                    quantity: item.quantity,
                    status: item.status,
                    selectedVariant: item.selectedVariant,
                    selectedModifiers: item.selectedModifiers,
                    notes: item.notes
                })),
                total: Number((o as any).grandTotal || total),
                subtotal: Number((o as any).subtotal || total),
                gstAmount: Number((o as any).gstAmount || 0),
                serviceChargeAmount: Number((o as any).serviceChargeAmount || 0),
                grandTotal: Number((o as any).grandTotal || total),
                createdAt: o.createdAt.toISOString(),
                closedAt: o.closedAt?.toISOString(),
                customerPhone: (o as any).customerPhone || null,
            };
            return mapped;
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
