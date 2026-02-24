/**
 * Customer Complaints API
 * 
 * POST /api/customer/complaints - Customer raises a complaint (no auth required, uses tenant cookie)
 * GET  /api/customer/complaints - Staff lists complaints (auth required)
 * PATCH /api/customer/complaints - Staff updates complaint status (auth required)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";
import { getCurrentUser } from "@/lib/auth/server";
import { eventEmitter } from "@/lib/services/eventEmitter";

// ============================================
// POST - Customer raises a complaint
// ============================================

export async function POST(request: NextRequest) {
    try {
        const tenant = await getTenantFromRequest();
        if (!tenant) {
            return NextResponse.json({ success: false, error: "Hotel not identified" }, { status: 401 });
        }

        const body = await request.json();
        const { orderId, type, description, guestName, tableCode } = body;

        if (!orderId || !type) {
            return NextResponse.json(
                { success: false, error: "orderId and type are required" },
                { status: 400 }
            );
        }

        const validTypes = ['NOT_RECEIVED', 'WRONG_ITEM', 'QUALITY_ISSUE', 'DELAY', 'MISSING_ITEM', 'RUDE_SERVICE', 'OTHER'];
        if (!validTypes.includes(type)) {
            return NextResponse.json(
                { success: false, error: `Invalid complaint type. Must be one of: ${validTypes.join(', ')}` },
                { status: 400 }
            );
        }

        // Verify order belongs to this tenant
        const order = await prisma.order.findFirst({
            where: { id: orderId, clientId: tenant.id },
            include: { table: true }
        });

        if (!order) {
            return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
        }

        const complaint = await prisma.customerComplaint.create({
            data: {
                clientId: tenant.id,
                orderId,
                tableCode: tableCode || order.table.tableCode,
                type,
                description: description || null,
                guestName: guestName || null,
                status: 'SUBMITTED',
            }
        });

        // Create Chat Message in # guest-feedback channel for staff visibility
        let targetChannel = await prisma.chatChannel.findFirst({
            where: { clientId: tenant.id, type: 'CUSTOMER_FEEDBACK' }
        });

        if (!targetChannel) {
            targetChannel = await prisma.chatChannel.create({
                data: {
                    clientId: tenant.id,
                    name: 'guest-feedback',
                    type: 'CUSTOMER_FEEDBACK'
                }
            });
        }

        let senderUser = await prisma.user.findFirst({
            where: { clientId: tenant.id, role: 'ADMIN' }
        });

        if (!senderUser) {
            senderUser = await prisma.user.findFirst({
                where: { clientId: tenant.id }
            });
        }

        if (targetChannel && senderUser) {
            const message = await prisma.chatMessage.create({
                data: {
                    channelId: targetChannel.id,
                    senderId: senderUser.id,
                    content: `🚨 [COMPLAINT] ${type.replace(/_/g, ' ')} by ${guestName || 'Guest'} at Table ${tableCode || order.table.tableCode}: "${description || 'No description'}"`,
                    severity: 'URGENT',
                    complaintId: complaint.id,
                    orderId: orderId,
                    createdAt: new Date(),
                }
            });
            console.log(`[COMPLAINT] Chat Message ${message.id} linked to complaint ${complaint.id}`);

            // Emit specifically for Hub to refresh messages
            eventEmitter.emit('CHAT_MESSAGE_RECEIVED', { channelId: targetChannel.id });
        }

        // Emit real-time event so hub/manager gets alerted instantly
        eventEmitter.emit('COMPLAINT_RAISED', {
            complaintId: complaint.id,
            orderId,
            tableCode: tableCode || order.table.tableCode,
            type,
            guestName: guestName || 'Guest',
            description: description || null,
            clientId: tenant.id,
        });

        // Also create an audit log
        await prisma.auditLog.create({
            data: {
                clientId: tenant.id,
                action: 'COMPLAINT_RAISED',
                orderId,
                metadata: {
                    complaintId: complaint.id,
                    type,
                    tableCode: tableCode || order.table.tableCode,
                    guestName: guestName || null,
                }
            }
        });

        return NextResponse.json({ success: true, complaint });
    } catch (error) {
        console.error("[COMPLAINTS API] POST Error:", error);
        return NextResponse.json({ success: false, error: "Failed to create complaint" }, { status: 500 });
    }
}

// ============================================
// GET - View complaints
// Supports two modes:
//   1) Customer: uses tenant cookie + orderId param → returns complaints for that order
//   2) Staff: uses getCurrentUser() → returns all complaints for the tenant
// ============================================

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const orderId = searchParams.get('orderId');

        // ── Mode 1: Customer fetching their own order's complaints ──
        if (orderId) {
            const tenant = await getTenantFromRequest();
            if (!tenant) {
                return NextResponse.json({ success: false, error: "Hotel not identified" }, { status: 401 });
            }

            // Verify order belongs to this tenant
            const order = await prisma.order.findFirst({
                where: { id: orderId, clientId: tenant.id },
            });
            if (!order) {
                return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
            }

            const complaints = await (prisma as any).customerComplaint.findMany({
                where: { clientId: tenant.id, orderId },
                orderBy: { createdAt: 'desc' },
            });

            return NextResponse.json({ success: true, complaints });
        }

        // ── Mode 2: Staff fetching all complaints ──
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const statusFilter = searchParams.get('status'); // e.g. SUBMITTED,ACKNOWLEDGED
        const limit = parseInt(searchParams.get('limit') || '50');

        const whereClause: any = { clientId: user.clientId };
        if (statusFilter) {
            whereClause.status = { in: statusFilter.split(',') };
        }

        const complaints = await (prisma as any).customerComplaint.findMany({
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
    } catch (error) {
        console.error("[COMPLAINTS API] GET Error:", error);
        return NextResponse.json({ success: false, error: "Failed to fetch complaints" }, { status: 500 });
    }
}

// ============================================
// PATCH - Staff resolves/acknowledges a complaint
// ============================================

export async function PATCH(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        // Only managers and admins can resolve complaints
        if (!['ADMIN', 'MANAGER'].includes(user.role)) {
            return NextResponse.json({ success: false, error: "Only managers can handle complaints" }, { status: 403 });
        }

        const body = await request.json();
        const { complaintId, status, resolvedNote } = body;

        if (!complaintId || !status) {
            return NextResponse.json({ success: false, error: "complaintId and status required" }, { status: 400 });
        }

        const validStatuses = ['ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'DISMISSED'];
        if (!validStatuses.includes(status)) {
            return NextResponse.json(
                { success: false, error: `Invalid status. Must be: ${validStatuses.join(', ')}` },
                { status: 400 }
            );
        }

        const complaint = await (prisma as any).customerComplaint.findFirst({
            where: { id: complaintId, clientId: user.clientId }
        });

        if (!complaint) {
            return NextResponse.json({ success: false, error: "Complaint not found" }, { status: 404 });
        }

        const updateData: any = { status };
        if (status === 'RESOLVED' || status === 'DISMISSED') {
            updateData.resolvedById = user.id;
            updateData.resolvedAt = new Date();
        }
        if (resolvedNote) {
            updateData.resolvedNote = resolvedNote;
        }

        const updated = await (prisma as any).customerComplaint.update({
            where: { id: complaintId },
            data: updateData,
        });

        // Emit update so customer order-status page can show resolution
        eventEmitter.emit('COMPLAINT_UPDATED', {
            complaintId,
            orderId: complaint.orderId,
            status,
            resolvedNote,
        });

        // Audit log
        await prisma.auditLog.create({
            data: {
                clientId: user.clientId,
                action: status === 'RESOLVED' ? 'COMPLAINT_RESOLVED' : 'COMPLAINT_ACKNOWLEDGED',
                actorId: user.id,
                orderId: complaint.orderId,
                metadata: {
                    complaintId,
                    newStatus: status,
                    resolvedNote,
                }
            }
        });

        return NextResponse.json({ success: true, complaint: updated });
    } catch (error) {
        console.error("[COMPLAINTS API] PATCH Error:", error);
        return NextResponse.json({ success: false, error: "Failed to update complaint" }, { status: 500 });
    }
}
