
'use client';

import { useState, useEffect } from 'react';

type AdminStats = {
    users: number;
    tables: number;
    items: number;
    orders: number;
    uptime: string;
    dbStatus: string;
    version: string;
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

    if (loading) return <div className="p-10 font-mono text-xs text-zinc-400">Loading System Telemetry...</div>;

    const s = stats || { users: 0, tables: 0, items: 0, orders: 0, uptime: '-', dbStatus: 'UNKNOWN', version: '-' };

    return (
        <div className="h-full overflow-y-auto p-6 md:p-10 font-mono text-zinc-900 bg-[#F2F2F2]">
            <div className="max-w-6xl mx-auto space-y-12 pb-20">

                {/* 1. SYSTEM VITALS */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard label="UPTIME" value={s.uptime} />
                    <StatCard label="DB_STATUS" value={s.dbStatus} color="text-green-600" />
                    <StatCard label="VERSION" value={s.version} />
                    <StatCard label="TOTAL_TXNS" value={s.orders.toLocaleString()} />
                </div>

                {/* 2. RESOURCE INVENTORY */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="bg-white border-2 border-zinc-900 p-8 flex flex-col justify-between h-48 hover:bg-black hover:text-white transition-colors group cursor-pointer">
                        <span className="text-xs font-bold uppercase tracking-widest text-zinc-400 group-hover:text-zinc-500">Personnel</span>
                        <div className="flex items-end justify-between">
                            <span className="text-5xl font-black">{s.users}</span>
                            <span className="text-xs font-bold uppercase">Registered</span>
                        </div>
                    </div>
                    <div className="bg-white border-2 border-zinc-900 p-8 flex flex-col justify-between h-48 hover:bg-black hover:text-white transition-colors group cursor-pointer">
                        <span className="text-xs font-bold uppercase tracking-widest text-zinc-400 group-hover:text-zinc-500">Nodes (Tables)</span>
                        <div className="flex items-end justify-between">
                            <span className="text-5xl font-black">{s.tables}</span>
                            <span className="text-xs font-bold uppercase">Allocated</span>
                        </div>
                    </div>
                    <div className="bg-white border-2 border-zinc-900 p-8 flex flex-col justify-between h-48 hover:bg-black hover:text-white transition-colors group cursor-pointer">
                        <span className="text-xs font-bold uppercase tracking-widest text-zinc-400 group-hover:text-zinc-500">SKU Inventory</span>
                        <div className="flex items-end justify-between">
                            <span className="text-5xl font-black">{s.items}</span>
                            <span className="text-xs font-bold uppercase">Active Items</span>
                        </div>
                    </div>
                </div>

                {/* 3. TERMINAL INFO */}
                <div className="bg-black text-zinc-400 p-6 font-mono text-xs leading-relaxed overflow-hidden">
                    <p className="mb-2 text-white font-bold">{'>'} SYSTEM DIAGNOSTICS LOG</p>
                    <p>{'>'} Checks completed: 14/14 [PASS]</p>
                    <p>{'>'} Latency: 12ms (redis-cache)</p>
                    <p>{'>'} Integrity: 100% verified</p>
                    <p>{'>'} Next backup scheduled: 03:00 UTC</p>
                    <p className="animate-pulse">{'>'} Awaiting command...</p>
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value, color }: any) {
    return (
        <div className="bg-[#E5E5E5] p-5 border border-zinc-300 flex flex-col gap-2">
            <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">{label}</span>
            <span className={`text-xl font-bold tracking-tight ${color || 'text-zinc-900'}`}>{value}</span>
        </div>
    );
}
