'use client';

import { useState, useEffect, useCallback } from 'react';

// ============================================
// Types
// ============================================

type LineItem = {
    name: string;
    qty: number;
};

type HistoryTicket = {
    id: string;
    table: string;
    items: LineItem[];
    completedAt: number;
    prepTimeMins: number; // For the micro-insights
    status: 'READY' | 'SERVED';
};

// ============================================
// History Dashboard
// ============================================

export default function KitchenHistory() {
    const [tickets, setTickets] = useState<HistoryTicket[]>([]);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);

    // Filtering and Pagination State
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'READY' | 'SERVED'>('ALL');
    const [visibleLimit, setVisibleLimit] = useState(15);

    const fetchHistory = useCallback(async () => {
        try {
            const res = await fetch('/api/orders?status=READY,SERVED');
            const data = await res.json();

            if (!data.success || !data.orders) throw new Error('Failed to fetch history');

            const historyTickets: HistoryTicket[] = data.orders.map((o: any) => {
                const start = new Date(o.createdAt).getTime();
                const end = new Date(o.updatedAt).getTime();
                const prepTime = Math.round((end - start) / 60000);

                return {
                    id: o.id.slice(0, 8).toUpperCase(),
                    table: o.tableCode.replace('T-', ''),
                    completedAt: end,
                    prepTimeMins: prepTime,
                    status: o.status,
                    items: o.items.map((i: any) => ({
                        name: i.itemName.toUpperCase(),
                        qty: i.quantity
                    }))
                };
            }).sort((a: any, b: any) => b.completedAt - a.completedAt);

            setTickets(historyTickets);
        } catch (err) {
            console.error('[KITCHEN_HISTORY] Err:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        setMounted(true);
        fetchHistory();
    }, [fetchHistory]);

    if (!mounted) return null;

    // Filter Logic
    const filteredTickets = tickets.filter(t => {
        const matchesSearch = t.table.includes(searchQuery) || t.id.includes(searchQuery.toUpperCase());
        const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const displayTickets = filteredTickets.slice(0, visibleLimit);
    const hasMore = visibleLimit < filteredTickets.length;

    // Performance Calculations
    const avgPrep = tickets.length > 0
        ? Math.round(tickets.reduce((acc, t) => acc + t.prepTimeMins, 0) / tickets.length)
        : 0;
    const efficiency = tickets.length > 0
        ? Math.round((tickets.filter(t => t.prepTimeMins <= 15).length / tickets.length) * 100)
        : 100;

    return (
        <div className="flex flex-col h-full w-full bg-[#F8F9FB] overflow-hidden">

            {/* 1. PREMIUM HEADER & STATS */}
            <div className="bg-white border-b border-zinc-200 p-6 md:p-8 lg:px-12 shrink-0 shadow-sm relative z-20">
                <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-[#D43425] uppercase tracking-[0.5em] italic">Archive_Ledger</span>
                            <div className="w-1.5 h-1.5 rounded-full bg-zinc-200" />
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Station_01</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-zinc-900 leading-none">SERVICE_HISTORY</h1>
                    </div>

                    {/* Performance Suite */}
                    <div className="flex flex-wrap gap-4 md:gap-8">
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-1">Avg_Prep_Time</span>
                            <div className="flex items-baseline gap-1">
                                <span className={`text-2xl font-black tabular-nums ${avgPrep > 12 ? 'text-amber-500' : 'text-zinc-900'}`}>{avgPrep}</span>
                                <span className="text-[10px] font-bold text-zinc-300 uppercase">min</span>
                            </div>
                        </div>
                        <div className="w-px h-10 bg-zinc-100 hidden md:block" />
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-1">Efficiency_Index</span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-black tabular-nums text-green-600">{efficiency}%</span>
                                <span className="text-[10px] font-bold text-zinc-300 uppercase">SLA</span>
                            </div>
                        </div>
                        <div className="w-px h-10 bg-zinc-100 hidden md:block" />
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-1">Session_Cleared</span>
                            <span className="text-2xl font-black tabular-nums text-zinc-900">{tickets.length}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. FILTER & SEARCH BAR */}
            <div className="bg-white border-b border-zinc-100 px-6 py-4 md:px-12 flex flex-col md:flex-row items-center gap-4 sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-4 grow w-full md:w-auto">
                    <div className="relative grow max-w-md">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                        <input
                            type="text"
                            placeholder="SEARCH_TABLE_OR_ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2.5 pl-10 pr-4 text-xs font-bold uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
                        />
                    </div>
                    <div className="flex items-center border border-zinc-100 rounded-xl p-1 bg-zinc-50">
                        {(['ALL', 'READY', 'SERVED'] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setStatusFilter(f)}
                                className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${statusFilter === f ? 'bg-black text-white shadow-lg' : 'text-zinc-400 hover:text-zinc-600'}`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="hidden lg:flex items-center gap-2 text-zinc-300">
                    <span className="text-[10px] font-black uppercase tracking-widest">Showing:</span>
                    <span className="text-[10px] font-black text-black tabular-nums">{displayTickets.length} / {filteredTickets.length}</span>
                </div>
            </div>

            {/* 3. HISTORY FEED - COMPACT & PREMIUM */}
            <div className="grow overflow-y-auto p-4 md:p-8 lg:p-12 hide-scrollbar">
                <div className="max-w-[1400px] mx-auto space-y-3">
                    {displayTickets.map(ticket => (
                        <div
                            key={ticket.id}
                            className="bg-white border border-zinc-200 rounded-2xl p-4 md:p-6 flex flex-col md:flex-row items-center gap-4 md:gap-8 transition-all hover:border-zinc-400 hover:shadow-xl hover:shadow-zinc-200/40 group relative overflow-hidden active:scale-[0.99]"
                        >
                            {/* Decorative ID Strip */}
                            <div className="absolute top-0 left-0 h-full w-1 bg-zinc-100 group-hover:bg-[#D43425] transition-colors" />

                            {/* Table ID */}
                            <div className="shrink-0 flex items-center gap-4 min-w-[140px]">
                                <span className="text-3xl md:text-5xl font-black tracking-tighter text-zinc-950">T_{ticket.table}</span>
                                <div className="flex flex-col leading-none">
                                    <span className="text-[8px] font-black text-zinc-300 tracking-widest uppercase">#{ticket.id}</span>
                                    <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-sm mt-1 uppercase tracking-widest border ${ticket.status === 'SERVED' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                                        {ticket.status}
                                    </span>
                                </div>
                            </div>

                            {/* Order Content */}
                            <div className="grow flex flex-wrap gap-2 py-1">
                                {ticket.items.map((item, idx) => (
                                    <div key={idx} className="bg-zinc-50 border border-transparent px-3 py-1 rounded-lg flex items-center gap-2 group-hover:border-zinc-200 transition-colors">
                                        <span className="text-xs font-black text-zinc-950">{item.qty}x</span>
                                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tight">{item.name}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Performance Data */}
                            <div className="shrink-0 flex items-center gap-8 md:pl-8 md:border-l md:border-zinc-100">
                                <div className="text-center md:text-right">
                                    <span className="text-[8px] font-black text-zinc-300 uppercase tracking-widest block mb-0.5">Prep_Duration</span>
                                    <span className={`text-lg md:text-xl font-black tabular-nums ${ticket.prepTimeMins > 15 ? 'text-red-500' : 'text-zinc-950'}`}>
                                        {ticket.prepTimeMins}m
                                    </span>
                                </div>
                                <div className="text-center md:text-right min-w-[80px]">
                                    <span className="text-[8px] font-black text-zinc-300 uppercase tracking-widest block mb-0.5">Finalized_At</span>
                                    <span className="text-sm md:text-base font-black text-zinc-900 tabular-nums uppercase">
                                        {new Date(ticket.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Pagination Trigger */}
                    {hasMore && (
                        <div className="pt-8 pb-12 flex justify-center">
                            <button
                                onClick={() => setVisibleLimit(prev => prev + 20)}
                                className="group flex flex-col items-center gap-3 active:scale-95 transition-all"
                            >
                                <div className="w-12 h-12 rounded-full border border-zinc-200 flex items-center justify-center group-hover:bg-black group-hover:text-white group-hover:border-black transition-all">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m6 9 6 6 6-6" /></svg>
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400 group-hover:text-black transition-colors">Roll_More_Archived_Data</span>
                            </button>
                        </div>
                    )}

                    {displayTickets.length === 0 && !loading && (
                        <div className="h-[40vh] flex flex-col items-center justify-center text-zinc-300 space-y-4">
                            <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center border border-zinc-100 italic font-black text-lg">?</div>
                            <div className="text-center space-y-1">
                                <h3 className="text-sm font-black uppercase tracking-[0.4em] opacity-40">No_Matches_Found</h3>
                                <p className="text-[9px] font-bold uppercase tracking-widest opacity-30">Adjust filters to broaden search</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style jsx global>{`
                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
}
