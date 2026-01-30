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
    const [activeTab, setActiveTab] = useState<'NEW' | 'PREPARING' | 'READY'>('NEW');
    const [mounted, setMounted] = useState(false);
    const [updating, setUpdating] = useState<string | null>(null); // Track which ticket is updating

    // ============================================
    // Fetch Orders from API
    // ============================================

    const fetchOrders = useCallback(async () => {
        try {
            const res = await fetch('/api/orders?status=NEW,PREPARING,READY');
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
        // Find the ticket to get fullId and version
        const ticket = tickets.find(t => t.id === ticketId);
        if (!ticket) return;

        setUpdating(ticketId);

        try {
            // Call PATCH to update status using fullId
            const res = await fetch(`/api/orders/${ticket.fullId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: nextStatus,
                    version: ticket.version,
                }),
            });

            const data: ApiResponse = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to update order');
            }

            // Refetch to get updated list
            await fetchOrders();

            // Auto-switch tab when moving from NEW to PREPARING
            if (activeTab === 'NEW' && nextStatus === 'PREPARING') {
                setActiveTab('PREPARING');
            }
        } catch (err) {
            console.error('[KITCHEN] Update error:', err);
            setError(err instanceof Error ? err.message : 'Failed to update order');
            // Refetch to ensure UI is in sync
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

        // Poll for updates every 5 seconds (temporary until realtime)
        const pollInterval = setInterval(fetchOrders, 5000);

        // Update clock every second
        const clockInterval = setInterval(() => setCurrentTime(Date.now()), 1000);

        return () => {
            clearInterval(pollInterval);
            clearInterval(clockInterval);
        };
    }, [fetchOrders]);

    // ============================================
    // Helper Functions
    // ============================================

    const getElapsedTime = (createdTime: number) => {
        if (!mounted) return { text: '00:00', isCritical: false };
        const diff = Math.floor((currentTime - createdTime) / 1000);
        const mins = Math.floor(diff / 60);
        const secs = Math.abs(diff % 60);
        return {
            text: `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`,
            isCritical: mins >= 15
        };
    };

    // ============================================
    // Column Component
    // ============================================

    const Column = ({ title, status, mobileHidden = false, tabletHidden = false }: {
        title: string,
        status: Ticket['status'],
        mobileHidden?: boolean,
        tabletHidden?: boolean
    }) => {
        const columnTickets = tickets.filter(t => t.status === status);

        return (
            <div className={`flex flex-col h-full border-r border-[#E5E5E5] last:border-0 overflow-hidden ${mobileHidden ? 'hidden' : 'flex'} ${tabletHidden ? 'md:hidden lg:flex' : 'md:flex'}`}>
                {/* Column Header */}
                <div className="hidden md:flex h-12 bg-white border-b border-zinc-200 items-center justify-between px-4 lg:px-6 shrink-0">
                    <h2 className="text-[9px] lg:text-[10px] font-black tracking-[0.3em] text-zinc-400 uppercase">{title}</h2>
                    <div className="px-1.5 lg:px-2 py-0.5 rounded bg-zinc-100 text-zinc-900 text-[8px] lg:text-[9px] font-black tabular-nums border border-zinc-200">
                        {columnTickets.length}
                    </div>
                </div>

                {/* Ticket Area */}
                <div className="grow overflow-y-auto p-4 lg:p-6 space-y-6 lg:space-y-8 bg-[#F8F9FA] hide-scrollbar pb-24 md:pb-8">
                    {/* Empty State */}
                    {columnTickets.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-zinc-400">
                            <svg className="w-12 h-12 mb-4 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            <p className="text-xs font-bold uppercase tracking-widest">No {status} orders</p>
                        </div>
                    )}

                    {/* Tickets */}
                    {columnTickets.map(ticket => {
                        const timer = getElapsedTime(ticket.createdAt);
                        const isUpdating = updating === ticket.id;

                        return (
                            <div key={ticket.id} className="relative group">
                                <div className={`bg-white rounded-xl lg:rounded-2xl border border-zinc-200 shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col min-h-[300px] lg:min-h-[400px] ${isUpdating ? 'opacity-50' : ''}`}>
                                    <div className={`h-1 w-full ${status === 'NEW' ? 'bg-blue-500' : status === 'PREPARING' ? 'bg-amber-500' : 'bg-green-500'}`} />

                                    <div className="p-4 lg:p-8 border-b-[0.5px] border-zinc-100 flex justify-between items-start">
                                        <div className="flex flex-col">
                                            <span className="text-4xl lg:text-6xl font-black tracking-tighter text-[#1D1D1F] leading-none">
                                                T_{ticket.table}
                                            </span>
                                            <span className="text-[8px] lg:text-[10px] font-black text-zinc-300 uppercase tracking-widest mt-1 lg:mt-2 italic leading-none">REF: {ticket.id}</span>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <div className={`px-2 lg:px-4 py-1 lg:py-2 rounded-lg lg:rounded-xl border flex items-center gap-1.5 lg:gap-2 ${timer.isCritical ? 'bg-red-50 border-red-100 text-[#D43425]' : 'bg-zinc-50 border-zinc-100 text-zinc-400'}`}>
                                                <span className="text-sm lg:text-2xl font-black tabular-nums leading-none tracking-tight">{timer.text}</span>
                                                <div className={`w-1 h-1 lg:w-1.5 lg:h-1.5 rounded-full ${timer.isCritical ? 'bg-red-500 animate-pulse' : 'bg-zinc-300'}`} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grow p-4 lg:p-8 space-y-4 lg:space-y-6">
                                        {ticket.items.map((item, idx) => (
                                            <div key={idx} className="flex gap-4 lg:gap-6 items-start">
                                                <div className="w-10 h-10 lg:w-12 lg:h-12 bg-[#1D1D1F] text-white flex items-center justify-center font-black text-lg lg:text-2xl rounded-lg lg:rounded-xl shrink-0 shadow-sm">
                                                    {item.qty}
                                                </div>
                                                <div className="grow flex flex-col">
                                                    <div className="flex items-center gap-2 lg:gap-3">
                                                        <h3 className="font-black text-sm lg:text-xl leading-tight text-[#1D1D1F] tracking-tight">{item.name}</h3>
                                                        {item.isNew && <span className="bg-[#D43425] text-white text-[6px] lg:text-[8px] font-black px-1.5 py-0.5 rounded tracking-widest uppercase italic">NEW</span>}
                                                    </div>
                                                    {item.note && (
                                                        <div className="mt-1 lg:mt-2 flex items-center gap-1.5 text-[#D43425]">
                                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" /></svg>
                                                            <p className="text-[8px] lg:text-[11px] font-black uppercase tracking-widest leading-none">{item.note}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="p-4 lg:p-6 pt-0 mt-auto lg:px-8 lg:pb-8">
                                        {status === 'NEW' && (
                                            <button
                                                onClick={() => moveStatus(ticket.id, 'PREPARING')}
                                                disabled={isUpdating}
                                                className="w-full h-12 lg:h-16 bg-[#1D1D1F] text-white text-[10px] lg:text-xs font-black uppercase tracking-[0.4em] rounded-xl lg:rounded-2xl active:scale-95 transition-all shadow-lg hover:bg-[#D43425] disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {isUpdating ? 'UPDATING...' : 'START_PREP'}
                                            </button>
                                        )}
                                        {status === 'PREPARING' && (
                                            <button
                                                onClick={() => moveStatus(ticket.id, 'READY')}
                                                disabled={isUpdating}
                                                className="w-full h-12 lg:h-16 bg-green-600 text-white text-[10px] lg:text-xs font-black uppercase tracking-[0.4em] rounded-xl lg:rounded-2xl active:scale-95 transition-all shadow-lg shadow-green-900/10 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {isUpdating ? 'UPDATING...' : 'MARK_READY'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    // ============================================
    // Loading State
    // ============================================

    if (!mounted) return null;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full w-full bg-[#F8F9FA]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-zinc-200 border-t-zinc-900 rounded-full animate-spin" />
                    <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Loading Orders...</p>
                </div>
            </div>
        );
    }

    // ============================================
    // Error State
    // ============================================

    if (error) {
        return (
            <div className="flex items-center justify-center h-full w-full bg-[#F8F9FA]">
                <div className="flex flex-col items-center gap-4 text-center px-4">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <p className="text-sm font-bold text-zinc-900">{error}</p>
                    <button
                        onClick={fetchOrders}
                        className="px-4 py-2 bg-zinc-900 text-white text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-zinc-700 transition-colors"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    // ============================================
    // Main Render
    // ============================================

    return (
        <div className="flex flex-col h-full w-full">
            {/* MOBILE/TABLET TAB NAVIGATOR - Shown on Mobile (up to md) and Tablets (md to lg) */}
            <div className="lg:hidden flex bg-white border-b border-zinc-200 shrink-0">
                {(['NEW', 'PREPARING', 'READY'] as const).map(status => (
                    <button
                        key={status}
                        onClick={() => setActiveTab(status)}
                        className={`grow py-4 px-2 flex flex-col items-center gap-1 relative transition-all ${activeTab === status ? 'text-black' : 'text-zinc-400'}`}
                    >
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] md:text-[10px] font-black tracking-widest uppercase">{status}</span>
                            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === status ? 'bg-black text-white' : 'bg-zinc-100 text-zinc-400'}`}>
                                {tickets.filter(t => t.status === status).length}
                            </span>
                        </div>
                        {activeTab === status && <div className={`absolute bottom-0 left-0 w-full h-1 ${status === 'NEW' ? 'bg-blue-500' : status === 'PREPARING' ? 'bg-amber-500' : 'bg-green-500'}`} />}
                    </button>
                ))}
            </div>

            {/* RENDER ZONE */}
            <div className="grow flex lg:grid lg:grid-cols-3 h-full divide-x divide-zinc-200 overflow-hidden">
                <Column title="Intake_New" status="NEW" mobileHidden={activeTab !== 'NEW'} tabletHidden={activeTab !== 'NEW'} />
                <Column title="Operations_Prep" status="PREPARING" mobileHidden={activeTab !== 'PREPARING'} tabletHidden={activeTab !== 'PREPARING'} />
                <Column title="Dispatch_Ready" status="READY" mobileHidden={activeTab !== 'READY'} tabletHidden={activeTab !== 'READY'} />
            </div>
        </div>
    );
}
