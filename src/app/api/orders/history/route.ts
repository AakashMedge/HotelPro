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
        const paymentMethod = url.searchParams.get('paymentMethod') || '';
        const range = url.searchParams.get('range') || 'all';

        // Date calculation
        let dateFilter: any = {};
        const now = new Date();
        if (range === 'today') {
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            dateFilter = { gte: todayStart };
        } else if (range === 'yesterday') {
            const yestStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
            const yestEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            dateFilter = { gte: yestStart, lt: yestEnd };
        } else if (range === 'week') {
            const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
            dateFilter = { gte: weekStart };
        }

        // Fetch closed orders for tenant
        const orders = await (prisma.order as any).findMany({
            where: {
                clientId: user.clientId,
                status: 'CLOSED',
                ...(paymentMethod ? { paymentMethod } : {}),
                ...(Object.keys(dateFilter).length > 0 ? { closedAt: dateFilter } : {}),
                ...(search
                    ? {
                        OR: [
                            { customerName: { contains: search, mode: 'insensitive' } },
                            { customerPhone: { contains: search, mode: 'insensitive' } },
                            { id: { contains: search, mode: 'insensitive' } },
                            { table: { tableCode: { contains: search, mode: 'insensitive' } } },
                        ],
                    }
                    : {}),
            },
            include: {
                table: { select: { tableCode: true } },
                items: { select: { id: true, itemName: true, quantity: true, priceSnapshot: true } },
            },
            orderBy: { closedAt: 'desc' },
            take: 300,
        });

        let totalRevenue = 0;
        let cashRevenue = 0;
        let upiRevenue = 0;
        let cardRevenue = 0;

        const totalCount = orders.length;
        const formattedOrders = orders.map((o: any, idx: number) => {
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
            const seqNum = totalCount - idx;
            const billNo = `#${seqNum}`;
            const invoiceNo = `INV-${yr}${mo}${dy}-${String(seqNum).padStart(3, '0')}`;

            return {
                id: o.id,
                billNo,
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
                version: Number(o.version || 1),
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
