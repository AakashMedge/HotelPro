/**
 * Admin Access Code Management API
 * 
 * GET  /api/admin/access-code — Get current access code for the hotel
 * POST /api/admin/access-code — Set or rotate access code
 * DELETE /api/admin/access-code — Revoke access code (disables new customer entry)
 * 
 * Only ADMIN and MANAGER roles can manage access codes.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";

// ============================================
// Helpers
// ============================================

/** Generate a random 6-char alphanumeric code */
function generateAccessCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No I, O, 0, 1 to avoid confusion
    let code = "";
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

/** Normalize a code: trim + uppercase */
function normalizeCode(code: string): string {
    return code.trim().toUpperCase();
}

// ============================================
// GET /api/admin/access-code
// ============================================

export async function GET() {
    try {
        const user = await requireRole(["ADMIN", "MANAGER"]);

        const client = await prisma.client.findUnique({
            where: { id: user.clientId },
            select: {
                accessCode: true,
                accessCodeUpdatedAt: true,
                name: true,
            },
        });

        if (!client) {
            return NextResponse.json(
                { success: false, error: "Hotel not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            accessCode: client.accessCode,
            updatedAt: client.accessCodeUpdatedAt?.toISOString() || null,
            hotelName: client.name,
        });
    } catch (error: any) {
        console.error("[ADMIN ACCESS-CODE] GET Error:", error);
        return NextResponse.json(
            { success: false, error: error.message || "Failed to fetch access code" },
            { status: error.message?.includes("required") ? 401 : 500 }
        );
    }
}

// ============================================
// POST /api/admin/access-code
// ============================================

export async function POST(request: NextRequest) {
    try {
        const user = await requireRole(["ADMIN", "MANAGER"]);

        const body = await request.json().catch(() => ({}));
        let code: string;

        if (body.code && typeof body.code === "string") {
            // Admin provides a custom code
            code = normalizeCode(body.code);
            if (code.length < 4 || code.length > 12) {
                return NextResponse.json(
                    { success: false, error: "Access code must be 4-12 characters" },
                    { status: 400 }
                );
            }
        } else {
            // Auto-generate a code
            code = generateAccessCode();
        }

        // Check uniqueness
        const existing = await prisma.client.findUnique({
            where: { accessCode: code },
            select: { id: true },
        });

        if (existing && existing.id !== user.clientId) {
            return NextResponse.json(
                { success: false, error: "This code is already in use. Please try a different one." },
                { status: 409 }
            );
        }

        // Update the hotel's access code
        const updated = await prisma.client.update({
            where: { id: user.clientId },
            data: {
                accessCode: code,
                accessCodeUpdatedAt: new Date(),
            },
            select: {
                accessCode: true,
                accessCodeUpdatedAt: true,
            },
        });

        // Audit log
        await prisma.auditLog.create({
            data: {
                clientId: user.clientId,
                action: "SETTING_CHANGED",
                actorId: user.id,
                metadata: {
                    type: "access_code_set",
                    codePrefix: code.slice(0, 2) + "****",
                },
            },
        });

        console.log(`[ADMIN ACCESS-CODE] Code set for ${user.clientId} by ${user.username}`);

        return NextResponse.json({
            success: true,
            accessCode: updated.accessCode,
            updatedAt: updated.accessCodeUpdatedAt?.toISOString(),
        });
    } catch (error: any) {
        console.error("[ADMIN ACCESS-CODE] POST Error:", error);
        return NextResponse.json(
            { success: false, error: error.message || "Failed to set access code" },
            { status: error.message?.includes("required") ? 401 : 500 }
        );
    }
}

// ============================================
// DELETE /api/admin/access-code
// ============================================

export async function DELETE() {
    try {
        const user = await requireRole(["ADMIN", "MANAGER"]);

        await prisma.client.update({
            where: { id: user.clientId },
            data: {
                accessCode: null,
                accessCodeUpdatedAt: new Date(),
            },
        });

        // Audit log
        await prisma.auditLog.create({
            data: {
                clientId: user.clientId,
                action: "SETTING_CHANGED",
                actorId: user.id,
                metadata: {
                    type: "access_code_revoked",
                },
            },
        });

        console.log(`[ADMIN ACCESS-CODE] Code REVOKED for ${user.clientId} by ${user.username}`);

        return NextResponse.json({
            success: true,
            message: "Access code revoked. New customers cannot enter until a new code is set.",
        });
    } catch (error: any) {
        console.error("[ADMIN ACCESS-CODE] DELETE Error:", error);
        return NextResponse.json(
            { success: false, error: error.message || "Failed to revoke access code" },
            { status: error.message?.includes("required") ? 401 : 500 }
        );
    }
}
