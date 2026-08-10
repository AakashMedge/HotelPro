import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { prisma } from '@/lib/db';

/**
 * GET /api/orders/history
 * Fetches closed orders & sales ledger for the client tenant
 */
export async function GET(req: NextRequest) {
    try {
        const user = await requireAuth();

        const url = new URL(req.url);
        const search = url.searchParams.get('search') || '';

        // Fetch closed orders for tenant
        const orders = await (prisma.order as any).findMany({
            where: {
                clientId: user.clientId,
                status: 'CLOSED',
                ...(search
                    ? {
                        OR: [
                            { customerName: { contains: search, mode: 'insensitive' } },
                            { customerPhone: { contains: search, mode: 'insensitive' } },
                            { id: { contains: search, mode: 'insensitive' } },
                        ],
                    }
                    : {}),
            },
            include: {
                table: { select: { tableCode: true } },
                items: { select: { id: true, itemName: true, quantity: true, priceSnapshot: true } },
            },
            orderBy: { closedAt: 'desc' },
            take: 100,
        });

        let totalRevenue = 0;
        let cashRevenue = 0;
        let upiRevenue = 0;
        let cardRevenue = 0;

        const formattedOrders = orders.map((o: any) => {
            const grandTotal = Number(o.grandTotal || 0);
            totalRevenue += grandTotal;
            if (o.paymentMethod === 'CASH') cashRevenue += grandTotal;
            else if (o.paymentMethod === 'UPI') upiRevenue += grandTotal;
            else if (o.paymentMethod === 'CARD') cardRevenue += grandTotal;

            const dateStr = o.closedAt || o.createdAt || new Date().toISOString();
            const d = new Date(dateStr);
            const yr = String(d.getFullYear()).slice(-2);
            const mo = String(d.getMonth() + 1).padStart(2, '0');
            const dy = String(d.getDate()).padStart(2, '0');
            const invoiceNo = `INV-${yr}${mo}${dy}-${String(o.id).slice(-4).toUpperCase()}`;

            return {
                id: o.id,
                invoiceNo,
                tableId: o.tableId,
                tableCode: o.table?.tableCode || 'T-01',
                customerName: o.customerName || 'Walk-in Guest',
                customerPhone: o.customerPhone || null,
                paymentMethod: o.paymentMethod || 'CASH',
                closedAt: dateStr,
                subtotal: Number(o.subtotal || 0),
                discountAmount: Number(o.discountAmount || 0),
                gstAmount: Number(o.gstAmount || 0),
                grandTotal,
                itemsCount: (o.items || []).reduce((acc: number, item: any) => acc + item.quantity, 0),
            };
        });

        return NextResponse.json({
            success: true,
            summary: {
                totalOrders: formattedOrders.length,
                totalRevenue,
                cashRevenue,
                upiRevenue,
                cardRevenue,
            },
            orders: formattedOrders,
        });
    } catch (err: any) {
        console.error('[ORDER_HISTORY_API]', err);
        return NextResponse.json({ success: false, error: err.message || 'Internal error' }, { status: 500 });
    }
}
