import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { prisma } from '@/lib/db';

/**
 * POST /api/orders/direct-bill
 *
 * BILLING_ONLY plan: Creates an order draft with status BILL_REQUESTED (Preview mode).
 * The order is NOT yet settled or counted in revenue until the cashier clicks 'Finish & Close'.
 */
export async function POST(req: NextRequest) {
    try {
        const user = await requireAuth('ADMIN');

        // Only BILLING_ONLY plan can use this endpoint
        if (user.plan !== 'BILLING_ONLY') {
            return NextResponse.json({ success: false, error: 'Not available on your plan' }, { status: 403 });
        }

        const body = await req.json();
        const {
            tableId,
            customerName,
            customerPhone,
            paymentMethod = 'CASH',
            items,
            discountAmount = 0,
            taxAmount,
            cgstAmount,
            sgstAmount,
            grandTotal: clientGrandTotal
        } = body;

        if (!tableId || !items?.length) {
            return NextResponse.json({ success: false, error: 'tableId and items are required' }, { status: 400 });
        }

        // Validate table belongs to this client
        const table = await (prisma.table as any).findFirst({
            where: { id: tableId, clientId: user.clientId },
        });
        if (!table) {
            return NextResponse.json({ success: false, error: 'Table not found' }, { status: 404 });
        }

        // Fetch menu items to get prices
        const menuItemIds = items.map((i: any) => i.menuItemId);
        const menuItems = await (prisma.menuItem as any).findMany({
            where: { id: { in: menuItemIds }, clientId: user.clientId },
            select: { id: true, name: true, price: true },
        });

        const menuMap: Record<string, { name: string; price: number }> = {};
        for (const m of menuItems) menuMap[m.id] = { name: m.name, price: Number(m.price) };

        // Compute billing
        const settings = await (prisma.restaurantSettings as any).findUnique({
            where: { clientId: user.clientId },
            select: { gstRate: true, serviceChargeRate: true },
        });
        const gstRate = Number(settings?.gstRate ?? 5);
        const serviceRate = Number(settings?.serviceChargeRate ?? 5);

        let subtotal = 0;
        const orderItems = items.map((i: any) => {
            const menuItem = menuMap[i.menuItemId];
            if (!menuItem) throw new Error(`Menu item not found: ${i.menuItemId}`);
            const lineTotal = menuItem.price * i.quantity;
            subtotal += lineTotal;
            return {
                menuItemId: i.menuItemId,
                itemName: menuItem.name,
                priceSnapshot: menuItem.price,
                quantity: i.quantity,
                status: 'SERVED' as const,
            };
        });

        const calculatedGst = taxAmount !== undefined ? Number(taxAmount) : Math.round(subtotal * gstRate) / 100;
        const serviceAmount = Math.round(subtotal * serviceRate) / 100;
        const calculatedDiscount = Number(discountAmount || 0);
        const calculatedGrandTotal = clientGrandTotal !== undefined 
            ? Number(clientGrandTotal) 
            : Math.round(subtotal - calculatedDiscount + calculatedGst + serviceAmount);

        // Create order in BILL_REQUESTED state (Preview state, NOT closed yet!)
        const order = await (prisma.order as any).create({
            data: {
                clientId: user.clientId,
                tableId,
                customerName: customerName || 'Walk-in Guest',
                customerPhone: customerPhone || null,
                status: 'BILL_REQUESTED',
                paymentMethod,
                settledById: user.id,
                subtotal,
                discountAmount: calculatedDiscount,
                gstAmount: calculatedGst,
                serviceChargeAmount: serviceAmount,
                appliedGstRate: gstRate,
                appliedServiceRate: serviceRate,
                grandTotal: calculatedGrandTotal,
                items: {
                    create: orderItems,
                },
            },
        });

        // Set table to OCCUPIED during draft preview
        await (prisma.table as any).update({
            where: { id: tableId },
            data: { status: 'OCCUPIED' },
        });

        return NextResponse.json({ success: true, orderId: order.id, grandTotal: calculatedGrandTotal });

    } catch (err: any) {
        console.error('[DIRECT_BILL]', err);
        return NextResponse.json({ success: false, error: err.message || 'Internal error' }, { status: 500 });
    }
}
