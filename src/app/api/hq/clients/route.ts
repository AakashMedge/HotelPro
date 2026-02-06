/**
 * HQ Clients API
 * 
 * GET  /api/hq/clients - List all clients
 * POST /api/hq/clients - Create new client
 * 
 * Protected: Super Admin only
 */

import { NextRequest, NextResponse } from "next/server";
import { getClientsWithStats, createNewClient, isValidSlug } from "@/lib/hq/client-actions";
import { CreateClientInput, HQApiResponse } from "@/lib/types/hq.types";
import { ClientPlan } from "@prisma/client";
import { requireSuperAdmin } from "@/lib/hq/auth";

// ============================================
// GET - List All Clients
// ============================================

export async function GET() {
    try {
        // 1. Verify Super Admin (Throws error if fails)
        await requireSuperAdmin();

        // 2. Fetch clients
        const clients = await getClientsWithStats();

        return NextResponse.json<HQApiResponse>({
            success: true,
            data: {
                clients,
                totalCount: clients.length
            }
        });

    } catch (error: any) {
        console.error("[API] GET /api/hq/clients error:", error);
        return NextResponse.json<HQApiResponse>(
            { success: false, error: error.message || "Unauthorized access." },
            { status: error.message?.includes('required') ? 401 : 500 }
        );
    }
}

// ============================================
// POST - Create New Client
// ============================================

export async function POST(request: NextRequest) {
    try {
        // 1. Verify Super Admin (Throws error if fails)
        await requireSuperAdmin();

        // 2. Parse request body
        const body = await request.json();

        // 3. Validate required fields
        const requiredFields = ['name', 'slug', 'plan', 'adminUsername', 'adminName', 'adminPassword'];
        for (const field of requiredFields) {
            if (!body[field]) {
                return NextResponse.json<HQApiResponse>(
                    { success: false, error: `Missing required field: ${field}` },
                    { status: 400 }
                );
            }
        }

        // 4. Validate slug format
        if (!isValidSlug(body.slug)) {
            return NextResponse.json<HQApiResponse>(
                { success: false, error: "Invalid slug format. Use only lowercase letters, numbers, and hyphens. Min 3, max 30 characters." },
                { status: 400 }
            );
        }

        // 5. Validate plan
        const validPlans: ClientPlan[] = ['BASIC', 'ADVANCE', 'PREMIUM', 'BUSINESS'];
        if (!validPlans.includes(body.plan)) {
            return NextResponse.json<HQApiResponse>(
                { success: false, error: "Invalid plan. Choose from: BASIC, ADVANCE, PREMIUM, BUSINESS" },
                { status: 400 }
            );
        }

        // 6. Validate password strength
        if (body.adminPassword.length < 8) {
            return NextResponse.json<HQApiResponse>(
                { success: false, error: "Password must be at least 8 characters." },
                { status: 400 }
            );
        }

        // 7. Create the client
        const input: CreateClientInput = {
            name: body.name,
            slug: body.slug,
            plan: body.plan as ClientPlan,
            adminUsername: body.adminUsername,
            adminName: body.adminName,
            adminEmail: body.adminEmail || '',
            adminPassword: body.adminPassword,
            domain: body.domain
        };

        const result = await createNewClient(input);

        if (!result.success) {
            return NextResponse.json<HQApiResponse>(
                { success: false, error: result.error },
                { status: 400 }
            );
        }

        return NextResponse.json<HQApiResponse>({
            success: true,
            data: { clientId: result.clientId },
            message: "Client created successfully!"
        }, { status: 201 });

    } catch (error: any) {
        console.error("[API] POST /api/hq/clients error:", error);
        return NextResponse.json<HQApiResponse>(
            { success: false, error: error.message || "Failed to create client." },
            { status: error.message?.includes('required') ? 401 : 500 }
        );
    }
}

