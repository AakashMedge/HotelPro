
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/server";

/**
 * GET /api/settings
 * Fetch basic settings including accessCode from Client model
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

        // ─── Fetch Access Code from Client model ───
        const client = await (prisma.client as any).findUnique({
            where: { id: session.clientId },
            select: { accessCode: true }
        });

        return NextResponse.json({
            success: true,
            settings: {
                ...settings,
                gstRate: Number(settings.gstRate),
                serviceChargeRate: Number(settings.serviceChargeRate),
                accessCode: client?.accessCode || ""
            }
        });
    } catch (error) {
        console.error("[SETTINGS_GET] Error:", error);
        return NextResponse.json({ success: false, error: "Failed to fetch settings" }, { status: 500 });
    }
}

/**
 * PATCH /api/settings
 * Admin/Manager only: Update restaurant settings and access code
 */
export async function PATCH(request: NextRequest) {
    try {
        const session = await getCurrentUser();
        if (!session || !["ADMIN", "MANAGER"].includes(session.role)) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { businessName, gstin, gstRate, serviceChargeRate, currency, currencySymbol, accessCode } = body;

        // 1. Update Restaurant Settings
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

        // 2. Update Access Code on Client (if provided)
        let finalAccessCode = "";
        if (accessCode !== undefined) {
            const normalizedCode = accessCode.trim().toUpperCase();

            // Check for uniqueness (if changed)
            if (normalizedCode) {
                const existing = await (prisma.client as any).findFirst({
                    where: {
                        accessCode: normalizedCode,
                        id: { not: session.clientId }
                    }
                });

                if (existing) {
                    return NextResponse.json({ success: false, error: "Access code is already taken by another hotel." }, { status: 409 });
                }
            }

            const updatedClient = await (prisma.client as any).update({
                where: { id: session.clientId },
                data: {
                    accessCode: normalizedCode || null,
                    accessCodeUpdatedAt: new Date()
                }
            });
            finalAccessCode = updatedClient.accessCode || "";
        }

        return NextResponse.json({
            success: true,
            settings: {
                ...updated,
                gstRate: Number(updated.gstRate),
                serviceChargeRate: Number(updated.serviceChargeRate),
                accessCode: finalAccessCode
            }
        });
    } catch (error) {
        console.error("[SETTINGS_PATCH] Error:", error);
        return NextResponse.json({ success: false, error: "Failed to update settings" }, { status: 500 });
    }
}
