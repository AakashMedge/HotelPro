'use client';

import React from 'react';
import {
    CreditCard,
    Zap,
    Crown,
    Building2,
    ShieldCheck,
    Edit3,
    Plus,
    LayoutGrid,
    Sparkles,
    Settings2,
    Check
} from 'lucide-react';

const PLANS = [
    {
        id: 'BASIC',
        name: 'Basic Starter',
        price: '₹2,499',
        billing: 'per month',
        tagline: 'Streamlined essentials for small cafes.',
        icon: Building2,
        features: ['10 Tables', '50 Menu Items', 'Base Analytics', 'Standard QR'],
        gradient: 'from-blue-600 via-blue-500 to-cyan-400',
        stats: '124 Hotels'
    },
    {
        id: 'ADVANCE',
        name: 'Pro Growth',
        price: '₹5,999',
        billing: 'per month',
        tagline: 'Scale your hospitality operations.',
        icon: Zap,
        features: ['40 Tables', '150 Menu Items', 'Inventory Mgmt', 'Priority Support'],
        gradient: 'from-emerald-600 via-emerald-500 to-teal-400',
        stats: '85 Hotels'
    },
    {
        id: 'PREMIUM',
        name: 'Elite Experience',
        price: '₹12,499',
        billing: 'per month',
        tagline: 'The pinnacle of AI-driven service.',
        icon: Crown,
        features: ['100 Tables', '500 Menu Items', 'AI Concierge', 'Performance Logs'],
        gradient: 'from-amber-600 via-orange-500 to-yellow-400',
        stats: '42 Hotels',
        popular: true
    },
    {
        id: 'BUSINESS',
        name: 'Enterprise',
        price: 'Custom',
        billing: 'custom',
        tagline: 'Unmatched power for hotel chains.',
        icon: ShieldCheck,
        features: ['Unlimited Scale', 'White Labeling', 'Enterprise API', 'Dedicated AM'],
        gradient: 'from-fuchsia-600 via-purple-600 to-indigo-500',
        stats: '12 Hotels'
    }
];

export default function SubscriptionsPage() {
    return (
        <div className="max-w-7xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* HER0 SECTION */}
            <div className="relative mb-16 pt-8">
                <div className="absolute top-0 left-0 w-full h-px bg-linear-to-r from-transparent via-slate-200 to-transparent"></div>
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100/50 text-blue-600 text-[10px] font-bold uppercase tracking-widest">
                            <Sparkles className="w-3 h-3" />
                            Platform Revenue Settings
                        </div>
                        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight leading-none">
                            Revenue <span className="bg-linear-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Architecture</span>
                        </h1>
                        <p className="text-slate-500 text-lg font-medium max-w-xl">
                            Configure global subscription tiers, pricing models, and system-wide feature availability.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button className="h-11 px-5 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold text-sm shadow-xs hover:border-slate-300 hover:bg-slate-50 transition-all flex items-center gap-2">
                            <Settings2 className="w-4 h-4" />
                            Global Limits
                        </button>
                        <button className="h-11 px-6 rounded-xl bg-[#0F172A] text-white font-bold text-sm shadow-xl shadow-slate-200 hover:scale-105 active:scale-95 transition-all flex items-center gap-3">
                            <Plus className="w-4 h-4" />
                            New Tier
                        </button>
                    </div>
                </div>
            </div>

            {/* PERFORMANCE OVERVIEW */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12">
                {[
                    { label: 'Active Revenue', val: '₹8.4L', sub: '+12%', color: 'blue' },
                    { label: 'Total Tiers', val: '04', sub: 'Standard', color: 'slate' },
                    { label: 'Market Share', val: '22%', sub: 'Growth', color: 'emerald' },
                    { label: 'System Health', val: '100%', sub: 'Live', color: 'cyan' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white border border-slate-200/60 p-5 rounded-2xl flex flex-col justify-between group hover:border-blue-200 transition-colors">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</span>
                        <div className="flex items-baseline justify-between mt-2">
                            <span className="text-2xl font-bold text-slate-900">{stat.val}</span>
                            <span className={`text-[10px] font-bold ${stat.color === 'emerald' ? 'text-emerald-500' : 'text-blue-500'}`}>{stat.sub}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* PLANS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {PLANS.map((plan) => (
                    <div
                        key={plan.id}
                        className={`group relative bg-white border border-slate-100 rounded-[32px] p-1 flex flex-col h-full shadow-2xl shadow-slate-200/50 hover:shadow-blue-500/10 transition-all duration-500 ${plan.popular ? 'border-blue-500 scale-105 z-10' : ''}`}
                    >
                        {plan.popular && (
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full shadow-lg shadow-blue-500/40 border-2 border-white">
                                Most Popular
                            </div>
                        )}

                        <div className="p-8 flex-1 flex flex-col">
                            {/* Icon & Title */}
                            <div className={`w-14 h-14 rounded-2xl bg-linear-to-br ${plan.gradient} flex items-center justify-center text-white mb-8 shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform duration-500`}>
                                <plan.icon className="w-7 h-7" />
                            </div>

                            <div className="space-y-1 mb-6">
                                <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{plan.name}</h3>
                                <p className="text-slate-400 text-sm font-medium leading-relaxed">{plan.tagline}</p>
                            </div>

                            <div className="flex items-baseline gap-1.5 mb-8">
                                <span className="text-3xl font-black text-slate-900">{plan.price}</span>
                                <span className="text-slate-400 text-sm font-bold uppercase tracking-widest">{plan.billing}</span>
                            </div>

                            <div className="space-y-4 mb-10 flex-1">
                                {plan.features.map((f, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center bg-linear-to-br ${plan.gradient} text-white p-1`}>
                                            <Check className="w-3 h-3 stroke-[3px]" />
                                        </div>
                                        <span className="text-sm font-semibold text-slate-600">{f}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Plan Foot */}
                            <div className="pt-6 border-t border-slate-50 mt-auto">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-2">
                                        <div className="flex -space-x-2">
                                            {[1, 2, 3].map(i => <div key={i} className="w-5 h-5 rounded-full border-2 border-white bg-slate-200 overflow-hidden"></div>)}
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{plan.stats}</span>
                                    </div>
                                    <Edit3 className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                                </div>
                                <button className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${plan.popular ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20 hover:bg-blue-700' : 'bg-slate-50 text-slate-900 hover:bg-slate-100 border border-slate-200'}`}>
                                    Config Tiers
                                    <LayoutGrid className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* BOTTOM CTA Area */}
            <div className="mt-20 p-1 rounded-[40px] bg-linear-to-br from-slate-900 via-blue-950 to-indigo-950 shadow-2xl shadow-indigo-500/20 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500 rounded-full blur-[120px]"></div>
                </div>

                <div className="relative z-10 py-12 px-12 text-center">
                    <div className="w-16 h-16 bg-white/10 rounded-3xl backdrop-blur-xl border border-white/20 flex items-center justify-center mx-auto mb-6 transform rotate-3">
                        <CreditCard className="w-8 h-8 text-blue-400" />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-4">Centralized Billing Engine</h2>
                    <p className="text-blue-200/70 max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
                        The HotelPro subscription layer is built on an automated feature-gating engine. Changes to tiers here will propagate to all hotel clients instantly.
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-4">
                        <button className="h-12 px-8 rounded-2xl bg-white text-[#0F172A] font-black text-xs uppercase tracking-widest shadow-xl hover:scale-105 transition-all">
                            Review Logic
                        </button>
                        <button className="h-12 px-8 rounded-2xl bg-white/10 text-white font-black text-xs uppercase tracking-widest shadow-xl backdrop-blur-xl border border-white/10 hover:bg-white/20 transition-all">
                            View API Docs
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
