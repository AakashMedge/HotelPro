
import { NextRequest, NextResponse } from "next/server";
import { prisma, getDb } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { syncTenantSchema } from "@/lib/db-sync";
import { startOfDay, endOfDay, subDays, startOfWeek, endOfWeek } from "date-fns";

export async function GET(request: NextRequest) {
    try {
        console.log("--- [LEDGER_STABLE_V6_RESILIENT] ---");
        const user = await requireRole(["MANAGER", "ADMIN"]);
        const { clientId } = user;

        const db = getDb();

        const { searchParams } = new URL(request.url);
        const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
        const limit = 15;
        const skip = (page - 1) * limit;

        const range = searchParams.get('range') || 'all';
        const search = searchParams.get('search') || '';
        const payMethod = searchParams.get('paymentMethod') || '';

        // 1. FILTER CONSTRUCTION
        const baseFilter: any = {
            clientId,
            status: { in: ['CLOSED', 'BILL_REQUESTED'] }
        };

        if (range !== 'all') {
            const now = new Date();
            if (range === 'today') baseFilter.updatedAt = { gte: startOfDay(now), lte: endOfDay(now) };
            else if (range === 'yesterday') {
                const y = subDays(now, 1);
                baseFilter.updatedAt = { gte: startOfDay(y), lte: endOfDay(y) };
            } else if (range === 'week') {
                baseFilter.updatedAt = { gte: startOfWeek(now), lte: endOfWeek(now) };
            }
        }

        if (search) {
            baseFilter.OR = [
                { id: { contains: search, mode: 'insensitive' } },
                { customerName: { contains: search, mode: 'insensitive' } }
            ];
        }

        // 2. RESILIENT FETCHING
        // We fetch all records matching date/status, then filter paymentMethod in JS 
        // to avoid "Unknown Field" errors while Prisma hot-reloads.
        const allMatchingOrders = await (db.order as any).findMany({
            where: baseFilter,
            orderBy: { updatedAt: 'desc' },
            include: {
                table: { select: { tableCode: true } },
                items: true,
                auditLogs: {
                    take: 5,
                    orderBy: { createdAt: 'desc' },
                    include: { actor: { select: { name: true } } }
                }
            }
        });

        // 3. JAVASCRIPT-SIDE RECONCILIATION (Ultra Stable)
        let filtered = allMatchingOrders;
        if (payMethod) {
            filtered = allMatchingOrders.filter((o: any) =>
                (o.paymentMethod || 'CASH').toUpperCase() === payMethod.toUpperCase()
            );
        }

        const totalCount = filtered.length;
        const paginated = filtered.slice(skip, skip + limit);

        const ledger = paginated.map((o: any) => ({
            id: o.id,
            table: o.table?.tableCode || 'Gen',
            customer: o.customerName || 'Walk-in Guest',
            total: Number(o.grandTotal || 0),
            subtotal: Number(o.subtotal || 0),
            discount: Number(o.discountAmount || 0),
            gst: Number(o.gstAmount || 0),
            serviceCharge: Number(o.serviceChargeAmount || 0),
            date: o.updatedAt,
            status: o.status,
            paymentMethod: o.paymentMethod || 'CASH',
            itemsList: o.items || [],
            auditTrail: o.auditLogs?.map((l: any) => ({
                action: l.action,
                time: l.createdAt,
                user: l.actor?.name || 'Staff'
            })) || []
        }));

        // 4. ANALYTICS (Derived from the filtered set)
        const analytics = filtered.reduce((acc: any, curr: any) => {
            acc.totalRevenue += Number(curr.grandTotal || 0);
            acc.totalGst += Number(curr.gstAmount || 0);
            acc.totalDiscount += Number(curr.discountAmount || 0);
            return acc;
        }, { totalRevenue: 0, totalGst: 0, totalDiscount: 0 });

        return NextResponse.json({
            success: true,
            ledger,
            analytics: {
                ...analytics,
                transactionCount: totalCount
            },
            pagination: {
                total: totalCount,
                pages: Math.ceil(totalCount / limit) || 1,
                currentPage: page
            }
        });

    } catch (error: any) {
        console.error("[LEDGER_STABLE_ERROR]", error.message);
        return NextResponse.json({ success: false, error: "Snapshot Failed", details: error.message }, { status: 500 });
    }
}
