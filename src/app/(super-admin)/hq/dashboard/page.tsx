'use client';

import React, { useEffect, useState } from 'react';
import {
    Building2, ShoppingCart, DollarSign, Users,
    TrendingUp, Shield, AlertTriangle, Loader2
} from 'lucide-react';

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
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <p className="text-slate-400">{error}</p>
                </div>
            </div>
        );
    }

    const statCards = [
        {
            label: 'Total Hotels',
            value: stats?.totalClients || 0,
            icon: Building2,
            color: 'from-blue-500 to-indigo-600',
            bgColor: 'bg-blue-500/10'
        },
        {
            label: 'Total Orders',
            value: stats?.totalOrders || 0,
            icon: ShoppingCart,
            color: 'from-emerald-500 to-teal-600',
            bgColor: 'bg-emerald-500/10'
        },
        {
            label: 'Platform Revenue',
            value: `₹${(stats?.totalRevenue || 0).toLocaleString('en-IN')}`,
            icon: DollarSign,
            color: 'from-amber-500 to-orange-600',
            bgColor: 'bg-amber-500/10'
        },
        {
            label: 'Active Users',
            value: stats?.activeUsers || 0,
            icon: Users,
            color: 'from-purple-500 to-pink-600',
            bgColor: 'bg-purple-500/10'
        },
    ];

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">Platform Overview</h1>
                <p className="text-slate-400 mt-1">Real-time insights across all your hotels</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((card) => (
                    <div
                        key={card.label}
                        className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-colors group"
                    >
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-slate-400 text-sm font-medium">{card.label}</p>
                                <p className="text-3xl font-bold text-white mt-2">{card.value}</p>
                            </div>
                            <div className={`p-3 rounded-xl ${card.bgColor}`}>
                                <card.icon className={`w-6 h-6 bg-gradient-to-br ${card.color} bg-clip-text text-transparent`} style={{ color: 'inherit' }} />
                            </div>
                        </div>
                        <div className="mt-4 flex items-center gap-2 text-xs text-emerald-400">
                            <TrendingUp className="w-3 h-3" />
                            <span>Live data</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Plans Distribution */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-blue-500" />
                    Subscription Plans
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {stats?.plansDistribution.map((plan) => (
                        <div
                            key={plan.plan}
                            className="bg-slate-950 rounded-xl p-4 text-center border border-slate-800"
                        >
                            <p className="text-2xl font-bold text-white">{plan.count}</p>
                            <p className="text-xs text-slate-400 uppercase tracking-wider mt-1">{plan.plan}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <a
                    href="/hq/clients"
                    className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white hover:shadow-lg hover:shadow-blue-500/20 transition-all group"
                >
                    <Building2 className="w-8 h-8 mb-3 group-hover:scale-110 transition-transform" />
                    <h3 className="font-bold">Manage Hotels</h3>
                    <p className="text-blue-200 text-sm mt-1">View and onboard clients</p>
                </a>
                <a
                    href="/hq/security"
                    className="bg-gradient-to-br from-red-600 to-rose-700 rounded-2xl p-6 text-white hover:shadow-lg hover:shadow-red-500/20 transition-all group"
                >
                    <Shield className="w-8 h-8 mb-3 group-hover:scale-110 transition-transform" />
                    <h3 className="font-bold">Security Logs</h3>
                    <p className="text-red-200 text-sm mt-1">Monitor access events</p>
                </a>
                <a
                    href="/hq/subscriptions"
                    className="bg-gradient-to-br from-amber-600 to-orange-700 rounded-2xl p-6 text-white hover:shadow-lg hover:shadow-amber-500/20 transition-all group"
                >
                    <DollarSign className="w-8 h-8 mb-3 group-hover:scale-110 transition-transform" />
                    <h3 className="font-bold">Subscriptions</h3>
                    <p className="text-amber-200 text-sm mt-1">Manage billing & plans</p>
                </a>
            </div>
        </div>
    );
}
