'use client';

/**
 * FeatureGate Component
 * 
 * Wraps UI elements — shows content only if the user's plan includes the feature.
 * Otherwise, shows an upgrade prompt.
 * 
 * Usage:
 *   <FeatureGate feature="inventory">
 *     <InventoryPanel />
 *   </FeatureGate>
 * 
 *   <FeatureGate feature="ai_assistant" fallback={<CustomUpgradeCard />}>
 *     <AIAssistant />
 *   </FeatureGate>
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

// ============================================
// Types
// ============================================

export type FeatureKey =
    | 'qr_menu'
    | 'basic_analytics'
    | 'order_management'
    | 'basic_kot'
    | 'basic_billing'
    | 'ai_assistant'
    | 'inventory'
    | 'ai_analysis'
    | 'custom_branding'
    | 'isolated_database'
    | 'multi_property'
    | 'ai_automation'
    | 'dedicated_support';

export type LimitKey = 'tables' | 'menuItems';

interface EntitlementState {
    planName: string;
    features: Record<string, boolean>;
    limits: Record<string, number>;
    loading: boolean;
}

// ============================================
// Context
// ============================================

const EntitlementContext = createContext<EntitlementState>({
    planName: 'STARTER',
    features: {},
    limits: {},
    loading: true,
});

export function useEntitlements() {
    return useContext(EntitlementContext);
}

export function EntitlementProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<EntitlementState>({
        planName: 'STARTER',
        features: {},
        limits: {},
        loading: true,
    });

    useEffect(() => {
        async function fetchEntitlements() {
            try {
                const res = await fetch('/api/entitlements');
                if (res.ok) {
                    const data = await res.json();
                    setState({
                        planName: data.planName || 'STARTER',
                        features: data.features || {},
                        limits: data.limits || {},
                        loading: false,
                    });
                } else {
                    setState(prev => ({ ...prev, loading: false }));
                }
            } catch {
                setState(prev => ({ ...prev, loading: false }));
            }
        }
        fetchEntitlements();
    }, []);

    return (
        <EntitlementContext.Provider value={state}>
            {children}
        </EntitlementContext.Provider>
    );
}

// ============================================
// Feature Gate Component
// ============================================

interface FeatureGateProps {
    feature: FeatureKey;
    children: ReactNode;
    fallback?: ReactNode;
    /** If true, just hides the content without showing upgrade prompt */
    silent?: boolean;
}

export default function FeatureGate({ feature, children, fallback, silent = false }: FeatureGateProps) {
    const { features, planName, loading } = useEntitlements();

    if (loading) return null;

    const hasAccess = features[feature] === true;

    if (hasAccess) {
        return <>{children}</>;
    }

    if (silent) return null;

    if (fallback) {
        return <>{fallback}</>;
    }

    // Default upgrade prompt
    return (
        <div className="relative overflow-hidden rounded-xl border border-dashed border-zinc-300 bg-gradient-to-br from-zinc-50 to-zinc-100 p-6 text-center">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.05),transparent_70%)]" />
            <div className="relative">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
                    <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                </div>
                <h3 className="text-sm font-bold text-zinc-800 mb-1">
                    Upgrade Required
                </h3>
                <p className="text-xs text-zinc-500 mb-3">
                    This feature requires a higher plan. You&apos;re currently on <span className="font-bold text-zinc-700">{planName}</span>.
                </p>
                <button
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-700 hover:shadow-md"
                    onClick={() => window.location.href = '/admin/billing'}
                >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
                    </svg>
                    Upgrade Plan
                </button>
            </div>
        </div>
    );
}

// ============================================
// Limit Gate Component
// ============================================

interface LimitGateProps {
    limitKey: LimitKey;
    currentUsage: number;
    children: ReactNode;
    fallback?: ReactNode;
}

export function LimitGate({ limitKey, currentUsage, children, fallback }: LimitGateProps) {
    const { limits, planName, loading } = useEntitlements();

    if (loading) return null;

    const limit = limits[limitKey] || 0;
    // 0 means unlimited
    const withinLimit = limit === 0 || currentUsage < limit;

    if (withinLimit) {
        return <>{children}</>;
    }

    if (fallback) {
        return <>{fallback}</>;
    }

    return (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
            <p className="text-sm font-bold text-amber-800 mb-1">Limit Reached</p>
            <p className="text-xs text-amber-600">
                You&apos;ve used {currentUsage}/{limit} on your <span className="font-bold">{planName}</span> plan.
                Upgrade for more capacity.
            </p>
        </div>
    );
}
