/**
 * QR Code Management API
 * POST /api/qr/generate      → Generate QR for a table
 * POST /api/qr/batch-generate → Batch generate for a floor
 * POST /api/qr/rotate         → Rotate (regenerate) QR secret
 * POST /api/qr/revoke         → Revoke/deactivate QR
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { generateSecretToken, generateShortCode, signPayload, buildQrUrl } from "@/lib/qr";

// ============================================
// POST /api/qr/generate — Generate QR for a single table
// ============================================
export async function POST(request: NextRequest) {
    try {
        const user = await requireRole(["ADMIN", "MANAGER"]);
        const db = getDb();
        const body = await request.json();
        const { action } = body;

        // Route to the right handler
        switch (action) {
            case 'generate':
                return await handleGenerate(db, user, body);
            case 'batch-generate':
                return await handleBatchGenerate(db, user, body);
            case 'rotate':
                return await handleRotate(db, user, body);
            case 'revoke':
                return await handleRevoke(db, user, body);
            case 'assign-table':
                return await handleAssignTable(db, user, body);
            case 'get-url':
                return await handleGetUrl(db, user, body);
            case 'get-urls-for-floor':
                return await handleGetUrlsForFloor(db, user, body);
            default:
                return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
        }

    } catch (error: any) {
        console.error("[QR_API]", error.message);
        if (error?.message?.includes("Authentication") || error?.message?.includes("Access denied")) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }
        return NextResponse.json({ success: false, error: error.message || "QR operation failed" }, { status: 500 });
    }
}

// ─── Generate QR for single table ───
async function handleGenerate(db: any, user: any, body: any) {
    const { tableId } = body;

    if (!tableId) {
        return NextResponse.json({ success: false, error: "Table ID is required." }, { status: 400 });
    }

    // Verify table belongs to this tenant
    const table = await db.table.findFirst({
        where: { id: tableId, clientId: user.clientId, deletedAt: null },
        include: {
            floor: { select: { prefix: true, name: true } },
            qrCodes: { where: { isActive: true }, take: 1 },
        },
    });

    if (!table) {
        return NextResponse.json({ success: false, error: "Table not found." }, { status: 404 });
    }

    // Deactivate any existing active QR codes for this table
    await db.qRCode.updateMany({
        where: { tableId, clientId: user.clientId, isActive: true },
        data: { isActive: false },
    });

    const prefix = table.floor?.prefix || 'TB';
    const secretToken = generateSecretToken();
    const shortCode = generateShortCode(prefix, table.tableCode);

    // Ensure shortCode is unique (add suffix if needed)
    let finalShortCode = shortCode;
    const existingShort = await db.qRCode.findUnique({ where: { shortCode } });
    if (existingShort) {
        finalShortCode = `${shortCode}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
    }

    const qrCode = await db.qRCode.create({
        data: {
            clientId: user.clientId,
            tableId,
            secretToken,
            shortCode: finalShortCode,
            version: 1,
            isActive: true,
            createdBy: user.id,
        },
    });

    // Generate the QR URL payload
    const signature = signPayload(secretToken, finalShortCode, 1);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const qrUrl = buildQrUrl(baseUrl, finalShortCode, secretToken, 1, signature);

    console.log(`[QR_GENERATE] ✓ QR for table ${table.tableCode} created by ${user.username}`);

    return NextResponse.json({
        success: true,
        qrCode: {
            id: qrCode.id,
            shortCode: finalShortCode,
            version: qrCode.version,
            url: qrUrl,
            tableCode: table.tableCode,
            floorName: table.floor?.name || 'Unassigned',
        },
    });
}

// ─── Batch Generate for a floor ───
async function handleBatchGenerate(db: any, user: any, body: any) {
    const { floorId } = body;

    if (!floorId) {
        return NextResponse.json({ success: false, error: "Floor ID is required." }, { status: 400 });
    }

    const floor = await db.floor.findFirst({
        where: { id: floorId, clientId: user.clientId },
        include: {
            tables: {
                where: { deletedAt: null },
                include: {
                    qrCodes: { where: { isActive: true }, take: 1 },
                },
            },
        },
    });

    if (!floor) {
        return NextResponse.json({ success: false, error: "Floor not found." }, { status: 404 });
    }

    // Generate QR for tables that don't have active QR
    const tablesNeedingQR = floor.tables.filter((t: any) => !t.qrCodes || t.qrCodes.length === 0);
    const results: any[] = [];

    for (const table of tablesNeedingQR) {
        const secretToken = generateSecretToken();
        let shortCode = generateShortCode(floor.prefix, table.tableCode);

        // Ensure uniqueness
        const existing = await db.qRCode.findUnique({ where: { shortCode } });
        if (existing) {
            shortCode = `${shortCode}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
        }

        const qrCode = await db.qRCode.create({
            data: {
                clientId: user.clientId,
                tableId: table.id,
                secretToken,
                shortCode,
                version: 1,
                isActive: true,
                createdBy: user.id,
            },
        });

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const signature = signPayload(secretToken, shortCode, 1);
        results.push({
            id: qrCode.id,
            shortCode,
            tableCode: table.tableCode,
            url: buildQrUrl(baseUrl, shortCode, secretToken, 1, signature),
        });
    }

    console.log(`[QR_BATCH] ✓ ${results.length} QR codes generated for floor "${floor.name}" by ${user.username}`);

    return NextResponse.json({
        success: true,
        generated: results.length,
        skipped: floor.tables.length - tablesNeedingQR.length,
        results,
    });
}

// ─── Rotate QR secret (invalidates old QR photos) ───
async function handleRotate(db: any, user: any, body: any) {
    const { tableId } = body;

    if (!tableId) {
        return NextResponse.json({ success: false, error: "Table ID is required." }, { status: 400 });
    }

    // Find active QR for this table
    const activeQR = await db.qRCode.findFirst({
        where: { tableId, clientId: user.clientId, isActive: true },
        include: { table: { include: { floor: { select: { prefix: true } } } } },
    });

    if (!activeQR) {
        return NextResponse.json({ success: false, error: "No active QR found for this table." }, { status: 404 });
    }

    // Deactivate old, create new with incremented version
    await db.qRCode.update({
        where: { id: activeQR.id },
        data: { isActive: false },
    });

    // Invalidate all active sessions for this QR
    await db.qRSession.updateMany({
        where: { qrCodeId: activeQR.id, isActive: true },
        data: { isActive: false },
    });

    const newSecretToken = generateSecretToken();
    const newVersion = activeQR.version + 1;

    const newQR = await db.qRCode.create({
        data: {
            clientId: user.clientId,
            tableId,
            secretToken: newSecretToken,
            shortCode: `${activeQR.shortCode.split('-').slice(0, 3).join('-')}-V${newVersion}`,
            version: newVersion,
            isActive: true,
            createdBy: user.id,
        },
    });

    const signature = signPayload(newSecretToken, newQR.shortCode, newVersion);

    console.log(`[QR_ROTATE] ✓ QR rotated for table ${activeQR.table.tableCode} (v${newVersion}) by ${user.username}`);

    return NextResponse.json({
        success: true,
        qrCode: {
            id: newQR.id,
            shortCode: newQR.shortCode,
            version: newVersion,
            url: buildQrUrl(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000', newQR.shortCode, newSecretToken, newVersion, signature),
        },
    });
}

// ─── Revoke QR (permanently deactivate) ───
async function handleRevoke(db: any, user: any, body: any) {
    const { tableId } = body;

    if (!tableId) {
        return NextResponse.json({ success: false, error: "Table ID is required." }, { status: 400 });
    }

    // Deactivate all QRs for this table
    const result = await db.qRCode.updateMany({
        where: { tableId, clientId: user.clientId, isActive: true },
        data: { isActive: false },
    });

    // Kill all active sessions
    await db.qRSession.updateMany({
        where: { tableId, clientId: user.clientId, isActive: true },
        data: { isActive: false },
    });

    console.log(`[QR_REVOKE] ✓ ${result.count} QR(s) revoked by ${user.username}`);

    return NextResponse.json({
        success: true,
        revokedCount: result.count,
    });
}

// ─── Assign table to a floor ───
async function handleAssignTable(db: any, user: any, body: any) {
    const { tableId, floorId } = body;

    if (!tableId) {
        return NextResponse.json({ success: false, error: "Table ID is required." }, { status: 400 });
    }

    // Verify table belongs to tenant
    const table = await db.table.findFirst({
        where: { id: tableId, clientId: user.clientId, deletedAt: null },
    });
    if (!table) {
        return NextResponse.json({ success: false, error: "Table not found." }, { status: 404 });
    }

    // Verify floor belongs to tenant (if provided)
    if (floorId) {
        const floor = await db.floor.findFirst({
            where: { id: floorId, clientId: user.clientId },
        });
        if (!floor) {
            return NextResponse.json({ success: false, error: "Floor not found." }, { status: 404 });
        }
    }

    await db.table.update({
        where: { id: tableId },
        data: { floorId: floorId || null },
    });

    console.log(`[QR_ASSIGN] ✓ Table ${table.tableCode} → floor ${floorId || 'unassigned'} by ${user.username}`);

    return NextResponse.json({ success: true });
}

// ─── Get URL for a single table (for immediate printing) ───
async function handleGetUrl(db: any, user: any, body: any) {
    const { tableId } = body;
    if (!tableId) return NextResponse.json({ success: false, error: "Table ID is required." }, { status: 400 });

    const qrCode = await db.qRCode.findFirst({
        where: { tableId, clientId: user.clientId, isActive: true },
        include: { table: true },
    });

    if (!qrCode) return NextResponse.json({ success: false, error: "No active QR found." }, { status: 404 });

    const signature = signPayload(qrCode.secretToken, qrCode.shortCode, qrCode.version);
    const url = buildQrUrl(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000', qrCode.shortCode, qrCode.secretToken, qrCode.version, signature);

    return NextResponse.json({
        success: true,
        qrCode: {
            shortCode: qrCode.shortCode,
            tableCode: qrCode.table.tableCode,
            url,
        }
    });
}

// ─── Get URLs for Floor (for batch PDF printing) ───
async function handleGetUrlsForFloor(db: any, user: any, body: any) {
    const { floorId } = body;
    if (!floorId) return NextResponse.json({ success: false, error: "Floor ID is required." }, { status: 400 });

    const qrCodes = await db.qRCode.findMany({
        where: {
            table: { floorId, clientId: user.clientId, deletedAt: null },
            isActive: true
        },
        include: { table: true },
    });

    const results = qrCodes.map((qrCode: any) => {
        const signature = signPayload(qrCode.secretToken, qrCode.shortCode, qrCode.version);
        return {
            shortCode: qrCode.shortCode,
            tableCode: qrCode.table.tableCode,
            url: buildQrUrl(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000', qrCode.shortCode, qrCode.secretToken, qrCode.version, signature),
        };
    });

    return NextResponse.json({ success: true, results });
}


