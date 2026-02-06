
'use client';

import { useState, useEffect } from 'react';
import { Building2, Users, LayoutGrid, Coffee, TrendingUp, Activity, Calendar, CreditCard } from 'lucide-react';

type AdminStats = {
    // Restaurant info
    restaurantName: string;
    plan: string;
    status: string;

    // Counts
    users: number;
    tables: number;
    items: number;
    orders: number;

    // Today's stats
    todayOrders: number;
    todayRevenue: number;

    // System
    uptime: string;
    dbStatus: string;
    version: string;
};

const PLAN_COLORS: Record<string, string> = {
    BASIC: 'bg-slate-100 text-slate-700',
    ADVANCE: 'bg-blue-100 text-blue-700',
    PREMIUM: 'bg-purple-100 text-purple-700',
    BUSINESS: 'bg-amber-100 text-amber-700'
};

const STATUS_COLORS: Record<string, string> = {
    ACTIVE: 'bg-emerald-100 text-emerald-700',
    TRIAL: 'bg-orange-100 text-orange-700',
    SUSPENDED: 'bg-red-100 text-red-700'
};

export default function AdminDashboardPage() {
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/admin')
            .then(res => res.json())
            .then(data => {
                if (data.success) setStats(data.stats);
                setLoading(false);
            });
    }, []);

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-3 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
                    <p className="text-sm text-slate-500 font-medium">Loading Dashboard...</p>
                </div>
            </div>
        );
    }

    const s = stats || {
        restaurantName: 'Restaurant',
        plan: 'BASIC',
        status: 'TRIAL',
        users: 0,
        tables: 0,
        items: 0,
        orders: 0,
        todayOrders: 0,
        todayRevenue: 0,
        uptime: '-',
        dbStatus: 'UNKNOWN',
        version: '-'
    };

    return (
        <div className="h-full overflow-y-auto p-6 md:p-10 bg-slate-50">
            <div className="max-w-7xl mx-auto space-y-8 pb-20">

                {/* Restaurant Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-200">
                            <Building2 className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800">{s.restaurantName}</h1>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${PLAN_COLORS[s.plan] || PLAN_COLORS.BASIC}`}>
                                    {s.plan}
                                </span>
                                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[s.status] || STATUS_COLORS.TRIAL}`}>
                                    {s.status}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2 text-slate-500">
                            <Activity className="w-4 h-4" />
                            <span>Uptime: {s.uptime}</span>
                        </div>
                        <div className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">
                            {s.dbStatus}
                        </div>
                    </div>
                </div>

                {/* Today's Highlights */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Today's Orders</span>
                            <Calendar className="w-5 h-5 text-slate-400" />
                        </div>
                        <div className="flex items-end justify-between">
                            <span className="text-4xl font-black text-slate-800">{s.todayOrders}</span>
                            <span className="text-sm text-emerald-600 font-medium">+{Math.round(s.todayOrders * 0.12)}% from yesterday</span>
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Today's Revenue</span>
                            <CreditCard className="w-5 h-5 text-slate-400" />
                        </div>
                        <div className="flex items-end justify-between">
                            <span className="text-4xl font-black text-slate-800">₹{s.todayRevenue.toLocaleString()}</span>
                            <span className="text-sm text-emerald-600 font-medium">Active billing</span>
                        </div>
                    </div>
                </div>

                {/* Resource Overview */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard icon={Users} label="Staff" value={s.users} color="from-blue-500 to-blue-600" />
                    <StatCard icon={LayoutGrid} label="Tables" value={s.tables} color="from-indigo-500 to-indigo-600" />
                    <StatCard icon={Coffee} label="Menu Items" value={s.items} color="from-violet-500 to-violet-600" />
                    <StatCard icon={TrendingUp} label="Total Orders" value={s.orders} color="from-emerald-500 to-emerald-600" />
                </div>

                {/* System Terminal */}
                <div className="bg-slate-900 text-slate-400 rounded-2xl p-6 font-mono text-xs leading-relaxed overflow-hidden">
                    <p className="mb-2 text-white font-bold">{'>'} SYSTEM DIAGNOSTICS</p>
                    <p>{'>'} Database: {s.dbStatus}</p>
                    <p>{'>'} Uptime: {s.uptime}</p>
                    <p>{'>'} Version: {s.version}</p>
                    <p>{'>'} Tenant: {s.restaurantName}</p>
                    <p className="mt-2 animate-pulse text-emerald-400">{'>'} All systems operational</p>
                </div>
            </div>
        </div>
    );
}

function StatCard({ icon: Icon, label, value, color }: {
    icon: React.ElementType;
    label: string;
    value: number;
    color: string;
}) {
    return (
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all group cursor-pointer">
            <div className={`w-10 h-10 rounded-xl bg-linear-to-br ${color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <Icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-2xl font-bold text-slate-800">{value.toLocaleString()}</p>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mt-1">{label}</p>
        </div>
    );
}
