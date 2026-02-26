/**
 * HQ Subscriptions API
 * 
 * Manages the lifecycle of client subscriptions.
 * 
 * GET  /api/hq/subscriptions         → List all subscriptions
 * POST /api/hq/subscriptions         → Create/assign subscription to a client
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifySuperAdminToken } from "@/lib/hq/auth";
import { cookies } from "next/headers";
import { syncEntitlementsToTenant } from "@/lib/services/entitlement-sync";

// ─── Auth Guard ───
async function requireSuperAdmin() {
    const cookieStore = await cookies();
    const token = cookieStore.get("hq-token")?.value;
    if (!token) return null;
    return verifySuperAdminToken(token);
}

// ─── GET: List all subscriptions ───
export async function GET() {
    const admin = await requireSuperAdmin();
    if (!admin) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const [subscriptions, payments] = await Promise.all([
            prisma.subscription.findMany({
                include: {
                    client: { select: { id: true, name: true, slug: true, status: true, ownerEmail: true, stripeCustomerId: true } },
                    plan: { select: { id: true, name: true, code: true, price: true } },
                },
                orderBy: { updatedAt: 'desc' },
            }),
            prisma.saaSPayment.findMany({
                include: { client: { select: { name: true, slug: true, ownerEmail: true } } },
                orderBy: { paidAt: 'desc' },
                take: 50
            })
        ]);

        return NextResponse.json({ subscriptions, payments });
    } catch (error: any) {
        console.error("[HQ/SUBSCRIPTIONS] GET error:", error.message);
        return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
    }
}

// ─── POST: Create/assign a subscription ───
export async function POST(req: NextRequest) {
    const admin = await requireSuperAdmin();
    if (!admin) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { clientId, planId, status, billingCycle } = body;

        if (!clientId || !planId) {
            return NextResponse.json(
                { error: "Missing required fields: clientId, planId" },
                { status: 400 }
            );
        }

        // Verify client and plan exist
        const [client, plan] = await Promise.all([
            (prisma.client as any).findUnique({ where: { id: clientId } }),
            (prisma.plan as any).findUnique({ where: { id: planId } }),
        ]);

        if (!client) {
            return NextResponse.json({ error: "Client not found" }, { status: 404 });
        }
        if (!plan) {
            return NextResponse.json({ error: "Plan not found" }, { status: 404 });
        }

        // Check if subscription already exists
        const existing = await (prisma.subscription as any).findUnique({
            where: { clientId },
        });

        let subscription;

        if (existing) {
            // Update existing subscription (plan change)
            const previousPlanId = existing.planId;
            const previousStatus = existing.status;

            subscription = await (prisma.subscription as any).update({
                where: { clientId },
                data: {
                    planId,
                    status: status || existing.status,
                    billingCycle: billingCycle || existing.billingCycle,
                    version: { increment: 1 },
                },
                include: { plan: true },
            });

            // Audit the change
            await (prisma.subscriptionAudit as any).create({
                data: {
                    subscriptionId: subscription.id,
                    previousPlanId,
                    newPlanId: planId,
                    previousStatus,
                    newStatus: subscription.status,
                    reason: previousPlanId !== planId ? 'plan_change' : 'status_update',
                    metadata: { changedBy: admin.email },
                },
            });

            // Also update the client's legacy plan field for backward compat
            await (prisma.client as any).update({
                where: { id: clientId },
                data: { plan: plan.code },
            });

        } else {
            // Create new subscription
            subscription = await (prisma.subscription as any).create({
                data: {
                    clientId,
                    planId,
                    status: status || 'TRIALING',
                    billingCycle: billingCycle || 'MONTHLY',
                    version: 1,
                    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
                },
                include: { plan: true },
            });

            // Audit
            await (prisma.subscriptionAudit as any).create({
                data: {
                    subscriptionId: subscription.id,
                    newPlanId: planId,
                    newStatus: subscription.status,
                    reason: 'subscription_created',
                    metadata: { createdBy: admin.email },
                },
            });

            // Update legacy plan field
            await (prisma.client as any).update({
                where: { id: clientId },
                data: { plan: plan.code },
            });
        }

        // Trigger entitlement sync for dedicated tenants
        syncEntitlementsToTenant(clientId).then((result) => {
            console.log(`[HQ/SUBSCRIPTIONS] Sync result for ${clientId}:`, result.message);
        }).catch((err) => {
            console.error(`[HQ/SUBSCRIPTIONS] Sync error for ${clientId}:`, err.message);
        });

        console.log(`[HQ/SUBSCRIPTIONS] ${existing ? 'Updated' : 'Created'} subscription for ${client.name} → ${plan.name} by ${admin.email}`);

        return NextResponse.json({ subscription }, { status: existing ? 200 : 201 });

    } catch (error: any) {
        console.error("[HQ/SUBSCRIPTIONS] POST error:", error.message);
        return NextResponse.json({ error: "Failed to manage subscription" }, { status: 500 });
    }
}
