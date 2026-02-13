/**
 * HQ Plan Detail API
 * 
 * PUT    /api/hq/plans/[planId]   → Update a plan
 * DELETE /api/hq/plans/[planId]   → Deactivate a plan (soft delete)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifySuperAdminToken } from "@/lib/hq/auth";
import { cookies } from "next/headers";
import { syncAllDedicatedTenants } from "@/lib/services/entitlement-sync";

// ─── Auth Guard ───
async function requireSuperAdmin() {
    const cookieStore = await cookies();
    const token = cookieStore.get("hq-token")?.value;
    if (!token) return null;
    return verifySuperAdminToken(token);
}

// ─── PUT: Update a plan ───
export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ planId: string }> }
) {
    const admin = await requireSuperAdmin();
    if (!admin) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { planId } = await params;

    try {
        const body = await req.json();
        const { name, price, features, limits, isActive } = body;

        const existing = await (prisma.plan as any).findUnique({
            where: { id: planId },
        });

        if (!existing) {
            return NextResponse.json({ error: "Plan not found" }, { status: 404 });
        }

        // Build update data (only update provided fields)
        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (price !== undefined) updateData.price = parseFloat(price);
        if (features !== undefined) updateData.features = features;
        if (limits !== undefined) updateData.limits = limits;
        if (isActive !== undefined) updateData.isActive = isActive;

        const plan = await (prisma.plan as any).update({
            where: { id: planId },
            data: updateData,
        });

        // If features or limits changed, bump version on all subscriptions
        // and trigger entitlement sync to tenant databases
        if (features !== undefined || limits !== undefined) {
            await (prisma.subscription as any).updateMany({
                where: { planId },
                data: { version: { increment: 1 } },
            });

            // Trigger async sync to dedicated tenants
            syncAllDedicatedTenants().then((result) => {
                console.log(`[HQ/PLANS] Bulk sync after plan update: ${result.succeeded}/${result.total} succeeded`);
            }).catch((err) => {
                console.error(`[HQ/PLANS] Bulk sync error:`, err.message);
            });
        }

        console.log(`[HQ/PLANS] Updated plan: ${plan.name} by ${admin.email}`);

        return NextResponse.json({ plan });

    } catch (error: any) {
        console.error("[HQ/PLANS] PUT error:", error.message);
        return NextResponse.json({ error: "Failed to update plan" }, { status: 500 });
    }
}

// ─── DELETE: Deactivate a plan (soft delete) ───
export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ planId: string }> }
) {
    const admin = await requireSuperAdmin();
    if (!admin) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { planId } = await params;

    try {
        const plan = await (prisma.plan as any).findUnique({
            where: { id: planId },
            include: { _count: { select: { subscriptions: true } } },
        });

        if (!plan) {
            return NextResponse.json({ error: "Plan not found" }, { status: 404 });
        }

        // Don't hard-delete if there are active subscriptions
        if (plan._count.subscriptions > 0) {
            await (prisma.plan as any).update({
                where: { id: planId },
                data: { isActive: false },
            });
            console.log(`[HQ/PLANS] Soft-deactivated plan: ${plan.name} (${plan._count.subscriptions} active subs) by ${admin.email}`);
            return NextResponse.json({
                message: `Plan deactivated (${plan._count.subscriptions} active subscriptions preserved)`,
            });
        }

        // Safe to hard delete
        await (prisma.plan as any).delete({ where: { id: planId } });
        console.log(`[HQ/PLANS] Deleted plan: ${plan.name} by ${admin.email}`);

        return NextResponse.json({ message: "Plan deleted" });

    } catch (error: any) {
        console.error("[HQ/PLANS] DELETE error:", error.message);
        return NextResponse.json({ error: "Failed to delete plan" }, { status: 500 });
    }
}
