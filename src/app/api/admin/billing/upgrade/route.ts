/**
 * POST /api/admin/billing/upgrade
 * 
 * Handles plan upgrade/downgrade requests.
 * For now: validates the request and updates the plan directly.
 * Future: will integrate with Razorpay for payment processing.
 * 
 * Body: { planCode: 'GROWTH' | 'ELITE' | 'STARTER' }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/server';
import { prisma } from '@/lib/db';

const VALID_PLANS = ['STARTER', 'GROWTH', 'ELITE'] as const;

const PLAN_HIERARCHY: Record<string, number> = {
    STARTER: 1,
    GROWTH: 2,
    ELITE: 3,
};

export async function POST(req: NextRequest) {
    try {
        const user = await requireRole(['ADMIN']);
        if (!user?.clientId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { planCode } = body;

        if (!planCode || !VALID_PLANS.includes(planCode)) {
            return NextResponse.json(
                { error: `Invalid plan code. Must be one of: ${VALID_PLANS.join(', ')}` },
                { status: 400 }
            );
        }

        // Get current client info
        const client = await prisma.client.findUnique({
            where: { id: user.clientId },
            select: { plan: true, name: true },
        });

        if (!client) {
            return NextResponse.json({ error: 'Client not found' }, { status: 404 });
        }

        const currentPlan = String(client.plan);
        const isUpgrade = PLAN_HIERARCHY[planCode] > PLAN_HIERARCHY[currentPlan];
        const isDowngrade = PLAN_HIERARCHY[planCode] < PLAN_HIERARCHY[currentPlan];
        const isSame = planCode === currentPlan;

        if (isSame) {
            return NextResponse.json(
                { error: 'You are already on this plan' },
                { status: 400 }
            );
        }

        // ============================================
        // TODO: Razorpay Integration
        // 
        // For upgrades:
        //   1. Create Razorpay order with pro-rata amount
        //   2. Return order_id for client-side checkout
        //   3. On payment success webhook → update plan
        //
        // For downgrades:
        //   1. Schedule downgrade at end of billing cycle
        //   2. Show warning about feature loss
        //   3. On cycle end → update plan
        //
        // For now: direct update (no payment)
        // ============================================

        // Find the target plan record
        const targetPlan = await (prisma.plan as any).findFirst({
            where: { code: planCode },
        });

        // Update client plan
        await prisma.client.update({
            where: { id: user.clientId },
            data: { plan: planCode as any },
        });

        // Update or create subscription link
        if (targetPlan) {
            await (prisma.subscription as any).upsert({
                where: { clientId: user.clientId },
                update: { planId: targetPlan.id },
                create: {
                    clientId: user.clientId,
                    planId: targetPlan.id,
                    status: 'ACTIVE',
                },
            });
        }

        return NextResponse.json({
            success: true,
            message: isUpgrade
                ? `🎉 Upgraded to ${planCode}! New features are now active.`
                : `Plan changed to ${planCode}. Changes take effect immediately.`,
            previousPlan: currentPlan,
            newPlan: planCode,
            type: isUpgrade ? 'upgrade' : 'downgrade',
            // TODO: Add razorpay_order_id when payment integration is done
        });

    } catch (error) {
        console.error('Upgrade error:', error);
        return NextResponse.json({ error: 'Failed to process plan change' }, { status: 500 });
    }
}
