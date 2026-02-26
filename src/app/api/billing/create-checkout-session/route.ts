import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-12-18.acacia' as any, // Use a stable version
});

export async function POST(req: Request) {
    try {
        const user = await requireRole(['ADMIN']);
        if (!user?.clientId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { planCode, billingCycle = 'MONTHLY' } = await req.json();

        // 1. Get Plan from DB
        const plan = await prisma.plan.findUnique({
            where: { code: planCode }
        });

        if (!plan) {
            return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
        }

        // 2. Get Client from DB
        const client = await prisma.client.findUnique({
            where: { id: user.clientId }
        });

        if (!client) {
            return NextResponse.json({ error: 'Client not found' }, { status: 404 });
        }

        // 3. Create Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'inr',
                        product_data: {
                            name: `HotelPro ${plan.name} Plan`,
                            description: `Subscription for ${client.name}`,
                        },
                        unit_amount: Math.round(Number(plan.price) * 100),
                        recurring: {
                            interval: 'month',
                        },
                    },
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/admin/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/pricing?canceled=true`,
            metadata: {
                clientId: client.id,
                planCode: plan.code,
                billingCycle,
            },
            customer_email: client.slug + "@hotelpro.io", // Or real owner email if available
        });

        return NextResponse.json({ url: session.url });
    } catch (error: any) {
        console.error('Stripe Checkout Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
