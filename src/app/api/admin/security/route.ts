import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/server";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

/**
 * GET /api/admin/security
 * Returns current admin user profile and credentials status
 */
export async function GET() {
    try {
        const session = await getCurrentUser();
        if (!session || !['ADMIN', 'MANAGER'].includes(session.role)) {
            return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.id },
            select: {
                id: true,
                username: true,
                name: true,
                role: true,
                pin: true,
                passwordEncrypted: true,
                createdAt: true,
            }
        });

        if (!user) {
            return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            user: {
                username: user.username,
                name: user.name,
                role: user.role,
                hasPin: !!user.pin,
                pin: user.pin || '1234',
                passwordVault: user.passwordEncrypted || '••••••••',
            }
        });
    } catch (err: unknown) {
        console.error("[ADMIN_SECURITY_GET]", err);
        return NextResponse.json({ success: false, error: "Failed to fetch security profile" }, { status: 500 });
    }
}

/**
 * POST /api/admin/security
 * Self-service password and PIN update
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getCurrentUser();
        if (!session || !['ADMIN', 'MANAGER'].includes(session.role)) {
            return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
        }

        const body = await request.json();
        const { currentPin, currentPassword, newPassword, newPin, newUsername } = body;

        const user = await prisma.user.findUnique({
            where: { id: session.id }
        });

        if (!user) {
            return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
        }

        // Verify authorization via PIN or Current Password
        let isAuthorized = false;
        if (currentPin && user.pin && currentPin.trim() === user.pin.trim()) {
            isAuthorized = true;
        } else if (currentPassword) {
            isAuthorized = await verifyPassword(currentPassword, user.passwordHash);
        } else if (!user.pin) {
            // First time setting PIN
            isAuthorized = true;
        }

        if (!isAuthorized) {
            return NextResponse.json(
                { success: false, error: "Incorrect Current PIN or Password verification failed." },
                { status: 401 }
            );
        }

        const updateData: { username?: string; passwordHash?: string; passwordEncrypted?: string; pin?: string } = {};

        // 1. Update Username if requested
        if (newUsername && newUsername.trim().toLowerCase() !== user.username) {
            const normalizedUsername = newUsername.trim().toLowerCase();
            const exists = await prisma.user.findUnique({
                where: { username: normalizedUsername }
            });
            if (exists) {
                return NextResponse.json(
                    { success: false, error: "Username is already taken by another account." },
                    { status: 400 }
                );
            }
            updateData.username = normalizedUsername;
        }

        // 2. Update Password if requested
        if (newPassword && newPassword.trim()) {
            if (newPassword.length < 6) {
                return NextResponse.json(
                    { success: false, error: "New password must be at least 6 characters long." },
                    { status: 400 }
                );
            }
            updateData.passwordHash = await hashPassword(newPassword);
            updateData.passwordEncrypted = newPassword;
        }

        // 3. Update PIN if requested
        if (newPin && newPin.trim()) {
            if (newPin.trim().length < 4 || newPin.trim().length > 6) {
                return NextResponse.json(
                    { success: false, error: "Security PIN must be 4 to 6 digits." },
                    { status: 400 }
                );
            }
            updateData.pin = newPin.trim();
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json(
                { success: false, error: "No changes provided to update." },
                { status: 400 }
            );
        }

        await prisma.user.update({
            where: { id: user.id },
            data: updateData
        });

        return NextResponse.json({
            success: true,
            message: "Credentials successfully updated and locked!"
        });
    } catch (err: unknown) {
        console.error("[ADMIN_SECURITY_POST]", err);
        return NextResponse.json(
            { success: false, error: err instanceof Error ? err.message : "Failed to update security credentials." },
            { status: 500 }
        );
    }
}
