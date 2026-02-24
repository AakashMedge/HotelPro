'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
    Check, ArrowRight, Zap, Shield, Crown,
    ChevronDown, Sparkles, Server, Users, Bot,
    BarChart3, Palette, HeadphonesIcon, Database,
    Globe2, ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

// ============================================
// Plan Data
// ============================================

const PLANS = [
    {
        code: 'STARTER',
        name: 'Starter',
        tagline: 'Standard essentials for small outfits.',
        price: 1999,
        features: [
            { label: 'QR Digital Menu', included: true },
            { label: 'Order Management', included: true },
            { label: 'Basic KOT System', included: true },
            { label: 'Basic Billing', included: true },
            { label: 'Up to 100 Tables', included: true },
            { label: 'Up to 300 Menu Items', included: true },
            { label: 'Inventory Tracking', included: false },
            { label: 'AI Features', included: false },
        ],
    },
    {
        code: 'GROWTH',
        name: 'Growth',
        tagline: 'Professional tools for scaling venues.',
        price: 4999,
        popular: true,
        features: [
            { label: 'Everything in Starter', included: true },
            { label: 'Inventory Management', included: true },
            { label: 'AI Menu Assistant', included: true },
            { label: 'Customer Order Flow', included: true },
            { label: 'Up to 250 Tables', included: true },
            { label: 'Up to 1000 Menu Items', included: true },
            { label: 'Standard Branding', included: true },
            { label: 'Multi-Property Sync', included: false },
        ],
    },
    {
        code: 'ELITE',
        name: 'Elite',
        tagline: 'Maximum performance & dedicated infras.',
        price: 19999,
        features: [
            { label: 'Everything in Growth', included: true },
            { label: 'Full AI Automation', included: true },
            { label: 'AI Performance Analysis', included: true },
            { label: 'Multi-Property Sync', included: true },
            { label: 'Isolated Data Node', included: true },
            { label: 'Custom Branding', included: true },
            { label: 'Priority Support', included: true },
            { label: 'Unlimited Capacity', included: true },
        ],
    },
];

const COMPARISON_ROWS = [
    {
        category: 'Core Operations', features: [
            { name: 'QR Digital Menu', starter: true, growth: true, elite: true },
            { name: 'Order & Table Management', starter: true, growth: true, elite: true },
            { name: 'KOT Management', starter: 'Basic', growth: 'Advanced', elite: 'Pro' },
            { name: 'Financial Billing', starter: 'Standard', growth: 'Unified', elite: 'Advanced' },
        ]
    },
    {
        category: 'AI Capabilities', features: [
            { name: 'AI Menu Assistant', starter: false, growth: 'Limited', elite: 'Full' },
            { name: 'AI Ops Optimization', starter: false, growth: false, elite: true },
            { name: 'Smart Insights', starter: false, growth: 'Standard', elite: 'Real-time' },
        ]
    },
    {
        category: 'Scale & Infras', features: [
            { name: 'Tables Capacity', starter: '100', growth: '250', elite: 'Unlimited' },
            { name: 'Menu Items', starter: '300', growth: '1,000', elite: 'Unlimited' },
            { name: 'Database Architecture', starter: 'Shared', growth: 'Partitioned', elite: 'Dedicated Node' },
            { name: 'Support SLA', starter: 'Email', growth: 'Priority', elite: '24/7 Dedicated' },
        ]
    },
];

function PricingContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const highlight = searchParams.get('highlight') || '';
    const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');
    const [showComparison, setShowComparison] = useState(false);
    const [currentPlan, setCurrentPlan] = useState<string | null>(null);

    useEffect(() => {
        async function fetchCurrentPlan() {
            try {
                const res = await fetch('/api/entitlements');
                if (res.ok) {
                    const data = await res.json();
                    setCurrentPlan(data.planName?.toUpperCase() || null);
                }
            } catch { }
        }
        fetchCurrentPlan();
    }, []);

    const getPrice = (base: number) => {
        if (billing === 'annual') return Math.round(base * 0.8);
        return base;
    };

    const handleSelectPlan = (planCode: string) => {
        if (currentPlan === planCode) return;
        router.push(`/admin/billing?upgrade=${planCode}`);
    };

    const renderCellValue = (val: boolean | string) => {
        if (val === true) return <Check className="w-3.5 h-3.5 text-slate-900 mx-auto" strokeWidth={3} />;
        if (val === false) return <span className="text-slate-200">—</span>;
        return <span className="text-[11px] font-medium text-slate-600">{val}</span>;
    };

    return (
        <div className="bg-white min-h-screen text-slate-900 selection:bg-slate-900 selection:text-white antialiased">

            {/* Minimalist Nav */}
            <nav className="max-w-7xl mx-auto px-6 py-8 flex justify-between items-center">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-wider"
                >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back
                </button>
                <div className="hidden md:block">
                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.3em]">HotelPro Platform</p>
                </div>
            </nav>

            {/* Core Header */}
            <div className="max-w-4xl mx-auto px-6 pt-12 pb-20 text-center">
                <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-[1.1] mb-6">
                    Professional plans for <br className="hidden md:block" />
                    modern hospitality.
                </h1>
                <p className="text-slate-500 text-base max-w-lg mx-auto leading-relaxed">
                    Choose the architecture that fits your volume. <br className="hidden md:block" /> No hidden fees, cancel anytime.
                </p>

                {/* Billing Selector */}
                <div className="mt-12 inline-flex items-center p-1 bg-slate-50 border border-slate-100 rounded-lg">
                    <button
                        onClick={() => setBilling('monthly')}
                        className={`px-6 py-2 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all ${billing === 'monthly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Monthly
                    </button>
                    <button
                        onClick={() => setBilling('annual')}
                        className={`px-6 py-2 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${billing === 'annual' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Annual
                        <span className="bg-slate-900 text-white text-[9px] px-1.5 py-0.5 rounded uppercase">-20%</span>
                    </button>
                </div>
            </div>

            {/* Matrix */}
            <div className="max-w-7xl mx-auto px-6 pb-32">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-16 items-start">
                    {PLANS.map((plan) => {
                        const isCurrent = currentPlan === plan.code;
                        const isHighlighted = highlight === plan.code;
                        const price = getPrice(plan.price);

                        return (
                            <div key={plan.code} className="group">
                                <div className={`flex flex-col h-full ${isHighlighted ? 'opacity-100 ring-1 ring-slate-900/5 p-2 rounded-2xl' : ''}`}>
                                    <div className="mb-10">
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">{plan.name}</h3>
                                            {plan.popular && (
                                                <span className="text-[10px] font-bold bg-slate-900 text-white px-2 py-0.5 rounded-full uppercase tracking-widest">Recommended</span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-500 font-medium mb-8 leading-snug">{plan.tagline}</p>

                                        <div className="flex items-baseline gap-1">
                                            <span className="text-3xl font-bold tracking-tighter">₹{price.toLocaleString()}</span>
                                            <span className="text-xs text-slate-400 font-medium uppercase tracking-widest">/mo</span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleSelectPlan(plan.code)}
                                        disabled={isCurrent}
                                        className={`w-full py-3.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all mb-12 ${isCurrent
                                            ? 'bg-slate-50 text-slate-400 cursor-not-allowed border border-slate-100'
                                            : plan.popular
                                                ? 'bg-slate-900 text-white hover:bg-black shadow-lg shadow-slate-200'
                                                : 'bg-white text-slate-900 border border-slate-200 hover:border-slate-900'
                                            }`}
                                    >
                                        {isCurrent ? 'Current Plan' : plan.code === 'ELITE' ? 'Talk to Sales' : 'Select Plan'}
                                    </button>

                                    <div className="space-y-4">
                                        {plan.features.map((f) => (
                                            <div key={f.label} className="flex items-start gap-3">
                                                {f.included ? (
                                                    <Check className="w-4 h-4 text-slate-900 shrink-0 mt-0.5" strokeWidth={2.5} />
                                                ) : (
                                                    <span className="w-4 h-4 text-slate-200 shrink-0 mt-0.5 text-center">—</span>
                                                )}
                                                <span className={`text-[13px] leading-tight ${f.included ? 'text-slate-600 font-medium' : 'text-slate-300 italic'}`}>
                                                    {f.label}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Advanced Comparison Toggle */}
            <div className="max-w-7xl mx-auto px-6 border-t border-slate-50 py-16 text-center">
                <button
                    onClick={() => setShowComparison(!showComparison)}
                    className="group inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all"
                >
                    Compare Technical Specifications
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${showComparison ? 'rotate-180 text-slate-900' : ''}`} />
                </button>
            </div>

            {showComparison && (
                <div className="max-w-5xl mx-auto px-6 pb-32 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50/50">
                                    <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] w-[40%]">Infrastructure</th>
                                    <th className="px-6 py-5 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">Starter</th>
                                    <th className="px-6 py-5 text-center text-[10px] font-bold text-slate-900 uppercase tracking-widest bg-slate-100/30">Growth</th>
                                    <th className="px-6 py-5 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">Elite</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {COMPARISON_ROWS.map((section) => (
                                    <React.Fragment key={section.category}>
                                        <tr>
                                            <td colSpan={4} className="px-8 py-4 bg-slate-50/30">
                                                <span className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">{section.category}</span>
                                            </td>
                                        </tr>
                                        {section.features.map((f) => (
                                            <tr key={f.name} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-8 py-5 text-xs font-semibold text-slate-700">{f.name}</td>
                                                <td className="px-6 py-5 text-center">{renderCellValue(f.starter)}</td>
                                                <td className="px-6 py-5 text-center bg-slate-50/20">{renderCellValue(f.growth)}</td>
                                                <td className="px-6 py-5 text-center">{renderCellValue(f.elite)}</td>
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Footer Bottom */}
            <div className="bg-slate-50 border-t border-slate-100 py-24 px-6 text-center">
                <h2 className="text-xl font-semibold mb-3">Enterprise inquiries</h2>
                <p className="text-slate-500 text-xs mb-8">For custom requirements and bulk licensing models.</p>
                <Link href="#" className="bg-slate-900 text-white px-10 py-4 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-black transition-all">
                    Contact Architecture Team
                </Link>

                <div className="mt-20 flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 opacity-30 grayscale saturate-0 pointer-events-none">
                    <Shield className="w-8 h-8" />
                    <Database className="w-8 h-8" />
                    <Globe2 className="w-8 h-8" />
                </div>
            </div>
        </div>
    );
}

export default function PricingPage() {
    return (
        <React.Suspense fallback={<div className="min-h-screen flex items-center justify-center text-slate-500 text-sm">Loading...</div>}>
            <PricingContent />
        </React.Suspense>
    );
}

import React from 'react';
