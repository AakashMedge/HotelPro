import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { username, pin, newPassword } = body;

        if (!username || !pin || !newPassword) {
            return NextResponse.json(
                { success: false, error: "Username, Security PIN, and New Password are required." },
                { status: 400 }
            );
        }

        if (String(newPassword).length < 6) {
            return NextResponse.json(
                { success: false, error: "New password must be at least 6 characters long." },
                { status: 400 }
            );
        }

        const normalizedUsername = String(username).toLowerCase().trim();
        const normalizedPin = String(pin).trim();

        // 1. Find user by unique username
        const user = await prisma.user.findUnique({
            where: { username: normalizedUsername },
            include: { client: { select: { id: true, name: true, status: true } } }
        });

        if (!user) {
            return NextResponse.json(
                { success: false, error: "Invalid username or Security PIN." },
                { status: 401 }
            );
        }

        // 2. Check if user's tenant is active
        if (user.client && user.client.status === 'ARCHIVED') {
            return NextResponse.json(
                { success: false, error: "This hotel account is archived. Contact Super Admin." },
                { status: 403 }
            );
        }

        // 3. Verify Security PIN
        if (!user.pin || user.pin.trim() !== normalizedPin) {
            return NextResponse.json(
                { success: false, error: "Invalid Security PIN. Please enter the correct PIN provided by your Administrator." },
                { status: 401 }
            );
        }

        // 4. Hash and update password
        const passwordHash = await hashPassword(String(newPassword));
        await prisma.user.update({
            where: { id: user.id },
            data: {
                passwordHash,
                passwordEncrypted: String(newPassword),
            }
        });

        return NextResponse.json({
            success: true,
            message: `Password reset successfully for ${user.name}! You can now login with your new password.`
        });
    } catch (err: unknown) {
        console.error("[AUTH_RESET_PASSWORD]", err);
        return NextResponse.json(
            { success: false, error: err instanceof Error ? err.message : "Failed to reset password." },
            { status: 500 }
        );
    }
}
