import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-12-18.acacia' as any,
});

export async function POST(req: Request) {
    try {
        const user = await requireRole(['ADMIN']);
        const { sessionId } = await req.json();

        if (!sessionId) {
            return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
        }

        console.log(`🔍 Manual Sync started for Session: ${sessionId}`);

        // 1. Fetch the session from Stripe
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (session.status !== 'complete') {
            return NextResponse.json({ error: `Payment not complete (Status: ${session.status})` }, { status: 400 });
        }

        const metadata = session.metadata;
        if (!metadata?.clientId || !metadata?.planCode) {
            return NextResponse.json({ error: 'Missing metadata in Stripe session' }, { status: 400 });
        }

        const clientId = metadata.clientId;
        const planCode = metadata.planCode;

        // Verify this matches the user's client
        if (clientId !== user.clientId) {
            return NextResponse.json({ error: 'Client ID mismatch' }, { status: 403 });
        }

        // 2. Perform the same sync as the webhook
        const plan = await prisma.plan.findUnique({
            where: { code: planCode }
        });

        if (!plan) throw new Error('Plan not found: ' + planCode);

        // Update Subscription
        await prisma.subscription.upsert({
            where: { clientId },
            update: {
                planId: plan.id,
                status: 'ACTIVE',
                currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                updatedAt: new Date(),
            },
            create: {
                clientId,
                planId: plan.id,
                status: 'ACTIVE',
                currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            }
        });

        // Update Client
        await prisma.client.update({
            where: { id: clientId },
            data: {
                status: 'ACTIVE',
                plan: planCode as any,
                updatedAt: new Date()
            }
        });

        // Create Payment Record (if not exists)
        await prisma.saaSPayment.upsert({
            where: { stripeSessionId: session.id },
            update: {},
            create: {
                clientId,
                stripeSessionId: session.id,
                stripePaymentIntentId: session.payment_intent as string || null,
                amount: session.amount_total ? session.amount_total / 100 : 0,
                currency: session.currency || 'inr',
                status: 'PAID',
                plan: planCode,
                paidAt: new Date(),
            }
        });

        console.log(`✅ Manual sync successful for ${clientId}`);
        return NextResponse.json({ success: true, plan: planCode });

    } catch (error: any) {
        console.error('❌ Manual Sync Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
