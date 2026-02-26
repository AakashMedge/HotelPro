import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
    try {
        const plans = await prisma.plan.findMany({
            where: { isActive: true },
            orderBy: { price: 'asc' },
        });

        const formattedPlans = plans.map((plan: any) => ({
            id: plan.id,
            name: plan.name,
            code: plan.code,
            price: parseFloat(plan.price.toString()),
            features: plan.features,
            limits: plan.limits,
        }));

        return NextResponse.json({ plans: formattedPlans });
    } catch (error: any) {
        console.error("[API/PLANS] GET error:", error.message);
        return NextResponse.json({ error: "Failed to fetch plans" }, { status: 500 });
    }
}
