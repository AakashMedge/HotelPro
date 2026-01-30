
'use client';

import { useState, useEffect, useCallback } from 'react';

// Types
type TableData = {
    id: string;
    status: string;
    waiter: string;
    items: number;
    lastUpdate: string;
};

interface ManagerData {
    stats: {
        active: number;
        ready: number;
        payment: number;
        kitchen: number;
        revenue: number;
        maxWait: string;
    };
    floorMonitor: TableData[];
    auditFeed: { time: string; msg: string }[];
    staff: { id: string; name: string; role: string; status: string; shift: string }[];
    topItems: { name: string; count: number }[];
}

export default function ManagerDashboard() {
    const [mounted, setMounted] = useState(false);
    const [data, setData] = useState<ManagerData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // State for interactive elements (if any) are kept simple for the main view
    // The main dashboard is primarily READ-ONLY visualization now.

    const fetchManagerData = useCallback(async () => {
        try {
            const res = await fetch('/api/manager');
            const result = await res.json();
            if (!result.success) throw new Error(result.error || 'Failed to fetch manager data');
            setData(result);
            setError(null);
        } catch (err) {
            console.error('[MANAGER] Fetch error:', err);
            setError(err instanceof Error ? err.message : 'Connection failed');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        setMounted(true);
        fetchManagerData();
        const interval = setInterval(fetchManagerData, 5000);
        return () => clearInterval(interval);
    }, [fetchManagerData]);

    if (!mounted) return null;

    if (loading && !data) {
        return (
            <div className="flex items-center justify-center h-full w-full bg-[#f8f9fa]">
                <div className="w-10 h-10 border-4 border-zinc-200 border-t-black rounded-full animate-spin" />
            </div>
        );
    }

    const stats = data?.stats || { active: 0, ready: 0, payment: 0, kitchen: 0, revenue: 0, maxWait: '0m' };
    const floorMonitor = data?.floorMonitor || [];
    const topItems = data?.topItems || [];
    const staff = data?.staff || [];
    const waitersOnline = staff.filter(s => s.role === 'WAITER').length;
    const kitchenStaff = staff.filter(s => s.role === 'KITCHEN').length;

    return (
        <div className="h-full overflow-y-auto bg-[#F5F5F7] p-6 lg:p-10 font-sans text-zinc-900">
            <div className="max-w-[1600px] mx-auto space-y-8 pb-20">

                {/* 1. HEADER & REVENUE */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Mission Control</h1>
                        <p className="text-zinc-500 font-medium mt-1">Live restaurant performance overview</p>
                    </div>
                    <div className="flex gap-4">
                        <div className="bg-white px-6 py-4 rounded-2xl shadow-sm border border-zinc-100 flex flex-col items-end min-w-[180px]">
                            <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Today's Revenue</span>
                            <span className="text-3xl font-black text-zinc-900 mt-1">₹{(stats.revenue || 0).toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                {/* 2. KEY METRICS GRID */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <MetricCard
                        label="Active Tables"
                        value={stats.active}
                        icon="Host"
                        trend="Live"
                    />
                    <MetricCard
                        label="Wait Time (Max)"
                        value={stats.maxWait}
                        icon="Clock"
                        alert={parseInt(stats.maxWait) > 20}
                    />
                    <MetricCard
                        label="Kitchen Load"
                        value={stats.kitchen}
                        sub="In Prep"
                        icon="Chef"
                    />
                    <MetricCard
                        label="Staff Online"
                        value={waitersOnline + kitchenStaff}
                        sub={`${waitersOnline} FOH / ${kitchenStaff} BOH`}
                        icon="Users"
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* 3. MAIN FLOOR MONITOR (Takes up 2 columns) */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold text-zinc-900">Floor Activity</h3>
                            <div className="flex gap-3 text-xs font-semibold">
                                <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-500"></div>Ready</span>
                                <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500"></div>Active</span>
                                <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-zinc-200"></div>Vacant</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                            {floorMonitor.map(table => (
                                <div
                                    key={table.id}
                                    className={`
                                        aspect-square rounded-2xl flex flex-col items-center justify-center relative border transition-all
                                        ${table.status === 'READY' ? 'bg-green-50 border-green-200 text-green-700 shadow-sm' :
                                            table.status === 'ACTIVE' ? 'bg-white border-blue-500/30 text-zinc-900 shadow-md ring-2 ring-blue-500/5' :
                                                table.status === 'SERVED' ? 'bg-orange-50 border-orange-200 text-orange-700' :
                                                    'bg-zinc-50 border-zinc-100 text-zinc-300'}
                                    `}
                                >
                                    <span className="text-xl font-black">{table.id}</span>
                                    {table.status !== 'VACANT' && (
                                        <span className="text-[10px] font-bold mt-1 uppercase tracking-tighter opacity-70">
                                            {table.status === 'ACTIVE' ? `${table.items} items` : table.status}
                                        </span>
                                    )}
                                    {table.status === 'ACTIVE' && (
                                        <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 4. SIDEBAR WIDGETS */}
                    <div className="space-y-6">

                        {/* TOP ITEMS */}
                        <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm">
                            <h3 className="text-lg font-bold text-zinc-900 mb-4">Trending Dishes</h3>
                            <div className="space-y-4">
                                {topItems.length > 0 ? topItems.map((item, i) => (
                                    <div key={item.name} className="flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${i === 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-zinc-100 text-zinc-500'}`}>
                                                {i + 1}
                                            </div>
                                            <span className="text-sm font-semibold text-zinc-700">{item.name}</span>
                                        </div>
                                        <span className="text-sm font-bold text-zinc-900">{item.count}</span>
                                    </div>
                                )) : (
                                    <p className="text-sm text-zinc-400 italic">No sales data yet today.</p>
                                )}
                            </div>
                        </div>

                        {/* URGENT ALERTS (Mocked for now, but design ready) */}
                        <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm">
                            <h3 className="text-lg font-bold text-zinc-900 mb-4">Urgent Actions</h3>
                            <div className="space-y-3">
                                {stats.revenue === 0 ? (
                                    <div className="p-3 bg-blue-50 rounded-xl text-xs font-semibold text-blue-700 flex gap-2">
                                        <span>ℹ️</span> Restaurant just opened. Active monitoring engaged.
                                    </div>
                                ) : parseInt(stats.maxWait) > 20 ? (
                                    <div className="p-3 bg-red-50 rounded-xl text-xs font-semibold text-red-700 flex gap-2 items-center">
                                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                        High Wait Time Detected ({stats.maxWait})
                                    </div>
                                ) : (
                                    <div className="p-3 bg-green-50 rounded-xl text-xs font-semibold text-green-700 flex gap-2 items-center">
                                        <span>✅</span> Operations Normal
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>

                </div>
            </div>
        </div>
    );
}

// Sub-component for clean metric cards
function MetricCard({ label, value, sub, icon, alert, trend }: any) {
    return (
        <div className={`bg-white p-6 rounded-3xl border shadow-sm flex flex-col justify-between h-32 ${alert ? 'border-red-200 bg-red-50/10' : 'border-zinc-100'}`}>
            <div className="flex justify-between items-start">
                <span className={`text-xs font-bold uppercase tracking-widest ${alert ? 'text-red-500' : 'text-zinc-400'}`}>{label}</span>
                {trend && <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{trend}</span>}
            </div>
            <div>
                <span className={`text-3xl font-black ${alert ? 'text-red-600' : 'text-zinc-900'}`}>{value}</span>
                {sub && <p className="text-xs font-semibold text-zinc-400 mt-1">{sub}</p>}
            </div>
        </div>
    );
}
