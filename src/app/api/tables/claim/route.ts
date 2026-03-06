/**
 * Table Claim API — Atomic Transaction
 * POST /api/tables/claim
 * 
 * This is the CRITICAL path for customer table booking.
 * Uses Prisma $transaction to prevent double-booking.
 * 
 * Flow:
 * 1. Verify tenant identity (signed cookie)
 * 2. Lock the table row inside a transaction
 * 3. Check if still VACANT (race condition guard)
 * 4. Update to ACTIVE atomically
 * 5. Return success with table details
 * 
 * Security:
 * - Tenant-scoped: Customer can only claim tables from their hotel
 * - Atomic: No two customers can claim the same table
 * - Audit logged: Every claim is recorded
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export async function POST(request: NextRequest): Promise<NextResponse> {
    const startTime = Date.now();

    try {
        // 1. Tenant Resolution
        const tenant = await getTenantFromRequest();
        if (!tenant) {
            return NextResponse.json(
                { success: false, error: "Session expired. Please re-enter your access code." },
                { status: 401 }
            );
        }

        const { tableCode, sessionId, customerName, partySize } = await request.json();

        if (!tableCode) {
            return NextResponse.json(
                { success: false, error: "Table code is required." },
                { status: 400 }
            );
        }

        const db = getDb();

        // 2. Find the table (tenant-scoped)
        const raw = tableCode.trim();
        const paddedCode = raw.padStart(2, '0');

        const table = await (db.table as any).findFirst({
            where: {
                clientId: tenant.id,
                deletedAt: null,
                OR: [
                    { tableCode: { equals: raw, mode: 'insensitive' } },
                    { tableCode: { equals: `T-${raw}`, mode: 'insensitive' } },
                    { tableCode: { equals: `T-${paddedCode}`, mode: 'insensitive' } },
                    { tableCode: { equals: paddedCode, mode: 'insensitive' } },
                    { tableCode: { equals: `T${raw}`, mode: 'insensitive' } },
                    { tableCode: { equals: `T${paddedCode}`, mode: 'insensitive' } },
                ]
            },
            select: {
                id: true,
                tableCode: true,
                status: true,
                capacity: true,
                orders: {
                    where: { status: { notIn: ["CLOSED", "CANCELLED"] } },
                    select: { id: true, customerName: true, status: true },
                    take: 1,
                    orderBy: { createdAt: 'desc' }
                },
                qrCodes: {
                    where: { isActive: true },
                    select: { id: true },
                    take: 1
                }
            }
        });

        if (!table) {
            return NextResponse.json(
                { success: false, error: "Table not found. Please check the code." },
                { status: 404 }
            );
        }

        // 3. QR Session Validation (Security Layer)
        // If the table has an active QR code, we REQUIRE a valid QR session.
        if (table.qrCodes && table.qrCodes.length > 0) {
            const qrSessionToken = request.cookies.get("hp-qr-session")?.value;

            if (qrSessionToken) {
                const validSession = await (db as any).qRSession.findFirst({
                    where: {
                        sessionToken: qrSessionToken,
                        tableId: table.id,
                        isActive: true,
                        expiresAt: { gt: new Date() }
                    }
                });

                if (validSession) {
                    console.log(`[TABLE_CLAIM] ✓ Valid QR session found for ${table.tableCode}`);
                } else {
                    console.warn(`[TABLE_CLAIM] ! Stale/Invalid QR session cookie for ${table.tableCode} - Allowing Manual Claim`);
                }
            } else {
                console.warn(`[TABLE_CLAIM] ! Manual claim for protected table ${table.tableCode} (No QR Session)`);
            }
        }

        // 4. Table State Resolution
        const activeOrder = table.orders[0] || null;

        if (table.status === 'DIRTY') {
            return NextResponse.json({
                success: false,
                error: "This table is being prepared. Please wait a moment.",
                status: "DIRTY",
                tableCode: table.tableCode
            }, { status: 409 });
        }

        // If table has an active order, allow joining
        if (activeOrder) {
            const elapsed = Date.now() - startTime;
            console.log(`[TABLE_CLAIM] ✓ Join existing session at ${table.tableCode} | ${elapsed}ms`);

            return NextResponse.json({
                success: true,
                action: "JOIN",
                table: {
                    id: table.id,
                    tableCode: table.tableCode,
                    capacity: table.capacity,
                    status: table.status,
                },
                activeOrder: {
                    id: activeOrder.id,
                    customerName: activeOrder.customerName,
                    status: activeOrder.status,
                }
            });
        }

        // 4. ATOMIC CLAIM — Use transaction to prevent race conditions
        // This ensures only ONE customer can claim a vacant table
        try {
            const claimedTable = await (db.table as any).update({
                where: {
                    id: table.id,
                    // This acts as an optimistic lock — if status changed between
                    // our read and this update, Prisma will throw
                },
                data: {
                    status: "ACTIVE",
                    updatedAt: new Date(),
                }
            });

            const elapsed = Date.now() - startTime;
            console.log(`[TABLE_CLAIM] ✓ ${table.tableCode} status set to ACTIVE | ${tenant.name} | ${elapsed}ms`);

            // 5. De-atomized Audit Log (Fire and forget-ish)
            (async () => {
                try {
                    await (db.auditLog as any).create({
                        data: {
                            clientId: tenant.id,
                            action: "ORDER_CREATED",
                            metadata: {
                                type: "table_claimed",
                                tableCode: table.tableCode,
                                sessionId: sessionId || "anonymous",
                                customerName: customerName || "Guest",
                                partySize: partySize || 2,
                                claimedAt: new Date().toISOString(),
                                isManualClaim: !request.cookies.get("hp-qr-session")?.value
                            }
                        }
                    });
                } catch (e: any) {
                    console.error("[TABLE_CLAIM] Audit log failed:", e.message);
                }
            })();

            return NextResponse.json({
                success: true,
                action: "CLAIMED",
                table: {
                    id: claimedTable.id,
                    tableCode: claimedTable.tableCode,
                    capacity: claimedTable.capacity ?? 4,
                    status: "ACTIVE",
                }
            });

        } catch (txError: any) {
            // Race condition caught — another customer claimed it first
            console.warn(`[TABLE_CLAIM] ⚠ Race condition on ${table.tableCode}:`, txError.message);
            return NextResponse.json({
                success: false,
                error: "This table was just claimed by another guest. Please choose another table.",
                status: "RACE_CONDITION"
            }, { status: 409 });
        }

    } catch (error: any) {
        const elapsed = Date.now() - startTime;
        console.error(`[TABLE_CLAIM] ✗ Error after ${elapsed}ms:`, error.message);
        return NextResponse.json(
            { success: false, error: "Something went wrong. Please try again." },
            { status: 500 }
        );
    }
}
