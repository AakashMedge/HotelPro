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
        const subscription = await (prisma.subscription as any).findUnique({
            where: { clientId: user.clientId },
            include: { plan: true },
        });

        // 3. Get current usage
        const [tableCount, menuItemCount] = await Promise.all([
            prisma.table.count({ where: { clientId: user.clientId } }),
            prisma.menuItem.count({ where: { clientId: user.clientId } }),
        ]);

        // 4. Build response
        const plan = subscription?.plan;
        const planPrice = plan ? Number(plan.price) : 0;

        // Calculate next billing date (30 days from last update or creation)
        const lastBillingDate = subscription?.updatedAt || subscription?.createdAt || new Date();
        const nextBillingDate = new Date(lastBillingDate);
        nextBillingDate.setDate(nextBillingDate.getDate() + 30);

        return NextResponse.json({
            plan: {
                name: entitlements.planName,
                code: plan?.code || entitlements.planName,
                price: planPrice,
                features: entitlements.features,
                limits: entitlements.limits,
            },
            subscription: {
                status: entitlements.subscriptionStatus || subscription?.status || 'ACTIVE',
                startDate: subscription?.createdAt || null,
                lastBillingDate: lastBillingDate,
                nextBillingDate: nextBillingDate,
                version: entitlements.version || 1,
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
            // All 3 plans for comparison
            allPlans: [
                { name: 'Starter', code: 'STARTER', price: 1999, highlight: entitlements.planName === 'Starter' || entitlements.planName === 'STARTER' },
                { name: 'Growth', code: 'GROWTH', price: 4999, highlight: entitlements.planName === 'Growth' || entitlements.planName === 'GROWTH' },
                { name: 'Elite', code: 'ELITE', price: 19999, highlight: entitlements.planName === 'Elite' || entitlements.planName === 'ELITE' },
            ],
        });
    } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
}
