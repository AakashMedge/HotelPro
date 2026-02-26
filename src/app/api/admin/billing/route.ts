/**
 * GET /api/admin/billing
 * 
 * Returns real subscription data for the admin billing page:
 * - Current plan details (name, price, features, limits)
 * - Subscription status & renewal info
 * - Usage stats (tables, menu items currently in use)
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/server';
import { getEntitlements } from '@/lib/services/entitlements';
import { prisma } from '@/lib/db';

export async function GET() {
    try {
        const user = await requireRole(['ADMIN']);
        if (!user?.clientId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 1. Get entitlements (plan features + limits)
        const entitlements = await getEntitlements(user.clientId);

        // 2. Get subscription details (dates, status)
        const subscription = await prisma.subscription.findUnique({
            where: { clientId: user.clientId },
            include: { plan: true },
        });

        // 3. Get payment history
        const payments = await prisma.saaSPayment.findMany({
            where: { clientId: user.clientId },
            orderBy: { paidAt: 'desc' },
            take: 10
        });

        // 4. Get current usage
        const [tableCount, menuItemCount] = await Promise.all([
            prisma.table.count({ where: { clientId: user.clientId } }),
            prisma.menuItem.count({ where: { clientId: user.clientId } }),
        ]);

        // 5. Build response
        const plan = subscription?.plan;
        const planPrice = plan ? Number(plan.price) : 0;

        return NextResponse.json({
            plan: {
                name: plan?.name || entitlements.planName,
                code: plan?.code || entitlements.planName,
                price: planPrice,
                features: entitlements.features,
                limits: entitlements.limits,
            },
            subscription: {
                status: subscription?.status || entitlements.subscriptionStatus || 'ACTIVE',
                startDate: subscription?.startDate || subscription?.createdAt || null,
                lastBillingDate: subscription?.updatedAt || subscription?.createdAt,
                nextBillingDate: subscription?.currentPeriodEnd || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                version: subscription?.version || entitlements.version || 1,
            },
            usage: {
                tables: {
                    current: tableCount,
                    limit: entitlements.limits?.tables || 0,
                    percentage: entitlements.limits?.tables
                        ? Math.round((tableCount / entitlements.limits.tables) * 100)
                        : 0,
                },
                menuItems: {
                    current: menuItemCount,
                    limit: entitlements.limits?.menuItems || 0,
                    percentage: entitlements.limits?.menuItems
                        ? Math.round((menuItemCount / entitlements.limits.menuItems) * 100)
                        : 0,
                },
            },
            payments: payments.map(p => ({
                id: p.id,
                amount: Number(p.amount),
                currency: p.currency,
                plan: p.plan,
                status: p.status,
                paidAt: p.paidAt,
                sessionId: p.stripeSessionId
            })),
            // All 3 plans for comparison
            allPlans: [
                { name: 'Starter', code: 'STARTER', price: 1999, highlight: (plan?.code || entitlements.planName) === 'STARTER' },
                { name: 'Growth', code: 'GROWTH', price: 4999, highlight: (plan?.code || entitlements.planName) === 'GROWTH' },
                { name: 'Elite', code: 'ELITE', price: 19999, highlight: (plan?.code || entitlements.planName) === 'ELITE' },
            ],
        });
    } catch (error: any) {
        console.error('Billing API Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
