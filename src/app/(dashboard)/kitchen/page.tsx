'use client';

import { useState, useEffect, useCallback } from 'react';

// ============================================
// Types (matching existing UI expectations)
// ============================================

type LineItem = {
    name: string;
    qty: number;
    note?: string;
    isNew?: boolean;
};

type Ticket = {
    id: string;        // Short display ID
    fullId: string;    // Full UUID for API calls
    table: string;
    status: 'NEW' | 'PREPARING' | 'READY';
    items: LineItem[];
    createdAt: number;
    version: number;   // For optimistic locking
};

// ============================================
// API Response Types
// ============================================

interface ApiOrderItem {
    id: string;
    menuItemId: string;
    itemName: string;
    price: number;
    quantity: number;
    status: string;
}

interface ApiOrder {
    id: string;
    tableId: string;
    tableCode: string;
    status: string;
    version: number;
    items: ApiOrderItem[];
    total: number;
    createdAt: string;
}

interface ApiResponse {
    success: boolean;
    orders?: ApiOrder[];
    order?: ApiOrder;
    error?: string;
}

// ============================================
// Data Transformation
// ============================================

function apiOrderToTicket(order: ApiOrder): Ticket | null {
    // Only include NEW, PREPARING, READY (kitchen statuses)
    if (!['NEW', 'PREPARING', 'READY'].includes(order.status)) {
        return null;
    }

    // Extract table number from tableCode (e.g., "T-01" -> "01")
    const tableMatch = order.tableCode.match(/T-?(\d+)/);
    const table = tableMatch ? tableMatch[1] : order.tableCode;

    return {
        id: order.id.slice(0, 8).toUpperCase(), // Short ID for display
        fullId: order.id,                        // Full UUID for API
        table,
        status: order.status as Ticket['status'],
        items: order.items.map(item => ({
            name: item.itemName.toUpperCase(),
            qty: item.quantity,
        })),
        createdAt: new Date(order.createdAt).getTime(),
        version: order.version,
    };
}

// ============================================
// Kitchen Display System (KDS)
// ============================================

export default function KitchenKDS() {
    // State
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState(Date.now());
    const [activeTab, setActiveTab] = useState<'NEW' | 'PREPARING'>('NEW');
    const [mounted, setMounted] = useState(false);
    const [updating, setUpdating] = useState<string | null>(null);

    // ============================================
    // Fetch Orders from API
    // ============================================

    const fetchOrders = useCallback(async () => {
        try {
            // Fetch live operational statuses
            const res = await fetch('/api/orders?status=NEW,PREPARING');
            const data: ApiResponse = await res.json();

            if (!data.success || !data.orders) {
                throw new Error(data.error || 'Failed to fetch orders');
            }

            // Transform API orders to UI tickets
            const newTickets = data.orders
                .map(apiOrderToTicket)
                .filter((t): t is Ticket => t !== null);

            setTickets(newTickets);
            setError(null);
        } catch (err) {
            console.error('[KITCHEN] Fetch error:', err);
            setError(err instanceof Error ? err.message : 'Failed to load orders');
        } finally {
            setLoading(false);
        }
    }, []);

    // ============================================
    // Update Order Status
    // ============================================

    const moveStatus = async (ticketId: string, nextStatus: 'PREPARING' | 'READY') => {
        const ticket = tickets.find(t => t.id === ticketId);
        if (!ticket) return;

        setUpdating(ticketId);

        // Optimistic Update
        const previousTickets = [...tickets];
        setTickets(prev => prev.map(t =>
            t.id === ticketId ? { ...t, status: nextStatus } : t
        ));

        try {
            const res = await fetch(`/api/orders/${ticket.fullId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: nextStatus,
                    version: ticket.version,
                }),
            });

            if (!res.ok) throw new Error('Order update failed');

            await fetchOrders();

            // If we moved to READY, it should eventually vanish from the main tab
            if (nextStatus === 'PREPARING' && activeTab === 'NEW') {
                setActiveTab('PREPARING');
            }
        } catch (err) {
            console.error('[KITCHEN] Update error:', err);
            setTickets(previousTickets);
            setError('Failed to update order status');
            await fetchOrders();
        } finally {
            setUpdating(null);
        }
    };

    // ============================================
    // Effects
    // ============================================

    useEffect(() => {
        setMounted(true);
        fetchOrders();
        const pollInterval = setInterval(fetchOrders, 5000);
        const clockInterval = setInterval(() => setCurrentTime(Date.now()), 1000);
        return () => {
            clearInterval(pollInterval);
            clearInterval(clockInterval);
        };
    }, [fetchOrders]);

    if (!mounted) return null;

    if (loading && tickets.length === 0) {
        return (
            <div className="flex items-center justify-center h-full w-full bg-[#F8F9FA]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-zinc-200 border-t-[#D43425] rounded-full animate-spin" />
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Initializing_KDS...</p>
                </div>
            </div>
        );
    }

    // Filter and Sort Logic
    const filteredTickets = tickets
        .filter(t => t.status === activeTab)
        .sort((a, b) => a.createdAt - b.createdAt); // Oldest first

    return (
        <div className="flex flex-col h-full w-full bg-[#F8F9FA] overflow-hidden">

            {/* 1. HIGH FOCUS TAB NAVIGATOR */}
            <div className="flex bg-white border-b border-zinc-200 shrink-0 px-4 md:px-8">
                {[
                    { id: 'NEW', label: 'INTAKE', status: 'NEW' },
                    { id: 'PREPARING', label: 'ACTIVE_WORK', status: 'PREPARING' }
                ].map(tab => {
                    const count = tickets.filter(t => t.status === tab.id).length;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`px-6 md:px-12 py-6 flex items-center gap-3 relative transition-all group ${isActive ? 'text-black' : 'text-zinc-400 hover:text-zinc-600'}`}
                        >
                            <span className={`text-[10px] md:text-xs font-black tracking-[0.4em] uppercase ${isActive ? 'translate-y-0' : 'group-hover:-translate-y-0.5'} transition-transform`}>
                                {tab.label}
                            </span>
                            {count > 0 && (
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full tabular-nums ${isActive ? 'bg-black text-white' : 'bg-zinc-100 text-zinc-400'}`}>
                                    {count}
                                </span>
                            )}
                            {isActive && <div className="absolute bottom-0 left-0 w-full h-1 bg-[#D43425] animate-in slide-in-from-left duration-300" />}
                        </button>
                    );
                })}
            </div>

            {/* 2. TASK LIST (SMART STRIP DESIGN) */}
            <div className="grow overflow-y-auto p-4 md:p-8 space-y-3 md:space-y-4 hide-scrollbar">
                {filteredTickets.map(ticket => {
                    const diffMins = Math.floor((currentTime - ticket.createdAt) / 60000);
                    const isUpdating = updating === ticket.id;

                    // Urgency signals
                    let timerColor = 'text-zinc-300';
                    let urgencyGlow = '';
                    if (diffMins >= 15) {
                        timerColor = 'text-red-500 animate-pulse';
                        urgencyGlow = 'ring-2 ring-red-500/20';
                    } else if (diffMins >= 10) {
                        timerColor = 'text-amber-500';
                        urgencyGlow = 'ring-1 ring-amber-500/10';
                    }

                    return (
                        <div
                            key={ticket.id}
                            className={`bg-white border border-zinc-200 rounded-xl md:rounded-2xl flex flex-col md:flex-row items-center p-4 md:p-6 gap-4 md:gap-8 transition-all duration-300 ${urgencyGlow} ${isUpdating ? 'opacity-50 scale-[0.98] translate-x-4' : 'hover:border-zinc-300 shadow-sm'}`}
                        >
                            {/* Table ID - High Contrast */}
                            <div className="flex flex-col items-center md:items-start shrink-0 min-w-[100px] border-r border-zinc-100 pr-4 md:pr-8">
                                <span className="text-4xl md:text-5xl font-black tracking-tighter text-[#1D1D1F]">T_{ticket.table}</span>
                                <span className="text-[9px] font-black text-zinc-300 tracking-widest uppercase italic">#{ticket.id}</span>
                            </div>

                            {/* Timer - Clear Signal */}
                            <div className={`shrink-0 flex items-center gap-2 ${timerColor}`}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                                <span className="text-xl md:text-2xl font-black tabular-nums">{diffMins}m</span>
                            </div>

                            {/* Order Items - Simplified Strip */}
                            <div className="grow flex flex-wrap gap-2 md:gap-3 py-2">
                                {ticket.items.map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-2 bg-zinc-50 border border-zinc-100 px-3 py-1.5 rounded-lg">
                                        <span className="text-sm font-black text-black">{item.qty}x</span>
                                        <span className="text-xs font-bold text-zinc-600 uppercase tracking-tight">{item.name}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Action Button - Massive Surface */}
                            <div className="shrink-0 w-full md:w-auto">
                                {activeTab === 'NEW' && (
                                    <button
                                        onClick={() => moveStatus(ticket.id, 'PREPARING')}
                                        disabled={isUpdating}
                                        className="w-full md:w-48 py-4 bg-black text-white text-[10px] font-black uppercase tracking-[0.3em] rounded-xl hover:bg-[#D43425] transition-all active:scale-95 shadow-lg shadow-black/5"
                                    >
                                        {isUpdating ? 'SYNCING...' : 'START_PREP'}
                                    </button>
                                )}
                                {activeTab === 'PREPARING' && (
                                    <button
                                        onClick={() => moveStatus(ticket.id, 'READY')}
                                        disabled={isUpdating}
                                        className="w-full md:w-48 py-4 bg-green-600 text-white text-[10px] font-black uppercase tracking-[0.3em] rounded-xl hover:bg-green-700 transition-all active:scale-95 shadow-lg shadow-green-900/10"
                                    >
                                        {isUpdating ? 'SYNCING...' : 'MARK_COMPLETED'}
                                    </button>
                                )}
                                {activeTab === (null as any) && (
                                    <div className="px-6 py-4 rounded-xl border-2 border-dashed border-zinc-100 flex items-center justify-center">
                                        <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">STATE_IDLE</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}

                {filteredTickets.length === 0 && (
                    <div className="h-[60vh] flex flex-col items-center justify-center text-zinc-300">
                        <svg className="w-16 h-16 mb-6 opacity-20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h3 className="text-sm font-black uppercase tracking-[0.5em] opacity-40">Queue_Clear</h3>
                        <p className="text-[10px] mt-2 font-bold uppercase tracking-widest opacity-30">No active tasks in {activeTab} stage</p>
                    </div>
                )}
            </div>

            <style jsx global>{`
                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
}
