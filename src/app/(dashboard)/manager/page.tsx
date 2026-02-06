
'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

// Types
type TableData = {
    id: string;
    realId: string;
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
        lowStockCount: number;
    };
    floorMonitor: TableData[];
    auditFeed: { time: string; msg: string }[];
    staff: { id: string; name: string; role: string; status: string; shift: string }[];
    topItems: { name: string; count: number }[];
}

export default function ManagerDashboard() {
    const [data, setData] = useState<ManagerData | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchManagerData = useCallback(async () => {
        try {
            const res = await fetch('/api/manager');
            const result = await res.json();
            if (result.success) setData(result);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => {
        fetchManagerData();
        const interval = setInterval(fetchManagerData, 5000);
        return () => clearInterval(interval);
    }, [fetchManagerData]);

    if (loading && !data) return <div className="h-full flex items-center justify-center font-black uppercase text-zinc-300">Syncing HQ...</div>;

    const stats = data?.stats || { active: 0, ready: 0, payment: 0, kitchen: 0, revenue: 0, maxWait: '0m', lowStockCount: 0 };
    const topItems = data?.topItems || [];
    const auditFeed = data?.auditFeed || [];

    return (
        <div className="h-full overflow-y-auto bg-[#FDFCF9] p-6 lg:p-10 font-sans">
            <div className="max-w-7xl mx-auto space-y-10 pb-32">

                {/* 1. OPERATIONS HEADER */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-10">
                    <div>
                        <h1 className="text-5xl font-black text-zinc-900 tracking-tighter uppercase mb-2">Director Dashboard</h1>
                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-[0.4em] italic">Operational Ledger & Intelligence Unit</p>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] font-black text-[#D43425] uppercase tracking-widest mb-1">Today's Accumulated Yield</span>
                        <div className="text-5xl font-black text-zinc-900 tabular-nums">₹{(stats.revenue).toLocaleString()}</div>
                    </div>
                </div>

                {/* 2. CORE INTELLIGENCE GRID */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
                    <MetricCard label="Active Sessions" value={stats.active} trend="Live" color="bg-zinc-900" />
                    <MetricCard label="Fulfillment Velocity" value={stats.maxWait} sub="Oldest Order" alert={parseInt(stats.maxWait) > 15} />
                    <MetricCard label="Production Load" value={stats.kitchen} sub="Items in Prep" color="bg-[#D43425]" />
                    <MetricCard label="Pending Settlements" value={stats.payment} sub="Bill Requested" color="bg-indigo-600" />
                    <MetricCard label="Inventory Health" value={stats.lowStockCount || 0} sub="Items Low Stock" color="bg-amber-500" alert={(stats.lowStockCount || 0) > 0} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

                    {/* 3. TRENDING DISHES (Analytics) */}
                    <div className="lg:col-span-2 bg-white rounded-[3rem] p-10 shadow-xl shadow-zinc-200/50 border border-zinc-100">
                        <h3 className="text-2xl font-black text-zinc-900 uppercase tracking-tighter mb-8">Performance Metrics: Bestsellers</h3>
                        <div className="space-y-6">
                            {topItems.map((item, i) => {
                                const maxCount = topItems[0].count;
                                const width = (item.count / maxCount) * 100;
                                return (
                                    <div key={item.name} className="space-y-2">
                                        <div className="flex justify-between items-end">
                                            <span className="text-sm font-black text-zinc-800 uppercase tracking-tight">{item.name}</span>
                                            <span className="text-xs font-bold text-zinc-400">{item.count} Sold</span>
                                        </div>
                                        <div className="h-3 bg-zinc-50 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${width}%` }}
                                                className={`h-full ${i === 0 ? 'bg-[#D43425]' : 'bg-zinc-900'}`}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                            {topItems.length === 0 && <p className="text-zinc-300 italic text-center py-20">No intelligence recorded for today.</p>}
                        </div>
                    </div>

                    {/* 4. REAL-TIME AUDIT LOG */}
                    <div className="bg-[#111111] rounded-[3rem] p-10 text-white shadow-2xl">
                        <h3 className="text-lg font-black uppercase tracking-widest text-[#D43425] mb-8">System Audit_Feed</h3>
                        <div className="space-y-6">
                            {auditFeed.map((log, i) => (
                                <div key={i} className="flex gap-4 border-l-2 border-zinc-800 pl-4 py-1">
                                    <span className="text-[9px] font-bold text-zinc-500 tabular-nums">{log.time}</span>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-200">{log.msg}</p>
                                </div>
                            ))}
                            {auditFeed.length === 0 && <p className="text-zinc-600 text-[10px]">Log currently vacant.</p>}
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
}

function MetricCard({ label, value, sub, alert, trend, color }: any) {
    return (
        <div className={`p-8 rounded-[2.5rem] border transition-all h-40 flex flex-col justify-between ${alert ? 'bg-red-50 border-red-200' : 'bg-white border-zinc-100 shadow-sm'}`}>
            <div className="flex justify-between items-start">
                <span className={`text-[9px] font-black uppercase tracking-widest ${alert ? 'text-red-500' : 'text-zinc-400'}`}>{label}</span>
                {trend && <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />}
            </div>
            <div>
                <div className={`text-4xl font-black leading-none tracking-tighter ${alert ? 'text-red-600' : (color === 'bg-zinc-900' ? 'text-zinc-900' : 'text-zinc-900')}`}>{value}</div>
                {sub && <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest mt-2">{sub}</p>}
            </div>
        </div>
    );
}
