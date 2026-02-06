import { NextResponse } from 'next/server';
import { getPlatformStats } from '@/lib/services/admin';
import { requireSuperAdmin } from '@/lib/hq/auth';

export async function GET() {
    try {
        // Only Super Admins can see platform-level stats
        await requireSuperAdmin();

        const stats = await getPlatformStats();
        return NextResponse.json({ success: true, stats });
    } catch (error: any) {
        console.error('[ADMIN_STATS_ERROR]', error);
        return NextResponse.json(
            { success: false, message: error.message || 'Failed to fetch platform stats' },
            { status: error.message?.includes('required') ? 401 : 500 }
        );
    }
}
