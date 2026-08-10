import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { getDb } from '@/lib/db';

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
            grandTotal: clientGrandTotal
        } = body;

        if (!tableId || !items?.length) {
            return NextResponse.json({ success: false, error: 'tableId and items are required' }, { status: 400 });
        }

        const db = getDb() as unknown as {
            table: {
                findFirst: (args: Record<string, unknown>) => Promise<Record<string, unknown> | null>;
                update: (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
            };
            menuItem: {
                findMany: (args: Record<string, unknown>) => Promise<Array<{ id: string; name: string; price: unknown }>>;
            };
            restaurantSettings: {
                findUnique: (args: Record<string, unknown>) => Promise<{ gstRate?: number; serviceChargeRate?: number } | null>;
            };
            order: {
                create: (args: Record<string, unknown>) => Promise<{ id: string }>;
            };
        };

        // Validate table belongs to this client
        const table = await db.table.findFirst({
            where: { id: tableId, clientId: user.clientId },
        });
        if (!table) {
            return NextResponse.json({ success: false, error: 'Table not found' }, { status: 404 });
        }

        // Fetch menu items to get prices
        const menuItemIds = items.map((i: { menuItemId: string }) => i.menuItemId);
        const menuItems = await db.menuItem.findMany({
            where: { id: { in: menuItemIds }, clientId: user.clientId },
            select: { id: true, name: true, price: true },
        });

        const menuMap: Record<string, { name: string; price: number }> = {};
        for (const m of menuItems) menuMap[m.id] = { name: m.name, price: Number(m.price) };

        // Compute billing
        const settings = await db.restaurantSettings.findUnique({
            where: { clientId: user.clientId },
            select: { gstRate: true, serviceChargeRate: true },
        });
        const gstRate = Number(settings?.gstRate ?? 5);
        const serviceRate = Number(settings?.serviceChargeRate ?? 5);

        let subtotal = 0;
        const orderItems = items.map((i: { menuItemId: string; quantity: number }) => {
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

        if (Number(discountAmount || 0) < 0) {
            return NextResponse.json({ success: false, error: 'Discount amount cannot be negative' }, { status: 400 });
        }
        if (Number(discountAmount || 0) > subtotal) {
            return NextResponse.json({ success: false, error: 'Discount amount cannot exceed subtotal' }, { status: 400 });
        }
        if (taxAmount !== undefined && Number(taxAmount) < 0) {
            return NextResponse.json({ success: false, error: 'Tax amount cannot be negative' }, { status: 400 });
        }

        const calculatedGst = taxAmount !== undefined ? Math.max(0, Number(taxAmount)) : Math.round(subtotal * gstRate) / 100;
        const serviceAmount = Math.round(subtotal * serviceRate) / 100;
        const calculatedDiscount = Math.max(0, Number(discountAmount || 0));
        const calculatedGrandTotal = clientGrandTotal !== undefined 
            ? Math.max(0, Number(clientGrandTotal)) 
            : Math.round(subtotal - calculatedDiscount + calculatedGst + serviceAmount);

        // Create order in BILL_REQUESTED state (Preview state, NOT closed yet!)
        const order = await db.order.create({
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

        // Set table to ACTIVE when bill is generated
        await db.table.update({
            where: { id: tableId },
            data: { status: 'ACTIVE' },
        });

        return NextResponse.json({ success: true, orderId: order.id, grandTotal: calculatedGrandTotal });

    } catch (err: unknown) {
        const error = err as Error;
        console.error('[DIRECT_BILL]', error);
        return NextResponse.json({ success: false, error: error.message || 'Internal error' }, { status: 500 });
    }
}
