import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import * as bcrypt from 'bcryptjs';
import { requireSuperAdmin, hashHQPassword } from '@/lib/hq/auth';

export async function POST(request: NextRequest) {
    try {
        const superAdmin = await requireSuperAdmin();

        const body = await request.json();
        const { currentPassword, newPassword } = body;

        if (!currentPassword || !newPassword) {
            return NextResponse.json(
                { success: false, error: 'Current password and new password are required.' },
                { status: 400 }
            );
        }

        if (newPassword.length < 6) {
            return NextResponse.json(
                { success: false, error: 'New password must be at least 6 characters.' },
                { status: 400 }
            );
        }

        // Fetch latest record from DB
        const adminRecord = await prisma.superAdmin.findUnique({
            where: { id: superAdmin.id }
        });

        if (!adminRecord) {
            return NextResponse.json(
                { success: false, error: 'Super Admin account not found.' },
                { status: 404 }
            );
        }

        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, adminRecord.passwordHash);
        if (!isMatch) {
            return NextResponse.json(
                { success: false, error: 'Current password does not match.' },
                { status: 400 }
            );
        }

        // Update with new password hash
        const newHash = await hashHQPassword(newPassword);
        await prisma.superAdmin.update({
            where: { id: superAdmin.id },
            data: { passwordHash: newHash }
        });

        return NextResponse.json({
            success: true,
            message: 'Super Admin password successfully updated.'
        });

    } catch (error: any) {
        console.error('[HQ_CHANGE_PASSWORD_ERROR]', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to update Super Admin password.' },
            { status: error.message?.includes('required') ? 401 : 500 }
        );
    }
}
