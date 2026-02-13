/**
 * HQ Single Client API
 * 
 * GET    /api/hq/clients/[clientId] - Get client details
 * PATCH  /api/hq/clients/[clientId] - Update client
 * DELETE /api/hq/clients/[clientId] - Delete client (dangerous!)
 * 
 * Protected: Super Admin only
 */

import { NextRequest, NextResponse } from "next/server";
import { getClientById, updateClient, suspendClient, activateClient, archiveClient, restoreClient } from "@/lib/hq/client-actions";
import { HQApiResponse, UpdateClientInput } from "@/lib/types/hq.types";
import { requireSuperAdmin } from "@/lib/hq/auth";

// ============================================
// GET - Get Single Client Details
// ============================================

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ clientId: string }> }
) {
    try {
        const { clientId } = await params;

        // 1. Verify Super Admin (Throws error if fails)
        await requireSuperAdmin();

        // 2. Fetch client
        const client = await getClientById(clientId);

        if (!client) {
            return NextResponse.json<HQApiResponse>(
                { success: false, error: "Client not found." },
                { status: 404 }
            );
        }

        return NextResponse.json<HQApiResponse>({
            success: true,
            data: client
        });

    } catch (error: any) {
        console.error("[API] GET /api/hq/clients/[id] error:", error);
        return NextResponse.json<HQApiResponse>(
            { success: false, error: error.message || "Unauthorized access." },
            { status: error.message?.includes('required') ? 401 : 500 }
        );
    }
}

// ============================================
// PATCH - Update Client
// ============================================

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ clientId: string }> }
) {
    try {
        const { clientId } = await params;

        // 1. Verify Super Admin (Throws error if fails)
        await requireSuperAdmin();

        // 2. Parse body
        const body = await request.json();

        // 3. Handle special actions
        if (body.action === 'suspend') {
            const result = await suspendClient(clientId, body.reason || 'Suspended by Super Admin');
            return NextResponse.json<HQApiResponse>({
                success: result.success,
                error: result.error,
                message: result.success ? "Client suspended." : undefined
            });
        }

        if (body.action === 'activate') {
            const result = await activateClient(clientId);
            return NextResponse.json<HQApiResponse>({
                success: result.success,
                error: result.error,
                message: result.success ? "Client activated." : undefined
            });
        }

        if (body.action === 'archive') {
            const result = await archiveClient(clientId);
            return NextResponse.json<HQApiResponse>({
                success: result.success,
                error: result.error,
                message: result.success ? "Client moved to archive." : undefined
            });
        }

        if (body.action === 'restore') {
            const result = await restoreClient(clientId);
            return NextResponse.json<HQApiResponse>({
                success: result.success,
                error: result.error,
                message: result.success ? "Client restored to active status." : undefined
            });
        }

        // 4. Regular update
        const input: UpdateClientInput = {
            name: body.name,
            plan: body.plan,
            status: body.status,
            domain: body.domain
        };

        const result = await updateClient(clientId, input);

        if (!result.success) {
            return NextResponse.json<HQApiResponse>(
                { success: false, error: result.error },
                { status: 400 }
            );
        }

        return NextResponse.json<HQApiResponse>({
            success: true,
            message: "Client updated successfully."
        });

    } catch (error: any) {
        console.error("[API] PATCH /api/hq/clients/[id] error:", error);
        return NextResponse.json<HQApiResponse>(
            { success: false, error: error.message || "Unauthorized access." },
            { status: error.message?.includes('required') ? 401 : 500 }
        );
    }
}

// ============================================
// DELETE - Delete Client (Dangerous!)
// ============================================

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ clientId: string }> }
) {
    try {
        const { clientId } = await params;

        // 1. Verify Super Admin (Throws error if fails)
        await requireSuperAdmin();

        // 2. For safety, require confirmation in body
        const body = await request.json().catch(() => ({}));
        if (body.confirmDelete !== true) {
            return NextResponse.json<HQApiResponse>(
                { success: false, error: "Deletion requires explicit confirmation. Send { confirmDelete: true }." },
                { status: 400 }
            );
        }

        // NOTE: In production, we'll use soft-delete (archive)
        const result = await archiveClient(clientId);

        if (!result.success) {
            return NextResponse.json<HQApiResponse>(
                { success: false, error: result.error },
                { status: 400 }
            );
        }

        return NextResponse.json<HQApiResponse>(
            { success: true, message: "Client successfully archived and all access revoked." }
        );

    } catch (error: any) {
        console.error("[API] DELETE /api/hq/clients/[id] error:", error);
        return NextResponse.json<HQApiResponse>(
            { success: false, error: error.message || "Unauthorized access." },
            { status: error.message?.includes('required') ? 401 : 500 }
        );
    }
}
