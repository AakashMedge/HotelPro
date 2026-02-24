/**
 * GET /api/entitlements
 * 
 * Returns the current user's plan features and limits.
 * Used by the <FeatureGate> client component to gate UI features.
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { getEntitlements } from '@/lib/services/entitlements';

export async function GET() {
    try {
        const user = await requireAuth();
        if (!user?.clientId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const entitlements = await getEntitlements(user.clientId);

        return NextResponse.json({
            planName: entitlements.planName,
            subscriptionStatus: entitlements.subscriptionStatus,
            features: entitlements.features,
            limits: entitlements.limits,
        });
    } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
}
