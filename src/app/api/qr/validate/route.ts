/**
 * QR Scan Validation API
 * POST /api/qr/validate
 * 
 * Customer-facing endpoint — NO authentication required.
 * 
 * This is the CRITICAL entry point when a customer scans a QR code.
 * It validates the QR payload, checks table state, creates a session,
 * and sets the tenant cookie so downstream APIs work.
 * 
 * Security Layers:
 * 1. Token Validation  — verify shortCode + secretSlice + version match DB
 * 2. HMAC Signature     — verify tamper-proof sig
 * 3. Table State Gate   — only VACANT/ACTIVE tables proceed
 * 4. Session Binding    — session tied to IP + User-Agent + TTL
 * 5. Rate Limiting      — max 5 scans per QR per 5 minutes
 * 
 * Request:  { qr: "QR-MH-T01", s: "abc123...", v: 1, sig: "hmac16chars" }
 * Response: { success: true, table, session, hotel }
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { signTenantToken, getTenantCookieConfig } from "@/lib/tenant";
import { createHmac, randomBytes } from "crypto";

// ─── HMAC Verification ───
function verifySignature(secretToken: string, shortCode: string, version: number, providedSig: string): boolean {
    const hmacSecret = process.env.JWT_SECRET || 'hotelpro-qr-default';
    const payload = `${shortCode}:${version}:${secretToken}`;
    const expected = createHmac('sha256', hmacSecret).update(payload).digest('hex').slice(0, 16);
    // Constant-time comparison to prevent timing attacks
    if (expected.length !== providedSig.length) return false;
    let mismatch = 0;
    for (let i = 0; i < expected.length; i++) {
        mismatch |= expected.charCodeAt(i) ^ providedSig.charCodeAt(i);
    }
    return mismatch === 0;
}

// ─── Session Token Generator ───
function generateSessionToken(): string {
    return randomBytes(32).toString('hex');
}

// ─── Rate Limit Store (in-memory for now, per-instance) ───
const scanRateMap = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT_WINDOW = 5 * 60 * 1000; // 5 minutes
const RATE_LIMIT_MAX = 5; // Max 5 scans per QR per window

function isRateLimited(qrCodeId: string): boolean {
    const now = Date.now();
    const entry = scanRateMap.get(qrCodeId);

    if (!entry || (now - entry.windowStart) > RATE_LIMIT_WINDOW) {
        scanRateMap.set(qrCodeId, { count: 1, windowStart: now });
        return false;
    }

    entry.count++;
    if (entry.count > RATE_LIMIT_MAX) {
        return true;
    }
    return false;
}

// ─── Session TTL ───
const SESSION_TTL_HOURS = 3;

export async function POST(request: NextRequest): Promise<NextResponse> {
    const startTime = Date.now();

    try {
        const body = await request.json().catch(() => null);
        if (!body) {
            return NextResponse.json(
                { success: false, error: "Invalid request." },
                { status: 400 }
            );
        }

        const { qr: shortCode, s: secretSlice, v: version, sig: signature } = body;

        if (!shortCode || !secretSlice || !version || !signature) {
            return NextResponse.json(
                { success: false, error: "Invalid QR code data." },
                { status: 400 }
            );
        }

        const db = getDb();

        // ─── Layer 1: Token Lookup ───
        const qrCode = await (db as any).qRCode.findFirst({
            where: {
                shortCode: shortCode,
                isActive: true,
            },
            include: {
                table: {
                    select: {
                        id: true,
                        tableCode: true,
                        status: true,
                        capacity: true,
                        clientId: true,
                        floor: {
                            select: { name: true, type: true }
                        },
                        orders: {
                            where: { status: { notIn: ["CLOSED", "CANCELLED"] } },
                            select: { id: true, customerName: true, status: true, sessionId: true },
                            take: 1,
                            orderBy: { createdAt: 'desc' as const },
                        }
                    }
                },
                client: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        plan: true,
                        status: true,
                    }
                }
            }
        });

        if (!qrCode) {
            console.warn(`[QR_VALIDATE] ✗ QR not found or inactive: ${shortCode}`);
            return NextResponse.json(
                { success: false, error: "This QR code is no longer valid. Please ask staff for assistance." },
                { status: 404 }
            );
        }

        // Check expiry
        if (qrCode.expiresAt && new Date(qrCode.expiresAt) < new Date()) {
            console.warn(`[QR_VALIDATE] ✗ QR expired: ${shortCode}`);
            return NextResponse.json(
                { success: false, error: "This QR code has expired. Please ask staff for a new one." },
                { status: 410 }
            );
        }

        // ─── Layer 2: HMAC Signature Verification ───
        // Verify that the secret slice matches the beginning of the stored token
        if (!qrCode.secretToken.startsWith(secretSlice)) {
            console.warn(`[QR_VALIDATE] ✗ Token mismatch for ${shortCode}`);
            return NextResponse.json(
                { success: false, error: "Invalid QR code. Please scan the physical code on your table." },
                { status: 403 }
            );
        }

        // Verify version
        if (Number(version) !== qrCode.version) {
            console.warn(`[QR_VALIDATE] ✗ Version mismatch for ${shortCode}: expected v${qrCode.version}, got v${version}`);
            return NextResponse.json(
                { success: false, error: "This QR code has been updated. Please scan the new code on your table." },
                { status: 403 }
            );
        }

        // Verify HMAC signature
        if (!verifySignature(qrCode.secretToken, shortCode, Number(version), signature)) {
            console.warn(`[QR_VALIDATE] ✗ Signature mismatch for ${shortCode}`);
            // Log suspicious scan
            try {
                await (db as any).auditLog.create({
                    data: {
                        clientId: qrCode.clientId,
                        action: "QR_SUSPICIOUS_SCAN",
                        metadata: {
                            shortCode,
                            ip: getClientIP(request),
                            userAgent: request.headers.get('user-agent')?.slice(0, 200),
                            reason: "signature_mismatch",
                        }
                    }
                });
            } catch { /* non-blocking */ }
            return NextResponse.json(
                { success: false, error: "Invalid QR code." },
                { status: 403 }
            );
        }

        // ─── Layer 3: Table State Gate ───
        const table = qrCode.table;
        if (!table) {
            return NextResponse.json(
                { success: false, error: "Table not found for this QR code." },
                { status: 404 }
            );
        }

        if (table.status === 'DIRTY') {
            return NextResponse.json({
                success: false,
                error: "This table is being prepared. Please wait a moment and scan again.",
                tableStatus: "DIRTY",
            }, { status: 409 });
        }

        // Check hotel status
        const client = qrCode.client;
        if (!client || client.status === 'SUSPENDED' || client.status === 'ARCHIVED') {
            return NextResponse.json(
                { success: false, error: "This hotel is currently unavailable." },
                { status: 403 }
            );
        }

        // ─── Layer 4: Rate Limiting ───
        if (isRateLimited(qrCode.id)) {
            console.warn(`[QR_VALIDATE] ✗ Rate limited: ${shortCode}`);
            try {
                await (db as any).auditLog.create({
                    data: {
                        clientId: qrCode.clientId,
                        action: "QR_SUSPICIOUS_SCAN",
                        metadata: {
                            shortCode,
                            ip: getClientIP(request),
                            reason: "rate_limited",
                        }
                    }
                });
            } catch { /* non-blocking */ }
            return NextResponse.json(
                { success: false, error: "Too many scans. Please wait a few minutes and try again." },
                { status: 429 }
            );
        }

        // ─── Layer 5: Create Session ───
        const clientIP = getClientIP(request);
        const userAgent = request.headers.get('user-agent') || '';
        const sessionToken = generateSessionToken();
        const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000);

        const session = await (db as any).qRSession.create({
            data: {
                qrCodeId: qrCode.id,
                clientId: qrCode.clientId,
                tableId: table.id,
                sessionToken,
                ipAddress: clientIP,
                userAgent: userAgent.slice(0, 500),
                isActive: true,
                expiresAt,
            }
        });

        // Update QR scan metadata
        await (db as any).qRCode.update({
            where: { id: qrCode.id },
            data: {
                lastScannedAt: new Date(),
                lastScannedIp: clientIP,
                scanCount: { increment: 1 },
            }
        });

        // Audit log successful scan
        try {
            await (db as any).auditLog.create({
                data: {
                    clientId: qrCode.clientId,
                    action: "QR_SCANNED",
                    metadata: {
                        shortCode,
                        tableCode: table.tableCode,
                        sessionId: session.id,
                        ip: clientIP,
                        version: qrCode.version,
                    }
                }
            });
        } catch { /* non-blocking */ }

        // ─── Set Tenant Cookie (same as access-code flow) ───
        const tenantToken = await signTenantToken(client.id);
        const cookieConfig = getTenantCookieConfig();

        const activeOrder = table.orders?.[0] || null;

        const elapsed = Date.now() - startTime;
        console.log(`[QR_VALIDATE] ✓ Session created for ${shortCode} → ${table.tableCode} | ${client.name} | ${elapsed}ms`);

        const response = NextResponse.json({
            success: true,
            hotel: {
                id: client.id,
                name: client.name,
                slug: client.slug,
                plan: client.plan,
            },
            table: {
                id: table.id,
                tableCode: table.tableCode,
                status: table.status,
                capacity: table.capacity,
                floorName: table.floor?.name || null,
            },
            session: {
                id: session.id,
                token: sessionToken,
                expiresAt: expiresAt.toISOString(),
            },
            activeOrder: activeOrder ? {
                id: activeOrder.id,
                customerName: activeOrder.customerName,
                status: activeOrder.status,
            } : null,
        });

        // Set tenant cookie (bypasses access-code requirement)
        response.cookies.set(cookieConfig.name, tenantToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: cookieConfig.maxAge,
        });

        // Set QR session cookie
        response.cookies.set("hp-qr-session", sessionToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: SESSION_TTL_HOURS * 60 * 60,
        });

        // Set legacy tenant cookie for backward compat
        response.cookies.set("hp-tenant", client.slug, {
            httpOnly: false,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: cookieConfig.maxAge,
        });

        return response;

    } catch (error: any) {
        const elapsed = Date.now() - startTime;
        console.error(`[QR_VALIDATE] ✗ Error after ${elapsed}ms:`, error.message);
        return NextResponse.json(
            { success: false, error: "Something went wrong. Please try again." },
            { status: 500 }
        );
    }
}

// ─── Helpers ───
function getClientIP(request: NextRequest): string {
    return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || request.headers.get('x-real-ip')
        || 'unknown';
}
