/**
 * HQ Plans CRUD API
 * 
 * Control-Plane authority for platform subscription plans.
 * Only accessible by authenticated Super Admins.
 * 
 * GET  /api/hq/plans         → List all plans
 * POST /api/hq/plans         → Create a new plan
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifySuperAdminToken } from "@/lib/hq/auth";
import { cookies } from "next/headers";

// ─── Auth Guard ───
async function requireSuperAdmin() {
    const cookieStore = await cookies();
    const token = cookieStore.get("hq-token")?.value;
    if (!token) return null;
    return verifySuperAdminToken(token);
}

// ─── GET: List all plans ───
export async function GET() {
    const admin = await requireSuperAdmin();
    if (!admin) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const plans = await prisma.plan.findMany({
            orderBy: { price: 'asc' },
            include: {
                _count: {
                    select: { subscriptions: true },
                },
            },
        });

        // Enrich with active subscription count
        const enriched = plans.map((plan: any) => ({
            id: plan.id,
            name: plan.name,
            code: plan.code,
            price: parseFloat(plan.price),
            features: plan.features,
            limits: plan.limits,
            isActive: plan.isActive,
            activeSubscriptions: plan._count.subscriptions,
            createdAt: plan.createdAt,
            updatedAt: plan.updatedAt,
        }));

        return NextResponse.json({ plans: enriched });
    } catch (error: any) {
        console.error("[HQ/PLANS] GET error:", error.message);
        return NextResponse.json({ error: "Failed to fetch plans" }, { status: 500 });
    }
}

// ─── POST: Create a new plan ───
export async function POST(req: NextRequest) {
    const admin = await requireSuperAdmin();
    if (!admin) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { name, code, price, features, limits } = body;

        // Validation
        if (!name || !code || price === undefined) {
            return NextResponse.json(
                { error: "Missing required fields: name, code, price" },
                { status: 400 }
            );
        }

        const validCodes = ['STARTER', 'GROWTH', 'ELITE'];
        if (!validCodes.includes(code)) {
            return NextResponse.json(
                { error: `Invalid plan code. Must be one of: ${validCodes.join(', ')}` },
                { status: 400 }
            );
        }

        // Check for duplicate
        const existing = await prisma.plan.findFirst({
            where: { OR: [{ name }, { code }] },
        });
        if (existing) {
            return NextResponse.json(
                { error: "A plan with that name or code already exists" },
                { status: 409 }
            );
        }

        const plan = await prisma.plan.create({
            data: {
                name,
                code: code as any, // Cast if enum type is still being fussy in some contexts, though tsc says it's fine
                price: parseFloat(price),
                features: features || {},
                limits: limits || {},
            },
        });

        console.log(`[HQ/PLANS] Created plan: ${plan.name} (${plan.code}) by ${admin.email}`);

        return NextResponse.json({ plan }, { status: 201 });

    } catch (error: any) {
        console.error("[HQ/PLANS] POST error:", error.message);
        return NextResponse.json({ error: "Failed to create plan" }, { status: 500 });
    }
}
