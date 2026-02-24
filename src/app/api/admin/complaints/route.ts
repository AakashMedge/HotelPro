
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ComplaintStatus } from "@prisma/client";
import { requireRole, getAuthFailure } from "@/lib/auth/server";
import { eventEmitter } from "@/lib/services/eventEmitter";

/**
 * POST /api/admin/complaints
 * Allows staff (Admin, Manager, Waiter, Kitchen) to raise an internal operational ticket.
 */
export async function POST(request: NextRequest) {
    try {
        const user = await requireRole(["ADMIN", "MANAGER", "WAITER", "KITCHEN", "CASHIER"]);
        const { clientId } = user;

        const body = await request.json();
        const { type, description, tableCode } = body;

        if (!type || !description) {
            return NextResponse.json(
                { success: false, error: "Type and description are required" },
                { status: 400 }
            );
        }

        // Create the internal ticket using the CustomerComplaint model
        // Create the internal ticket using the CustomerComplaint model
        const complaint = await prisma.customerComplaint.create({
            data: {
                clientId: clientId,
                type: type,
                description: description,
                tableCode: tableCode || 'INTERNAL',
                status: 'SUBMITTED',
                guestName: 'Internal Staff', // Identifier for internal tickets
            }
        });

        // 1. Create a Chat Message in the # staff-protocol channel for immediate visibility
        let targetChannel = await prisma.chatChannel.findFirst({
            where: { clientId: clientId, type: 'GENERAL' }
        });

        // If no general channel, fallback to service or create one
        if (!targetChannel) {
            targetChannel = await prisma.chatChannel.findFirst({
                where: { clientId: clientId, type: 'SERVICE' }
            });
        }

        if (targetChannel) {
            await prisma.chatMessage.create({
                data: {
                    channelId: targetChannel.id,
                    senderId: user.id,
                    content: `🎫 [OPERATIONAL TICKET] ${type}: ${description} (Ref: ${tableCode || 'General'})`,
                    severity: 'WARN',
                    complaintId: complaint.id,
                }
            });

            // Emit specifically for Hub to refresh messages in real-time
            eventEmitter.emit('CHAT_MESSAGE_RECEIVED', { channelId: targetChannel.id });
        }

        // 2. Emit global event for the Resolution Ledger
        eventEmitter.emit('COMPLAINT_RAISED', {
            complaintId: complaint.id,
            type,
            tableCode: tableCode || 'INTERNAL',
            clientId: clientId,
        });

        // 3. Audit log for strict oversight
        await prisma.auditLog.create({
            data: {
                clientId: clientId,
                action: 'COMPLAINT_RAISED',
                actorId: user.id,
                metadata: {
                    complaintId: complaint.id,
                    type,
                    isInternal: true,
                    description
                }
            }
        });

        return NextResponse.json({ success: true, complaint });
    } catch (error: any) {
        const authFailure = getAuthFailure(error);
        if (authFailure) {
            return NextResponse.json(
                { success: false, error: authFailure.message, code: authFailure.code },
                { status: authFailure.status }
            );
        }

        console.error("[ADMIN_COMPLAINTS_POST_ERROR]", error);
        return NextResponse.json(
            { success: false, error: "Failed to raise operational ticket" },
            { status: 500 }
        );
    }
}

/**
 * GET /api/admin/complaints
 * Returns all complaints and tickets for the tenant.
 * Reuses the same logic as the staff view in the public complaints API.
 */
export async function GET(request: NextRequest) {
    try {
        const user = await requireRole(["ADMIN", "MANAGER", "WAITER", "KITCHEN", "CASHIER"]);
        const { clientId } = user;

        const { searchParams } = new URL(request.url);
        const statusFilter = searchParams.get('status');
        const limit = parseInt(searchParams.get('limit') || '100');

        const whereClause: any = { clientId };
        if (statusFilter) {
            whereClause.status = { in: statusFilter.split(',') };
        }

        const complaints = await prisma.customerComplaint.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: {
                order: {
                    select: { id: true, status: true, grandTotal: true, customerName: true }
                }
            }
        });

        return NextResponse.json({ success: true, complaints });
    } catch (error: any) {
        const authFailure = getAuthFailure(error);
        if (authFailure) {
            return NextResponse.json(
                { success: false, error: authFailure.message, code: authFailure.code },
                { status: authFailure.status }
            );
        }

        console.error("[ADMIN_COMPLAINTS_GET_ERROR]", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch tickets" },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/admin/complaints
 * Staff resolves/acknowledges a complaint or internal ticket.
 */
export async function PATCH(request: NextRequest) {
    try {
        const user = await requireRole(["ADMIN", "MANAGER"]);
        const { clientId } = user;

        const body = await request.json();
        const { complaintId, status, resolvedNote } = body;

        if (!complaintId || !status) {
            return NextResponse.json(
                { success: false, error: "complaintId and status required" },
                { status: 400 }
            );
        }

        const complaint = await prisma.customerComplaint.findFirst({
            where: { id: complaintId, clientId }
        });

        if (!complaint) {
            return NextResponse.json({ success: false, error: "Ticket not found" }, { status: 404 });
        }

        const updateData: any = { status };

        // If Resolving (Manager Work)
        if (status === 'RESOLVED' || status === 'DISMISSED') {
            updateData.resolvedById = user.id;
            updateData.resolvedAt = new Date();
        }

        // If Verifying (Admin Work) - Don't overwrite who resolved it
        if (status === 'VERIFIED') {
            // Just status update is enough, maybe could add verifiedBy if schema supported it
            // For now, status VERIFIED acts as the seal
        }
        if (resolvedNote) {
            updateData.resolvedNote = resolvedNote;
        }

        const updated = await prisma.customerComplaint.update({
            where: { id: complaintId },
            data: { ...updateData, status: status as ComplaintStatus }, // Proper casting using imported enum type
        });

        // Notify systems
        eventEmitter.emit('COMPLAINT_UPDATED', {
            complaintId,
            status,
            resolvedNote,
        });

        // AuditLog
        await prisma.auditLog.create({
            data: {
                clientId,
                action: `COMPLAINT_${status}` as any, // Cast to any because TS might complain about dynamic string enum match
                actorId: user.id,
                metadata: {
                    complaintId,
                    newStatus: status,
                    resolvedNote,
                }
            }
        });

        return NextResponse.json({ success: true, complaint: updated });
    } catch (error: any) {
        const authFailure = getAuthFailure(error);
        if (authFailure) {
            return NextResponse.json(
                { success: false, error: authFailure.message, code: authFailure.code },
                { status: authFailure.status }
            );
        }

        console.error("[ADMIN_COMPLAINTS_PATCH_ERROR]", error);
        return NextResponse.json(
            { success: false, error: "Failed to update ticket" },
            { status: 500 }
        );
    }
}
