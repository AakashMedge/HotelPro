/**
 * Payment API
 * 
 * POST /api/orders/[id]/payment - Create payment and close order
 * 
 * Used by cashiers to finalize orders.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrderById, OrderError } from "@/lib/services/order";
import { verifyToken } from "@/lib/auth";
import type { PaymentMethod } from "@prisma/client";

interface PaymentResponse {
    id: string;
    orderId: string;
    method: string;
    amount: number;
    status: string;
    createdAt: string;
}

interface SuccessResponse {
    success: true;
    payment: PaymentResponse;
    tableFreed: boolean;
}

interface ErrorResponse {
    success: false;
    error: string;
    code?: string;
}

/**
 * POST /api/orders/[id]/payment
 * 
 * Process payment for an order and close it.
 * 
 * Request Body:
 * {
 *   method: "CASH" | "CARD" | "UPI",
 *   amount?: number  // Optional - if not provided, uses order total
 * }
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<SuccessResponse | ErrorResponse>> {
    try {
        const { id: orderId } = await params;

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

        const { method, amount: providedAmount } = body as {
            method: PaymentMethod;
            amount?: number;
        };

        // Validate payment method
        const validMethods: PaymentMethod[] = ["CASH", "CARD", "UPI"];
        if (!method || !validMethods.includes(method)) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Invalid payment method. Must be one of: ${validMethods.join(", ")}`,
                    code: "INVALID_INPUT",
                },
                { status: 400 }
            );
        }

        // Get order
        const order = await getOrderById(orderId);

        if (!order) {
            return NextResponse.json(
                { success: false, error: "Order not found", code: "ORDER_NOT_FOUND" },
                { status: 404 }
            );
        }

        // Check order is in SERVED or BILL_REQUESTED state
        if (order.status !== "SERVED" && order.status !== "BILL_REQUESTED") {
            return NextResponse.json(
                {
                    success: false,
                    error: `Cannot process payment. Order status is ${order.status}, expected SERVED or BILL_REQUESTED`,
                    code: "INVALID_STATE",
                },
                { status: 400 }
            );
        }

        // Check if already paid
        const existingPayment = await prisma.payment.findUnique({
            where: { orderId },
        });

        if (existingPayment) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Order already has a payment",
                    code: "ALREADY_PAID",
                },
                { status: 400 }
            );
        }

        // Calculate order total
        const orderTotal = order.items.reduce((sum, item) => {
            return sum + Number(item.priceSnapshot) * item.quantity;
        }, 0);

        // Use provided amount or order total
        const paymentAmount = providedAmount ?? orderTotal;

        // Validate amount
        if (paymentAmount < orderTotal) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Payment amount (${paymentAmount}) is less than order total (${orderTotal})`,
                    code: "INSUFFICIENT_AMOUNT",
                },
                { status: 400 }
            );
        }

        // Create payment and close order in transaction
        const result = await prisma.$transaction(async (tx) => {
            // Create payment
            const payment = await tx.payment.create({
                data: {
                    orderId,
                    method,
                    amount: paymentAmount,
                    status: "PAID",
                },
            });

            // Update order to CLOSED
            await tx.order.update({
                where: { id: orderId },
                data: {
                    status: "CLOSED",
                    closedAt: new Date(),
                    version: { increment: 1 },
                },
            });

            // Update Staff Performance (Waiter)
            if (order.table.assignedWaiterId) {
                await tx.user.update({
                    where: { id: order.table.assignedWaiterId },
                    data: {
                        totalOrders: { increment: 1 },
                        totalSales: { increment: paymentAmount }
                    }
                });
            }

            // Mark the table as DIRTY for cleanup
            await tx.table.update({
                where: { id: order.table.id }, // Using id from order object
                data: { status: "DIRTY" },
            });

            // Audit log
            await tx.auditLog.create({
                data: {
                    clientId: order.clientId,
                    action: "PAYMENT_AUTHORIZED",
                    orderId,
                    actorId,
                    metadata: {
                        method,
                        amount: paymentAmount,
                        tableCode: order.table.tableCode,
                    },
                },
            });

            await tx.auditLog.create({
                data: {
                    clientId: order.clientId,
                    action: "ORDER_CLOSED",
                    orderId,
                    actorId,
                    metadata: {
                        totalAmount: paymentAmount,
                        paymentMethod: method,
                        tableCode: order.table.tableCode,
                    },
                },
            });

            return payment;
        });

        console.log(`[PAYMENT API] Order ${orderId} paid via ${method}, amount: ${paymentAmount}`);

        return NextResponse.json({
            success: true,
            payment: {
                id: result.id,
                orderId: result.orderId,
                method: result.method,
                amount: Number(result.amount),
                status: result.status,
                createdAt: result.createdAt.toISOString(),
            },
            tableFreed: true,
        });
    } catch (error) {
        if (error instanceof OrderError) {
            return NextResponse.json(
                { success: false, error: error.message, code: error.code },
                { status: 400 }
            );
        }

        console.error("[PAYMENT API] Error processing payment:", error);

        return NextResponse.json(
            { success: false, error: "Failed to process payment" },
            { status: 500 }
        );
    }
}
