'use client';

import React, { useEffect, useState } from 'react';
import {
    Building2, ShoppingCart, DollarSign, Users,
    ArrowUpRight, Shield, Globe, ArrowRight,
    Loader2, Activity, Zap
} from 'lucide-react';
import { motion } from 'framer-motion';

interface PlatformStats {
    totalClients: number;
    totalOrders: number;
    totalRevenue: number;
    activeUsers: number;
    plansDistribution: { plan: string; count: number }[];
}

export default function HQDashboard() {
    const [stats, setStats] = useState<PlatformStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        async function fetchStats() {
            try {
                const res = await fetch('/api/admin/stats');
                const data = await res.json();
                if (data.success) {
                    setStats(data.stats);
                } else {
                    setError(data.message || 'Failed to load stats');
                }
            } catch (err) {
                setError('Network error');
            } finally {
                setLoading(false);
            }
        }
        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="h-[60vh] flex flex-col items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mb-4" />
                <p className="text-zinc-400 text-xs font-medium tracking-widest uppercase">Syncing Platform Data</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-[60vh] flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto">
                        <Activity className="w-6 h-6 text-red-500" />
                    </div>
                    <p className="text-zinc-900 font-medium">{error}</p>
                    <button onClick={() => window.location.reload()} className="text-xs text-indigo-600 underline underline-offset-4">Retry Connection</button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-[1200px] mx-auto space-y-12 pb-20">
            {/* Header: More Character with subtle color */}
            <div className="flex justify-between items-end border-b border-zinc-100 pb-10">
                <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[9px] font-black uppercase tracking-widest border border-indigo-100">
                            v4.2 Stable
                        </div>
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Central Intelligence</span>
                    </div>
                    <h1 className="text-4xl font-light text-zinc-950 tracking-tight">Command <span className="font-semibold italic text-indigo-600">Center</span></h1>
                    <p className="text-sm text-zinc-500 font-medium">Monitoring <span className="text-zinc-900 font-semibold">{stats?.totalClients} active properties</span> across the network.</p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Global Managed Revenue</p>
                    <div className="flex items-baseline gap-2 justify-end">
                        <span className="text-xs font-bold text-indigo-600">INR</span>
                        <p className="text-4xl font-black text-zinc-950 tabular-nums tracking-tighter">
                            {(stats?.totalRevenue || 0).toLocaleString('en-IN')}
                        </p>
                    </div>
                </div>
            </div>

            {/* Core Metrics: Infused with subtle color identities */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatMetric
                    label="Managed Hotels"
                    value={stats?.totalClients || 0}
                    icon={<Building2 className="w-4 h-4" />}
                    color="text-indigo-600"
                    bg="bg-indigo-50"
                    border="border-indigo-100"
                />
                <StatMetric
                    label="Active Sessions"
                    value={stats?.totalOrders || 0}
                    icon={<Zap className="w-4 h-4" />}
                    color="text-amber-600"
                    bg="bg-amber-50"
                    border="border-amber-100"
                />
                <StatMetric
                    label="Staff Nodes"
                    value={stats?.activeUsers || 0}
                    icon={<Users className="w-4 h-4" />}
                    color="text-indigo-600"
                    bg="bg-indigo-50"
                    border="border-indigo-100"
                />
                <StatMetric
                    label="System Health"
                    value="99.9%"
                    icon={<Globe className="w-4 h-4" />}
                    color="text-emerald-600"
                    bg="bg-emerald-50"
                    border="border-emerald-100"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                {/* Distribution: Each card gets a touch of personality */}
                <div className="lg:col-span-8 space-y-8">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xs font-black text-zinc-900 uppercase tracking-[0.2em]">Growth Statistics</h2>
                        <button className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 transition-colors uppercase tracking-widest flex items-center gap-1">
                            Detailed Audit <ArrowRight className="w-3 h-3" />
                        </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {stats?.plansDistribution.map((plan, i) => (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                key={plan.plan}
                                className="bg-white border border-zinc-100 p-6 rounded-2xl hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/5 transition-all group relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity">
                                    <Shield className="w-12 h-12 text-indigo-600" />
                                </div>
                                <p className="text-3xl font-black text-zinc-950 tracking-tighter group-hover:text-indigo-600 transition-colors">{plan.count}</p>
                                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-1">{plan.plan}</p>
                            </motion.div>
                        ))}
                    </div>

                    <div className="h-[200px] w-full bg-white rounded-[2.5rem] p-10 flex flex-col justify-between items-start group relative overflow-hidden border-2 border-indigo-600/20 shadow-xl shadow-indigo-500/5">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full -mr-20 -mt-20 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                        <div className="space-y-2 relative z-10">
                            <h3 className="text-zinc-950 font-black text-xl tracking-tight">Revenue Velocity <span className="text-indigo-600">Intelligence</span></h3>
                            <p className="text-zinc-500 text-sm max-w-sm font-bold tracking-tight">Generating real-time reports for property growth and platform commission tracks.</p>
                        </div>
                        <button className="bg-indigo-600 text-white px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all relative z-10 flex items-center gap-2 shadow-lg shadow-indigo-500/20">
                            Access Analytics <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                {/* Shortcuts: Colorful Primary Buttons as requested */}
                <div className="lg:col-span-4 space-y-8">
                    <h2 className="text-xs font-black text-zinc-900 uppercase tracking-[0.2em]">Interventions</h2>
                    <div className="space-y-4">
                        <QuickAction
                            href="/hq/clients"
                            title="Onboard Property"
                            description="Scale out to new properties."
                            icon={<Building2 className="w-5 h-5 text-white" />}
                            theme="blue"
                        />
                        <QuickAction
                            href="/hq/subscriptions"
                            title="Revenue Console"
                            description="Financial flow and tier logic."
                            icon={<DollarSign className="w-5 h-5 text-white" />}
                            theme="indigo"
                        />
                        <QuickAction
                            href="/hq/security"
                            title="Access Guardians"
                            description="Safety logs and audit tracks."
                            icon={<Shield className="w-5 h-5 text-white" />}
                            theme="zinc"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatMetric({ label, value, icon, color, bg, border }: { label: string, value: string | number, icon: React.ReactNode, color: string, bg: string, border: string }) {
    return (
        <div className={`bg-white p-8 space-y-5 rounded-4xl border ${border} hover:shadow-xl hover:shadow-zinc-200/50 transition-all group`}>
            <div className="flex items-center justify-between">
                <div className={`p-3 ${bg} ${color} rounded-2xl transition-transform group-hover:rotate-12`}>
                    {icon}
                </div>
                <ArrowUpRight className="w-4 h-4 text-zinc-200 group-hover:text-indigo-600 transition-colors" />
            </div>
            <div>
                <p className="text-4xl font-black text-zinc-950 tracking-tighter tabular-nums">{value}</p>
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-1">{label}</p>
            </div>
        </div>
    );
}

function QuickAction({ href, title, description, icon, theme }: { href: string, title: string, description: string, icon: React.ReactNode, theme: 'blue' | 'indigo' | 'zinc' }) {
    const themes = {
        blue: 'border-indigo-100 hover:border-indigo-600 hover:bg-indigo-50/10 text-indigo-600 icon-bg-indigo-600',
        indigo: 'border-violet-100 hover:border-violet-600 hover:bg-violet-50/10 text-violet-600 icon-bg-violet-600',
        zinc: 'border-zinc-100 hover:border-zinc-950 hover:bg-zinc-50/10 text-zinc-950 icon-bg-zinc-950'
    };

    const iconBgs = {
        blue: 'bg-indigo-600',
        indigo: 'bg-violet-600',
        zinc: 'bg-zinc-950'
    };

    return (
        <a href={href} className={`flex items-start gap-4 p-6 bg-white border-2 ${themes[theme].split(' ')[0]} ${themes[theme].split(' ')[1]} ${themes[theme].split(' ')[2]} rounded-4xl transition-all hover:shadow-2xl hover:shadow-zinc-200/50 group`}>
            <div className={`w-12 h-12 rounded-2xl ${iconBgs[theme]} flex items-center justify-center shrink-0 shadow-lg shadow-current/10`}>
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                    <h3 className="text-xs font-black text-zinc-950 uppercase tracking-widest leading-none">{title}</h3>
                    <ArrowRight className="w-4 h-4 text-zinc-300 -translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all" />
                </div>
                <p className="text-[11px] text-zinc-400 leading-tight font-bold tracking-tight">{description}</p>
            </div>
        </a>
    );
}
