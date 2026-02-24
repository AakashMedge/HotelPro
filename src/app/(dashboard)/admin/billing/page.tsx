'use client';

import { useState, useEffect } from 'react';
import {
    CreditCard, History, CheckCircle2,
    Calendar, ArrowRight, BarChart3,
    ShieldCheck, Info, ChevronRight,
    Search, Filter, Download
} from 'lucide-react';
import Link from 'next/link';

type BillingData = {
    plan: {
        name: string;
        code: string;
        price: number;
        features: Record<string, boolean>;
        limits: Record<string, number>;
    };
    subscription: {
        status: string;
        startDate: string;
        lastBillingDate: string;
        nextBillingDate: string;
        version: number;
    };
    usage: {
        tables: { current: number; limit: number; percentage: number };
        menuItems: { current: number; limit: number; percentage: number };
    };
    allPlans: { name: string; code: string; price: number; highlight: boolean }[];
};

const PLAN_DETAILS: Record<string, string[]> = {
    STARTER: ['100 Tables', '300 Menu Items', 'QR Menu & Ordering', 'Basic Analytics'],
    GROWTH: ['Unlimited Tables', '1,000 Menu Items', 'Inventory Management', 'AI Assistant', 'Standard Branding'],
    ELITE: ['Unlimited Tables', 'Unlimited Menu Items', 'Multi-Property Sync', 'Isolated Data Node', 'Custom Branding', 'Priority Support'],
};

export default function AdminBillingPage() {
    const [loading, setLoading] = useState(true);
    const [billing, setBilling] = useState<BillingData | null>(null);
    const [showUpgradeDetails, setShowUpgradeDetails] = useState(false);

    useEffect(() => {
        async function fetchBilling() {
            try {
                const res = await fetch('/api/admin/billing');
                if (res.ok) {
                    const data = await res.json();
                    setBilling(data);
                }
            } catch (err) {
                console.error('Failed to fetch billing:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchBilling();
    }, []);

    if (loading) return (
        <div className="min-h-screen bg-white flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
        </div>
    );

    const activePlan = billing?.plan;
    const nextBill = billing?.subscription?.nextBillingDate
        ? new Date(billing.subscription.nextBillingDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        : '—';

    return (
        <div className="max-w-5xl mx-auto px-6 py-12 bg-white min-h-screen text-slate-900 font-sans antialiased">

            {/* Minimalist Header */}
            <header className="mb-12">
                <h1 className="text-2xl font-semibold tracking-tight">Account & Billing</h1>
                <p className="text-slate-500 text-sm mt-1">Manage your professional subscription and resource allocation.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

                {/* Left Column: Plan & Usage */}
                <div className="lg:col-span-8 space-y-12">

                    {/* Current Plan Card */}
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-medium uppercase tracking-wider text-slate-400">Current Subscription</h2>
                            <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded font-bold uppercase">
                                {billing?.subscription?.status || 'Active'}
                            </span>
                        </div>
                        <div className="border border-slate-100 rounded-xl p-8 bg-slate-50/50">
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                                <div>
                                    <p className="text-3xl font-bold tracking-tight">{activePlan?.name || 'Starter'}</p>
                                    <p className="text-slate-500 text-sm mt-2">
                                        Professional tier with optimized features for your property.
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-semibold">₹{activePlan?.price.toLocaleString()}<span className="text-sm font-normal text-slate-400">/mo</span></p>
                                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mt-1">Next bill on {nextBill}</p>
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-2 gap-4">
                                {PLAN_DETAILS[activePlan?.code || 'STARTER']?.slice(0, 4).map(feature => (
                                    <div key={feature} className="flex items-center gap-2 text-xs text-slate-600">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-slate-900" />
                                        {feature}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* Resource Utilization */}
                    <section>
                        <h2 className="text-sm font-medium uppercase tracking-wider text-slate-400 mb-6">Resource Allocation</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {[
                                { label: 'Tables', ...billing?.usage?.tables },
                                { label: 'Menu Items', ...billing?.usage?.menuItems }
                            ].map((usage) => (
                                <div key={usage.label} className="border border-slate-100 rounded-xl p-6">
                                    <div className="flex justify-between items-center mb-4">
                                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{usage.label}</p>
                                        <p className="text-sm font-medium">{usage.current} <span className="text-slate-300 mx-1">/</span> {usage.limit === 0 ? '∞' : usage.limit}</p>
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-slate-900 transition-all duration-700 ease-out"
                                            style={{ width: `${Math.min(usage.percentage || 0, 100)}%` }}
                                        />
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-3 font-medium">
                                        {usage.percentage}% capacity utilized
                                    </p>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Financial Records (Simplified) */}
                    <section>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-sm font-medium uppercase tracking-wider text-slate-400">Payment History</h2>
                            <button className="text-[10px] font-bold text-slate-400 uppercase hover:text-slate-900 transition-colors flex items-center gap-1">
                                <Download className="w-3 h-3" /> Export CSV
                            </button>
                        </div>
                        <div className="border border-slate-100 rounded-xl overflow-hidden">
                            <div className="bg-slate-50/50 px-6 py-12 flex flex-col items-center justify-center text-center">
                                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border border-slate-100 mb-4 shadow-sm">
                                    <History className="w-5 h-5 text-slate-300" />
                                </div>
                                <p className="text-sm font-medium text-slate-900">No payment records found</p>
                                <p className="text-xs text-slate-400 mt-1">Your billing history will appear here once your first cycle processes.</p>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Right Column: Actions & Help */}
                <div className="lg:col-span-4 space-y-12">

                    {/* Growth Section */}
                    <section>
                        <div className="bg-slate-900 rounded-xl p-8 text-white">
                            <h3 className="text-lg font-semibold pr-4">Upgrade your experience</h3>
                            <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                                Switch to a higher tier to unlock features like AI Concierge, Multi-Property views, and specialized inventory controls.
                            </p>

                            <div className="mt-8 space-y-3">
                                <Link
                                    href="/pricing"
                                    className="block w-full text-center bg-white text-slate-900 py-3 rounded-lg text-xs font-semibold hover:bg-slate-100 transition-colors"
                                >
                                    Explore Tiers
                                </Link>
                                <button
                                    onClick={() => setShowUpgradeDetails(!showUpgradeDetails)}
                                    className="w-full text-center border border-slate-700 text-slate-400 py-3 rounded-lg text-xs font-semibold hover:border-slate-500 hover:text-white transition-all"
                                >
                                    Compare Benefits
                                </button>
                            </div>

                            {showUpgradeDetails && (
                                <div className="mt-6 pt-6 border-t border-slate-800 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                    {['GROWTH', 'ELITE'].map(pCode => (
                                        <div key={pCode}>
                                            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">{pCode}</p>
                                            <div className="mt-2 space-y-1.5 text-[11px] text-slate-400">
                                                {PLAN_DETAILS[pCode].slice(0, 3).map(f => (
                                                    <div key={f} className="flex items-center gap-2">
                                                        <CheckCircle2 className="w-3 h-3 text-slate-600" />
                                                        {f}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Support & Compliance */}
                    <section className="space-y-6">
                        <div className="p-4 border border-slate-100 rounded-xl flex items-start gap-3">
                            <ShieldCheck className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Security</p>
                                <p className="text-[11px] leading-relaxed text-slate-500 mt-1">
                                    Transactions are processed via secured gateways complying with PCI-DSS standards. Invoices serve as legal tax documents.
                                </p>
                            </div>
                        </div>

                        <div className="px-4">
                            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-4">Support Resources</p>
                            <nav className="space-y-3">
                                {[
                                    { label: 'Billing Policy', href: '#' },
                                    { label: 'Refund Terms', href: '#' },
                                    { label: 'Tax Configuration', href: '#' }
                                ].map(item => (
                                    <a
                                        key={item.label}
                                        href={item.href}
                                        className="group flex items-center justify-between text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
                                    >
                                        {item.label}
                                        <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1" />
                                    </a>
                                ))}
                            </nav>
                        </div>
                    </section>
                </div>

            </div>

            {/* Platform Stamp */}
            <footer className="mt-24 pt-8 border-t border-slate-100">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 grayscale opacity-40">
                    <p className="text-[10px] font-bold tracking-tighter uppercase italic">HotelPro Professional Suite — v{billing?.subscription?.version || '1.0'}</p>
                    <p className="text-[10px] uppercase font-medium tracking-widest text-slate-500">Cloud Authored in India</p>
                </div>
            </footer>
        </div>
    );
}
