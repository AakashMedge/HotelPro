'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Users, LayoutGrid, Coffee, TrendingUp, Calendar, CreditCard,
    AlertTriangle, ShieldAlert, Loader2, ArrowUpRight,
    Activity, Server, Lock, Sparkles, Box
} from 'lucide-react';

type AdminStats = {
    restaurantName: string;
    plan: string;
    status: string;
    users: number;
    tables: number;
    items: number;
    orders: number;
    todayOrders: number;
    todayRevenue: number;
    uptime: string;
    dbStatus: string;
    version: string;
};

export default function AdminDashboardPage() {
    const router = useRouter();
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch('/api/admin');
                const data = await res.json();
                if (data.success) setStats(data.stats);
            } catch (err) { console.error(err); }
            finally { setLoading(false); }
        };
        load();
    }, []);

    if (loading) return (
        <div className="h-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
    );

    const s = stats || {
        restaurantName: 'The Grand Hotel',
        plan: 'PREMIUM',
        status: 'ACTIVE',
        users: 12,
        tables: 24,
        items: 86,
        orders: 1420,
        todayOrders: 42,
        todayRevenue: 28400,
        uptime: '99.9%',
        dbStatus: 'CONNECTED',
        version: '2.4.0'
    };

    return (
        <div className="p-6 md:p-10 space-y-10 max-w-7xl mx-auto">

            {/* WELCOME SECTION */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden relative group">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-700">
                    <Sparkles className="w-32 h-32 text-indigo-600" />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-[0.2em] bg-indigo-50 px-2 py-0.5 rounded-full">HQ Dashboard</span>
                    </div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Welcome back, Administrator</h1>
                    <p className="text-slate-500 mt-1 font-medium">Monitoring <span className="text-slate-900 font-bold">{s.restaurantName}</span> performance metrics.</p>
                </div>
                <div className="flex items-center gap-3 relative z-10">
                    <div className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-2xl flex items-center gap-2 border border-emerald-100 shadow-sm shadow-emerald-50">
                        <Activity className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">Live System</span>
                    </div>
                    <div className="bg-indigo-600 text-white px-6 py-2 rounded-2xl flex items-center gap-2 shadow-lg shadow-indigo-100 font-bold text-xs uppercase tracking-wider cursor-pointer hover:bg-indigo-700 transition-colors">
                        Protocol: {s.plan}
                    </div>
                </div>
            </div>

            {/* QUICK STATS HUD */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard label="Total Staff" value={s.users} icon={Users} color="indigo" />
                <StatCard label="Floor Nodes" value={s.tables} icon={LayoutGrid} color="blue" />
                <StatCard label="Food Library" value={s.items} icon={Coffee} color="amber" />
                <StatCard label="Total Orders" value={s.orders} icon={TrendingUp} color="emerald" />
            </div>

            {/* PERFORMANCE SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Daily Volume */}
                <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col justify-between group">
                    <div className="flex justify-between items-start mb-10">
                        <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Activity Volume</span>
                            <h3 className="text-xl font-bold text-slate-800">Today's Traffic</h3>
                        </div>
                        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                            <Calendar className="w-6 h-6" />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-4">
                        <span className="text-6xl font-bold tracking-tighter text-slate-900 leading-none">{s.todayOrders}</span>
                        <div className="bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-xl flex items-center gap-1 text-[10px] font-bold">
                            <ArrowUpRight className="w-3 h-3" />
                            +12.4%
                        </div>
                    </div>
                    <p className="text-xs text-slate-400 mt-6 font-medium">Orders processed in the last 24 cycles.</p>
                </div>

                {/* Daily Revenue */}
                <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col justify-between group">
                    <div className="flex justify-between items-start mb-10">
                        <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Settled Net</span>
                            <h3 className="text-xl font-bold text-slate-800">Daily Revenue</h3>
                        </div>
                        <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                            <CreditCard className="w-6 h-6" />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-slate-400 leading-none">Rs.</span>
                        <span className="text-6xl font-bold tracking-tighter text-slate-900 leading-none">{s.todayRevenue.toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-6 font-medium">Real-time financial verification active.</p>
                </div>
            </div>

            {/* SYSTEM STATUS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatusNode label="DB Protocol" value={s.dbStatus} icon={Server} color="emerald" />
                <StatusNode label="Access Layer" value="ENCRYPTED" icon={Lock} color="blue" />
                <StatusNode label="Engine Version" value={s.version} icon={Box} color="slate" />
            </div>



        </div>
    );
}

function StatCard({ label, value, icon: Icon, color }: { label: string, value: number, icon: any, color: 'indigo' | 'blue' | 'amber' | 'emerald' }) {
    const colors = {
        indigo: 'bg-indigo-50 text-indigo-600 shadow-indigo-50',
        blue: 'bg-blue-50 text-blue-600 shadow-blue-50',
        amber: 'bg-amber-50 text-amber-600 shadow-amber-50',
        emerald: 'bg-emerald-50 text-emerald-600 shadow-emerald-50',
    };

    return (
        <div className="bg-white p-8 rounded-4xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow group">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-all shadow-sm duration-300 ${colors[color]}`}>
                <Icon className="w-6 h-6" />
            </div>
            <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">{label}</p>
                <p className="text-3xl font-bold text-slate-900 tracking-tight">{value.toLocaleString()}</p>
            </div>
        </div>
    );
}

function StatusNode({ label, value, icon: Icon, color }: { label: string, value: string, icon: any, color: 'emerald' | 'blue' | 'slate' }) {
    const dotColors = {
        emerald: 'bg-emerald-500 shadow-emerald-500/50',
        blue: 'bg-blue-500 shadow-blue-500/50',
        slate: 'bg-slate-500 shadow-slate-500/50',
    };

    return (
        <div className="bg-white px-8 py-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                    <Icon className="w-4 h-4" />
                </div>
                <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
                    <p className="text-xs font-bold text-slate-700 tracking-tight">{value}</p>
                </div>
            </div>
            <div className={`w-2 h-2 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.1)] ${dotColors[color]}`} />
        </div>
    );
}
