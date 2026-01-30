/**
 * Order Service
 * 
 * Core business logic for order management.
 * Handles order creation, status updates, and item management.
 */

import { prisma } from "@/lib/db";
import type { Order, OrderItem, OrderStatus, OrderItemStatus, Prisma } from "@/generated/prisma";

// ============================================
// Types
// ============================================

export interface CreateOrderInput {
    tableId: string;
    customerName?: string;
    items: CreateOrderItemInput[];
}

export interface CreateOrderItemInput {
    menuItemId: string;
    quantity: number;
}

export interface OrderWithItems extends Order {
    items: OrderItem[];
    customerName: string | null;
    table: {
        id: string;
        tableCode: string;
    };
}

export interface OrderItemWithMenuItem extends OrderItem {
    menuItem: {
        id: string;
        name: string;
        price: Prisma.Decimal;
    };
}

// ============================================
// Order Creation
// ============================================

/**
 * Create a new order with items.
 * 
 * Flow:
 * 1. Validate table exists and is not deleted
 * 2. Validate all menu items exist and are available
 * 3. Create order with status NEW
 * 4. Create order items with price snapshots
 * 5. Update table status to ACTIVE
 * 6. Create audit log
 * 
 * @param input - The order creation input
 * @returns The created order with items
 */
export async function createOrder(input: CreateOrderInput): Promise<OrderWithItems> {
    const { tableId, items, customerName } = input;

    // Validate input
    if (!tableId) {
        throw new OrderError("Table ID is required", "INVALID_INPUT");
    }

    if (!items || items.length === 0) {
        throw new OrderError("At least one item is required", "INVALID_INPUT");
    }

    // Validate quantities
    for (const item of items) {
        if (!item.menuItemId || item.quantity < 1) {
            throw new OrderError("Invalid item: each item needs menuItemId and quantity >= 1", "INVALID_INPUT");
        }
    }

    // Use transaction for atomicity
    return await prisma.$transaction(async (tx) => {
        // 1. Validate table
        const table = await tx.table.findUnique({
            where: { id: tableId },
        });

        if (!table) {
            throw new OrderError("Table not found", "TABLE_NOT_FOUND");
        }

        if (table.deletedAt) {
            throw new OrderError("Table is no longer available", "TABLE_DELETED");
        }

        // 2. Validate menu items
        const menuItemIds = items.map((i) => i.menuItemId);
        const menuItems = await tx.menuItem.findMany({
            where: {
                id: { in: menuItemIds },
                deletedAt: null,
            },
        });

        // Check all items exist
        const foundIds = new Set(menuItems.map((m) => m.id));
        const missingIds = menuItemIds.filter((id) => !foundIds.has(id));

        if (missingIds.length > 0) {
            throw new OrderError(
                `Menu items not found: ${missingIds.join(", ")}`,
                "MENU_ITEM_NOT_FOUND"
            );
        }

        // Check all items are available
        const unavailable = menuItems.filter((m) => !m.isAvailable);
        if (unavailable.length > 0) {
            throw new OrderError(
                `Menu items not available: ${unavailable.map((m) => m.name).join(", ")}`,
                "MENU_ITEM_UNAVAILABLE"
            );
        }

        // Create a map for quick lookup
        const menuItemMap = new Map(menuItems.map((m) => [m.id, m]));

        // 3. Create order
        const order = await tx.order.create({
            data: {
                tableId,
                customerName,
                status: "NEW",
                version: 1,
            },
        });

        // 4. Create order items with price snapshots
        const orderItemsData = items.map((item) => {
            const menuItem = menuItemMap.get(item.menuItemId)!;
            return {
                orderId: order.id,
                menuItemId: item.menuItemId,
                itemName: menuItem.name,
                priceSnapshot: menuItem.price,
                quantity: item.quantity,
                status: "PENDING" as OrderItemStatus,
            };
        });

        await tx.orderItem.createMany({
            data: orderItemsData,
        });

        // 5. Update table status to ACTIVE
        await tx.table.update({
            where: { id: tableId },
            data: { status: "ACTIVE" },
        });

        // 6. Create audit log
        await tx.auditLog.create({
            data: {
                action: "ORDER_CREATED",
                orderId: order.id,
                metadata: {
                    tableCode: table.tableCode,
                    itemCount: items.length,
                },
            },
        });

        // Fetch and return complete order
        const completeOrder = await tx.order.findUnique({
            where: { id: order.id },
            include: {
                items: true,
                table: {
                    select: {
                        id: true,
                        tableCode: true,
                    },
                },
            },
        });

        if (!completeOrder) {
            throw new OrderError("Failed to create order", "CREATION_FAILED");
        }

        return completeOrder;
    });
}

// ============================================
// Order Retrieval
// ============================================

/**
 * Get an order by ID with all items
 */
export async function getOrderById(orderId: string): Promise<OrderWithItems | null> {
    return await prisma.order.findUnique({
        where: { id: orderId },
        include: {
            items: {
                include: {
                    menuItem: {
                        select: {
                            id: true,
                            name: true,
                            price: true,
                        },
                    },
                },
            },
            table: {
                select: {
                    id: true,
                    tableCode: true,
                },
            },
        },
    });
}

/**
 * Get orders by status (for kitchen/waiter views)
 */
export async function getOrdersByStatus(
    statuses: OrderStatus[],
    options?: {
        limit?: number;
        orderBy?: "asc" | "desc";
    }
): Promise<OrderWithItems[]> {
    return await prisma.order.findMany({
        where: {
            status: { in: statuses },
        },
        include: {
            items: true,
            table: {
                select: {
                    id: true,
                    tableCode: true,
                },
            },
        },
        orderBy: {
            createdAt: options?.orderBy ?? "asc",
        },
        take: options?.limit,
    });
}

/**
 * Get active orders for a table
 */
export async function getActiveOrdersForTable(tableId: string): Promise<OrderWithItems[]> {
    return await prisma.order.findMany({
        where: {
            tableId,
            status: { notIn: ["CLOSED"] },
        },
        include: {
            items: true,
            table: {
                select: {
                    id: true,
                    tableCode: true,
                },
            },
        },
        orderBy: {
            createdAt: "desc",
        },
    });
}

// ============================================
// Order Status Updates
// ============================================

/**
 * Update order status with version check for optimistic locking
 */
export async function updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    expectedVersion: number,
    actorId?: string
): Promise<OrderWithItems> {
    return await prisma.$transaction(async (tx) => {
        // Get current order with version check
        const order = await tx.order.findUnique({
            where: { id: orderId },
        });

        if (!order) {
            throw new OrderError("Order not found", "ORDER_NOT_FOUND");
        }

        if (order.version !== expectedVersion) {
            throw new OrderError(
                "Order was modified by another user. Please refresh.",
                "VERSION_CONFLICT"
            );
        }

        // Validate status transition
        if (!isValidStatusTransition(order.status, newStatus)) {
            throw new OrderError(
                `Cannot transition from ${order.status} to ${newStatus}`,
                "INVALID_TRANSITION"
            );
        }

        // Update order
        const updatedOrder = await tx.order.update({
            where: { id: orderId },
            data: {
                status: newStatus,
                version: { increment: 1 },
                closedAt: newStatus === "CLOSED" ? new Date() : undefined,
            },
            include: {
                items: true,
                table: {
                    select: {
                        id: true,
                        tableCode: true,
                    },
                },
            },
        });

        // Update table status if needed
        if (newStatus === "READY") {
            await tx.table.update({
                where: { id: order.tableId },
                data: { status: "READY" },
            });
        } else if (newStatus === "CLOSED") {
            await tx.table.update({
                where: { id: order.tableId },
                data: { status: "DIRTY" },
            });
        }

        // Create audit log
        await tx.auditLog.create({
            data: {
                action: "STATUS_CHANGED",
                orderId,
                actorId,
                metadata: {
                    previousStatus: order.status,
                    newStatus,
                    tableCode: updatedOrder.table.tableCode,
                },
            },
        });

        return updatedOrder;
    });
}

/**
 * Valid order status transitions
 */
const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
    NEW: ["PREPARING"],
    PREPARING: ["READY"],
    READY: ["SERVED"],
    SERVED: ["BILL_REQUESTED"],
    BILL_REQUESTED: ["CLOSED"],
    CLOSED: [], // Terminal state
};

function isValidStatusTransition(from: OrderStatus, to: OrderStatus): boolean {
    return STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

// ============================================
// Order Item Management
// ============================================

/**
 * Add items to an existing order (for waiter upsells)
 */
export async function addItemsToOrder(
    orderId: string,
    items: CreateOrderItemInput[],
    actorId?: string
): Promise<OrderWithItems> {
    if (!items || items.length === 0) {
        throw new OrderError("At least one item is required", "INVALID_INPUT");
    }

    return await prisma.$transaction(async (tx) => {
        // Get order
        const order = await tx.order.findUnique({
            where: { id: orderId },
        });

        if (!order) {
            throw new OrderError("Order not found", "ORDER_NOT_FOUND");
        }

        // Can only add items to orders that aren't closed
        if (order.status === "CLOSED") {
            throw new OrderError("Cannot add items to a closed order", "ORDER_CLOSED");
        }

        // Validate menu items
        const menuItemIds = items.map((i) => i.menuItemId);
        const menuItems = await tx.menuItem.findMany({
            where: {
                id: { in: menuItemIds },
                deletedAt: null,
                isAvailable: true,
            },
        });

        if (menuItems.length !== menuItemIds.length) {
            throw new OrderError("Some menu items are not available", "MENU_ITEM_UNAVAILABLE");
        }

        const menuItemMap = new Map(menuItems.map((m) => [m.id, m]));

        // Create order items
        const orderItemsData = items.map((item) => {
            const menuItem = menuItemMap.get(item.menuItemId)!;
            return {
                orderId,
                menuItemId: item.menuItemId,
                itemName: menuItem.name,
                priceSnapshot: menuItem.price,
                quantity: item.quantity,
                status: "PENDING" as OrderItemStatus,
            };
        });

        await tx.orderItem.createMany({
            data: orderItemsData,
        });

        // Increment version
        await tx.order.update({
            where: { id: orderId },
            data: { version: { increment: 1 } },
        });

        // Audit log
        await tx.auditLog.create({
            data: {
                action: "ITEM_ADDED",
                orderId,
                actorId,
                metadata: {
                    itemsAdded: items.length,
                },
            },
        });

        // Return updated order
        return (await tx.order.findUnique({
            where: { id: orderId },
            include: {
                items: true,
                table: {
                    select: {
                        id: true,
                        tableCode: true,
                    },
                },
            },
        }))!;
    });
}

/**
 * Update item status (for kitchen workflow)
 */
export async function updateOrderItemStatus(
    itemId: string,
    newStatus: OrderItemStatus
): Promise<OrderItem> {
    const item = await prisma.orderItem.update({
        where: { id: itemId },
        data: { status: newStatus },
    });

    return item;
}

// ============================================
// Order Calculations
// ============================================

/**
 * Calculate order total as a number
 */
export function calculateOrderTotal(items: OrderItem[]): number {
    return items.reduce((total, item) => {
        return total + Number(item.priceSnapshot) * item.quantity;
    }, 0);
}

// ============================================
// Custom Error Class
// ============================================

export type OrderErrorCode =
    | "INVALID_INPUT"
    | "TABLE_NOT_FOUND"
    | "TABLE_DELETED"
    | "MENU_ITEM_NOT_FOUND"
    | "MENU_ITEM_UNAVAILABLE"
    | "ORDER_NOT_FOUND"
    | "ORDER_CLOSED"
    | "VERSION_CONFLICT"
    | "INVALID_TRANSITION"
    | "CREATION_FAILED";

export class OrderError extends Error {
    constructor(
        message: string,
        public code: OrderErrorCode
    ) {
        super(message);
        this.name = "OrderError";
    }
}
