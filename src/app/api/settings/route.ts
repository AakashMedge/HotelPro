import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/server";

/**
 * GET /api/settings
 * Publicly fetch basic settings like GST rates for the frontend
 */
export async function GET() {
    try {
        const session = await getCurrentUser();
        if (!session) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const settings = await prisma.restaurantSettings.upsert({
            where: { clientId: session.clientId },
            update: {},
            create: {
                clientId: session.clientId,
                businessName: "HotelPro Royal",
                gstin: "GSTIN-29AAACHO",
                gstRate: 5.0,
                serviceChargeRate: 5.0,
                currency: "INR",
                currencySymbol: "₹"
            }
        });

        return NextResponse.json({
            success: true,
            settings: {
                ...settings,
                gstRate: Number(settings.gstRate),
                serviceChargeRate: Number(settings.serviceChargeRate)
            }
        });
    } catch (error) {
        console.error("[SETTINGS_GET] Error:", error);
        return NextResponse.json({ success: false, error: "Failed to fetch settings" }, { status: 500 });
    }
}

/**
 * PATCH /api/settings
 * Admin/Manager only: Update restaurant settings
 */
export async function PATCH(request: NextRequest) {
    try {
        const session = await getCurrentUser();
        if (!session || !["ADMIN", "MANAGER"].includes(session.role)) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { businessName, gstin, gstRate, serviceChargeRate, currency, currencySymbol } = body;

        const updated = await prisma.restaurantSettings.update({
            where: { clientId: session.clientId },
            data: {
                businessName,
                gstin,
                gstRate: gstRate !== undefined ? Number(gstRate) : undefined,
                serviceChargeRate: serviceChargeRate !== undefined ? Number(serviceChargeRate) : undefined,
                currency,
                currencySymbol
            }
        });

        return NextResponse.json({
            success: true,
            settings: {
                ...updated,
                gstRate: Number(updated.gstRate),
                serviceChargeRate: Number(updated.serviceChargeRate)
            }
        });
    } catch (error) {
        console.error("[SETTINGS_PATCH] Error:", error);
        return NextResponse.json({ success: false, error: "Failed to update settings" }, { status: 500 });
    }
}
