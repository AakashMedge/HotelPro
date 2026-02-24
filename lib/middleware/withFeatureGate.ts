/**
 * API Feature Gate Middleware
 * 
 * Server-side middleware to block API calls if the client's plan 
 * doesn't include the required feature or has reached a limit.
 * 
 * Usage:
 *   // In any API route handler:
 *   export async function POST(req: Request) {
 *       const gate = await checkFeatureGate('inventory');
 *       if (gate) return gate; // Returns 403 response if blocked
 *       
 *       // ... proceed with route logic
 *   }
 * 
 *   // For limit checks:
 *   export async function POST(req: Request) {
 *       const gate = await checkLimitGate('tables');
 *       if (gate) return gate;
 *       
 *       // ... proceed with creating table
 *   }
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { hasFeature, checkResourceLimit, type FeatureKey, type LimitKey } from '@/lib/services/entitlements';

/**
 * Check if the current user's plan includes a specific feature.
 * Returns null if access is allowed, or a 403 NextResponse if blocked.
 */
export async function checkFeatureGate(
    feature: FeatureKey,
    customMessage?: string
): Promise<NextResponse | null> {
    try {
        const user = await requireAuth();
        if (!user?.clientId) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const allowed = await hasFeature(user.clientId, feature);

        if (!allowed) {
            return NextResponse.json(
                {
                    error: customMessage || `This feature requires a plan upgrade.`,
                    code: 'FEATURE_GATED',
                    feature,
                    currentPlan: user.plan || 'STARTER',
                    upgradeUrl: '/admin/billing',
                },
                { status: 403 }
            );
        }

        return null; // Access granted
    } catch {
        return NextResponse.json(
            { error: 'Authentication required' },
            { status: 401 }
        );
    }
}

/**
 * Check if the current user's plan allows creating more of a limited resource.
 * Returns null if within limits, or a 403 NextResponse if limit is reached.
 */
export async function checkLimitGate(
    limitKey: LimitKey,
    customMessage?: string
): Promise<NextResponse | null> {
    try {
        const user = await requireAuth();
        if (!user?.clientId) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const result = await checkResourceLimit(user.clientId, limitKey);

        if (!result.allowed) {
            return NextResponse.json(
                {
                    error: customMessage || `You've reached the ${limitKey} limit for your plan.`,
                    code: 'LIMIT_REACHED',
                    limitKey,
                    current: result.current,
                    max: result.limit,
                    currentPlan: user.plan || 'STARTER',
                    upgradeUrl: '/admin/billing',
                },
                { status: 403 }
            );
        }

        return null; // Within limits
    } catch {
        return NextResponse.json(
            { error: 'Authentication required' },
            { status: 401 }
        );
    }
}
