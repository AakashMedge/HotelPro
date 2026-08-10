import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { prisma } from '@/lib/db';

/**
 * POST /api/orders/[id]/settle
 * Finalizes and closes an order when the cashier clicks 'Finish & Close'.
 * This is the ONLY trigger that persists Payment and registers revenue into Sales Ledger.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const user = await requireAuth();
        const { id: orderId } = params;

        const order = await (prisma.order as any).findFirst({
            where: { id: orderId, clientId: user.clientId },
        });

        if (!order) {
            return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
        }

        const closedAt = new Date();

        // 1. Mark order as CLOSED
        const updatedOrder = await (prisma.order as any).update({
            where: { id: orderId },
            data: {
                status: 'CLOSED',
                closedAt,
                settledById: user.id,
            },
        });

        // 2. Create Payment record in DB (Security Check Passed!)
        await (prisma.payment as any).create({
            data: {
                clientId: user.clientId,
                orderId: order.id,
                method: order.paymentMethod || 'CASH',
                amount: Number(order.grandTotal || 0),
                status: 'PAID',
            },
        });

        // 3. Set table back to VACANT
        if (order.tableId) {
            await (prisma.table as any).update({
                where: { id: order.tableId },
                data: { status: 'VACANT' },
            });
        }

        return NextResponse.json({ success: true, order: updatedOrder });
    } catch (err: any) {
        console.error('[ORDER_SETTLE_API]', err);
        return NextResponse.json({ success: false, error: err.message || 'Internal error' }, { status: 500 });
    }
}
