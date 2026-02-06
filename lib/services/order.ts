/**
 * Order Service
 * 
 * Core business logic for order management.
 * Handles order creation, status updates, and item management.
 */

import { prisma } from "@/lib/db";
import { Order, OrderItem, OrderStatus, OrderItemStatus, Prisma } from "@prisma/client";

// ============================================
// Types
// ============================================

export interface CreateOrderInput {
    tableId: string;
    clientId: string;
    customerName?: string;
    sessionId?: string;
    items: CreateOrderItemInput[];
}

export interface CreateOrderItemInput {
    menuItemId: string;
    quantity: number;
    // New fields for customization
    selectedVariant?: { name: string; price: number };
    selectedModifiers?: { name: string; price: number }[];
    notes?: string;
    totalPrice?: number; // Override price helper
}

export interface OrderWithItems extends Order {
    items: OrderItem[];
    customerName: string | null;
    table: {
        id: string;
        tableCode: string;
        assignedWaiterId: string | null;
    };
}

// ============================================
// Order Creation
// ============================================

export async function createOrder(input: CreateOrderInput): Promise<OrderWithItems> {
    const { tableId, clientId, items, customerName, sessionId } = input;

    // Validate input
    if (!tableId) throw new OrderError("Table ID is required", "INVALID_INPUT");
    if (!clientId) throw new OrderError("Client ID is required", "INVALID_INPUT");
    if (!items || items.length === 0) throw new OrderError("At least one item is required", "INVALID_INPUT");

    // Transaction
    return await prisma.$transaction(async (tx) => {
        // 1. Validate table belongs to client
        const table = await tx.table.findUnique({
            where: { id: tableId }
        });
        if (!table || table.clientId !== clientId) throw new OrderError("Table not found or invalid", "TABLE_NOT_FOUND");
        if (table.deletedAt) throw new OrderError("Table is no longer available", "TABLE_DELETED");

        // 2. Validate items belong to client
        const menuItemIds = items.map((i) => i.menuItemId);
        const menuItems = await tx.menuItem.findMany({
            where: {
                id: { in: menuItemIds },
                clientId: clientId,
                deletedAt: null
            },
        });

        // Availability check
        const availableMap = new Map(menuItems.map(m => [m.id, m]));
        for (const item of items) {
            const m = availableMap.get(item.menuItemId);
            if (!m) throw new OrderError(`Item not found: ${item.menuItemId}`, "MENU_ITEM_NOT_FOUND");
            if (!m.isAvailable) throw new OrderError(`Item not available: ${m.name}`, "MENU_ITEM_UNAVAILABLE");
        }

        // 3. Pre-calculate subtotal and taxes
        let subtotal = 0;
        for (const item of items) {
            const menuItem = availableMap.get(item.menuItemId)!;
            let finalPrice = item.selectedVariant ? item.selectedVariant.price : Number(menuItem.price);
            if (item.selectedModifiers) {
                finalPrice += item.selectedModifiers.reduce((acc, mod) => acc + mod.price, 0);
            }
            subtotal += finalPrice * item.quantity;
        }

        const settings = await tx.restaurantSettings.findUnique({
            where: { clientId: clientId }
        });
        const gstRate = settings?.gstRate ? Number(settings.gstRate) : 5.0;
        const serviceRate = settings?.serviceChargeRate ? Number(settings.serviceChargeRate) : 5.0;

        const gstAmount = subtotal * (gstRate / 100);
        const serviceChargeAmount = subtotal * (serviceRate / 100);
        const grandTotal = subtotal + gstAmount + serviceChargeAmount;

        // 4. Create order
        const order = await tx.order.create({
            data: {
                clientId,
                tableId,
                customerName,
                sessionId,
                status: "NEW",
                version: 1,
                subtotal,
                gstAmount,
                serviceChargeAmount,
                grandTotal,
                appliedGstRate: gstRate,
                appliedServiceRate: serviceRate,
            },
        });

        // 5. Create detailed order items
        const orderItemsData = items.map((item) => {
            const menuItem = availableMap.get(item.menuItemId)!;
            let finalPrice = item.selectedVariant ? item.selectedVariant.price : Number(menuItem.price);
            if (item.selectedModifiers) {
                finalPrice += item.selectedModifiers.reduce((acc, mod) => acc + mod.price, 0);
            }

            return {
                orderId: order.id,
                menuItemId: item.menuItemId,
                itemName: menuItem.name,
                priceSnapshot: finalPrice,
                quantity: item.quantity,
                status: "PENDING" as OrderItemStatus,
                selectedVariant: item.selectedVariant ?? Prisma.JsonNull,
                selectedModifiers: item.selectedModifiers ?? Prisma.JsonNull,
                notes: item.notes
            };
        });

        await tx.orderItem.createMany({ data: orderItemsData });

        // 6. Update table status
        await tx.table.update({
            where: { id: tableId },
            data: { status: "ACTIVE" },
        });

        // 7. Audit Log
        await tx.auditLog.create({
            data: {
                clientId,
                action: "ORDER_CREATED",
                orderId: order.id,
                metadata: { tableCode: table.tableCode, itemCount: items.length },
            },
        });

        return (await tx.order.findUnique({
            where: { id: order.id },
            include: { items: true, table: { select: { id: true, tableCode: true, assignedWaiterId: true } } },
        }))!;
    });
}

// ============================================
// Order Retrieval
// ============================================

export async function getOrderById(orderId: string): Promise<OrderWithItems | null> {
    return await prisma.order.findUnique({
        where: { id: orderId },
        include: {
            items: { include: { menuItem: { select: { id: true, name: true, price: true } } } },
            table: { select: { id: true, tableCode: true, assignedWaiterId: true } },
        },
    });
}

export async function getOrdersByStatus(statuses: OrderStatus[], options?: { limit?: number; orderBy?: "asc" | "desc"; clientId?: string }): Promise<OrderWithItems[]> {
    return await prisma.order.findMany({
        where: {
            status: { in: statuses },
            ...(options?.clientId && { clientId: options.clientId })
        },
        include: { items: true, table: { select: { id: true, tableCode: true, assignedWaiterId: true } } },
        orderBy: { createdAt: options?.orderBy ?? "asc" },
        take: options?.limit,
    }) as OrderWithItems[];
}

// ============================================
// Order Updates
// ============================================

export async function updateOrderStatus(orderId: string, newStatus: OrderStatus, expectedVersion: number, actorId?: string, customerName?: string): Promise<OrderWithItems> {
    return await prisma.$transaction(async (tx) => {
        const order = await tx.order.findUnique({ where: { id: orderId } });
        if (!order) throw new OrderError("Order not found", "ORDER_NOT_FOUND");
        if (order.version !== expectedVersion) throw new OrderError("Order modified by another user", "VERSION_CONFLICT");

        const updatedOrder = await tx.order.update({
            where: { id: orderId },
            data: {
                status: newStatus,
                version: { increment: 1 },
                closedAt: newStatus === "CLOSED" ? new Date() : undefined,
                // Update customerName if provided (for billing flow)
                ...(customerName && { customerName }),
            },
            include: { items: true, table: { select: { id: true, tableCode: true, assignedWaiterId: true } } },
        });

        if (newStatus === "READY") await tx.table.update({ where: { id: order.tableId }, data: { status: "READY" } });
        if (newStatus === "CLOSED") await tx.table.update({ where: { id: order.tableId }, data: { status: "DIRTY" } });

        return updatedOrder as OrderWithItems;
    });
}

// ============================================
// Add Items (Upsell)
// ============================================

export async function addItemsToOrder(orderId: string, items: CreateOrderItemInput[], actorId?: string): Promise<OrderWithItems> {
    if (!items || items.length === 0) throw new OrderError("No items", "INVALID_INPUT");

    return await prisma.$transaction(async (tx) => {
        const order = await tx.order.findUnique({ where: { id: orderId } });
        if (!order) throw new OrderError("Order not found", "ORDER_NOT_FOUND");
        if (order.status === "CLOSED") throw new OrderError("Order closed", "ORDER_CLOSED");

        const menuItems = await tx.menuItem.findMany({
            where: { id: { in: items.map(i => i.menuItemId) }, isAvailable: true }
        });
        const map = new Map(menuItems.map(m => [m.id, m]));

        const orderItemsData = items.map((item) => {
            const m = map.get(item.menuItemId);
            if (!m) throw new OrderError("Item unavailable", "MENU_ITEM_UNAVAILABLE");

            let finalPrice = item.selectedVariant ? item.selectedVariant.price : Number(m.price);
            if (item.selectedModifiers) finalPrice += item.selectedModifiers.reduce((a, b) => a + b.price, 0);

            return {
                orderId,
                menuItemId: item.menuItemId,
                itemName: m.name,
                priceSnapshot: finalPrice,
                quantity: item.quantity,
                status: "PENDING" as OrderItemStatus,
                selectedVariant: item.selectedVariant ?? Prisma.JsonNull,
                selectedModifiers: item.selectedModifiers ?? Prisma.JsonNull,
                notes: item.notes
            };
        });

        await tx.orderItem.createMany({ data: orderItemsData });

        // Recalculate totals for the entire order
        const allItems = await tx.orderItem.findMany({ where: { orderId } });
        const newSubtotal = allItems.reduce((acc, item) => acc + (Number(item.priceSnapshot) * item.quantity), 0);

        const settings = await tx.restaurantSettings.findUnique({ where: { clientId: order.clientId } });
        const gstRate = settings?.gstRate ? Number(settings.gstRate) : 5.0;
        const serviceRate = settings?.serviceChargeRate ? Number(settings.serviceChargeRate) : 5.0;

        const gstAmount = newSubtotal * (gstRate / 100);
        const serviceChargeAmount = newSubtotal * (serviceRate / 100);
        const grandTotal = newSubtotal + gstAmount + serviceChargeAmount;

        await tx.order.update({
            where: { id: orderId },
            data: {
                version: { increment: 1 },
                subtotal: newSubtotal,
                gstAmount,
                serviceChargeAmount,
                grandTotal,
                appliedGstRate: gstRate,
                appliedServiceRate: serviceRate
            }
        });

        // Audit Log
        if (actorId) {
            await tx.auditLog.create({
                data: {
                    clientId: order.clientId,
                    action: "ITEM_ADDED",
                    orderId,
                    actorId,
                    metadata: { count: items.length }
                }
            });
        }

        return (await tx.order.findUnique({
            where: { id: orderId },
            include: { items: true, table: { select: { id: true, tableCode: true, assignedWaiterId: true } } },
        })) as OrderWithItems;
    });
}

// ============================================
// Errors
// ============================================

export type OrderErrorCode = "INVALID_INPUT" | "TABLE_NOT_FOUND" | "TABLE_DELETED" | "MENU_ITEM_NOT_FOUND" | "MENU_ITEM_UNAVAILABLE" | "ORDER_NOT_FOUND" | "ORDER_CLOSED" | "VERSION_CONFLICT" | "INVALID_TRANSITION" | "CREATION_FAILED";
export class OrderError extends Error {
    constructor(message: string, public code: OrderErrorCode) {
        super(message);
        this.name = "OrderError";
    }
}
