import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/db';
import { headers } from 'next/headers';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-12-18.acacia' as any,
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
    console.log('--- 🛡️ STRIPE WEBHOOK START ---');
    const body = await req.text();
    const signature = (await headers()).get('stripe-signature');

    console.log('Webhook Body Length:', body.length);
    console.log('Webhook Signature Present:', !!signature);
    console.log('Webhook Secret Present:', !!webhookSecret);
    console.log('Stripe Key Present:', !!process.env.STRIPE_SECRET_KEY);

    let event: Stripe.Event;

    try {
        if (!signature || !webhookSecret) {
            throw new Error('Missing signature or webhook secret');
        }
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
        console.log(`🔔 Event Verified: ${event.type}`);
    } catch (err: any) {
        console.error(`❌ Webhook signature verification failed: ${err.message}`);
        return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
    }

    // Handle checkout.session.completed
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = session.metadata;

        if (!metadata?.clientId || !metadata?.planCode) {
            console.error('Missing metadata in Stripe session');
            return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
        }

        const clientId = metadata.clientId;
        const planCode = metadata.planCode;

        try {
            // 1. Get the plan to get the ID
            const plan = await prisma.plan.findUnique({
                where: { code: planCode }
            });

            if (!plan) throw new Error('Plan not found for code: ' + planCode);

            // 2. Update Subscription
            const subscription = await prisma.subscription.upsert({
                where: { clientId },
                update: {
                    planId: plan.id,
                    status: 'ACTIVE',
                    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
                    ...({ startDate: new Date() } as any),
                    updatedAt: new Date(),
                },
                create: {
                    clientId,
                    planId: plan.id,
                    status: 'ACTIVE',
                    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    ...({ startDate: new Date() } as any),
                }
            });

            // 3. Create Payment Record (if not exists)
            await (prisma as any).saaSPayment.upsert({
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
                    billingCycle: metadata.billingCycle || 'MONTHLY',
                    paidAt: new Date(),
                }
            });

            // 4. Update Client Status & Plan (Authoritative Sync)
            await prisma.client.update({
                where: { id: clientId },
                data: {
                    status: 'ACTIVE',
                    plan: planCode as any, // Sync the legacy enum field too
                    updatedAt: new Date()
                }
            });

            console.log(`✅ Successfully processed ${planCode} subscription for client ${clientId}`);
        } catch (error) {
            console.error('Error processing webhook data:', error);
            return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
        }
    }

    return NextResponse.json({ received: true });
}
