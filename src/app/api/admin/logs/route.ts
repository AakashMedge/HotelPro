
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        // Allow both ADMIN and MANAGER roles to see logs for their specific hotel
        if (!user || !['ADMIN', 'MANAGER'].includes(user.role)) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get("limit") || "50");
        const page = parseInt(searchParams.get("page") || "1");
        const skip = (page - 1) * limit;
        const search = searchParams.get("search") || "";

        const where: any = {
            clientId: user.clientId,
        };

        if (search) {
            where.OR = [
                { action: { contains: search, mode: 'insensitive' } },
                { actor: { name: { contains: search, mode: 'insensitive' } } },
            ];
        }

        const logs = await prisma.auditLog.findMany({
            where,
            include: {
                actor: {
                    select: {
                        name: true,
                        role: true,
                    }
                }
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: limit,
            skip: skip,
        });

        const total = await prisma.auditLog.count({ where });

        const formattedLogs = logs.map(log => {
            let details = "System event recorded";
            const meta = log.metadata as any;

            if (meta) {
                if (meta.tableCode) details = `Table ${meta.tableCode}: ${log.action.replace(/_/g, ' ')}`;
                if (meta.itemName) details = `Item "${meta.itemName}" in Order ${meta.orderId?.slice(-6) || ''}`;
                if (meta.amount) details = `Financial event: ₹${meta.amount} settled via ${meta.method || 'Unknown'}`;
                if (meta.reason) details += ` | Reason: ${meta.reason}`;
            }

            // Fallback to simple description if metadata logic doesn't catch it
            if (details === "System event recorded") {
                details = `${log.action.replace(/_/g, ' ').toLowerCase()}`;
            }

            return {
                id: log.id,
                action: log.action,
                actor: log.actor?.name || 'System Auto',
                details,
                timestamp: log.createdAt.toISOString(),
                severity: getSeverity(log.action),
            };
        });

        return NextResponse.json({
            success: true,
            logs: formattedLogs,
            pagination: {
                total,
                pages: Math.ceil(total / limit),
                currentPage: page
            }
        });
    } catch (error) {
        console.error("[ADMIN_LOGS_GET] Error:", error);
        return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
    }
}

function getSeverity(action: string): string {
    const danger = ['EMERGENCY_RESET', 'UNAUTHORIZED_ACCESS', 'SENSITIVE_DELETE', 'LOGIN_FAILURE', 'COMPLAINT_URGENT'];
    const warn = ['SETTING_CHANGED', 'PLAN_CHANGED', 'FLOOR_DELETED', 'QR_REVOKED', 'ITEM_CANCELLED', 'COMPLAINT_RAISED'];
    const access = ['LOGIN_SUCCESS', 'QR_SCANNED', 'QR_SESSION_CREATED'];

    if (danger.includes(action)) return 'DANGER';
    if (warn.includes(action)) return 'WARN';
    if (access.includes(action)) return 'ACCESS';
    return 'INFO';
}
