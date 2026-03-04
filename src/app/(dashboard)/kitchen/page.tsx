'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// Types
// ============================================

type LineItem = {
    id: string;
    name: string;
    qty: number;
    status: 'PENDING' | 'PREPARING' | 'READY' | 'SERVED' | 'CANCELLED';
    variant?: { name: string; price: number };
    modifiers?: { name: string; price: number }[];
    notes?: string;
};

type Ticket = {
    id: string;
    fullId: string;
    table: string;
    status: string;
    items: LineItem[];
    createdAt: number;
    version: number;
};

interface ApiOrder {
    id: string;
    tableCode: string;
    status: string;
    version: number;
    items: any[];
    createdAt: string;
}

// ============================================
// Constants
// ============================================

const NOTIFICATION_SOUND = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'; // Professional bell

// ============================================
// Component
// ============================================

export default function KitchenKDS() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(Date.now());
    const [activeTab, setActiveTab] = useState<'NEW' | 'PREPARING'>('NEW');
    const [mounted, setMounted] = useState(false);
    const [updating, setUpdating] = useState<string | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const fetchOrders = useCallback(async () => {
        try {
            // Fetch any order that has active items
            const res = await fetch('/api/orders?status=NEW,PREPARING,READY,SERVED');
            const data = await res.json();
            if (!data.success) return;

            const newTickets = data.orders.map((order: ApiOrder) => ({
                id: order.id.slice(0, 8).toUpperCase(),
                fullId: order.id,
                table: order.tableCode.replace('T-', ''),
                status: order.status,
                items: order.items.filter((i: any) => i.status === 'PENDING' || i.status === 'PREPARING').map(i => ({
                    id: i.id,
                    name: i.itemName,
                    qty: i.quantity,
                    status: i.status || 'PENDING',
                    variant: i.selectedVariant,
                    modifiers: i.selectedModifiers,
                    notes: i.notes
                })),
                createdAt: new Date(order.createdAt).getTime(),
                version: order.version,
            })).filter((t: Ticket) => t.items.some(i => ['PENDING', 'PREPARING'].includes(i.status)));

            setTickets(newTickets);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    const moveStatus = async (ticket: Ticket, nextStatus: 'PREPARING' | 'READY') => {
        setUpdating(ticket.id);
        try {
            const targetItems = ticket.items.filter(i =>
                (nextStatus === 'PREPARING' && i.status === 'PENDING') ||
                (nextStatus === 'READY' && i.status === 'PREPARING')
            );

            // 1. Update individual items
            for (const item of targetItems) {
                await fetch(`/api/orders/${ticket.fullId}/items/${item.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: nextStatus }),
                });
            }

            // 2. Synchronize Order status (This moves the ticket between KDS tabs)
            const orderRes = await fetch(`/api/orders/${ticket.fullId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: nextStatus,
                    version: ticket.version
                }),
            });

            if (orderRes.ok) {
                showToast(nextStatus === 'PREPARING' ? "Preparation started" : "Order marked as Ready");
                await fetchOrders();
            } else {
                const errData = await orderRes.json();
                showToast(errData.error || "failed to move order", "error");
            }
        } catch (err) {
            console.error(err);
            showToast("System synchronization error", "error");
        } finally {
            setUpdating(null);
        }
    };

    useEffect(() => {
        setMounted(true);
        fetchOrders();

        // ─── REAL-TIME SSE CONNECTION ───
        const eventSource = new EventSource('/api/events');

        eventSource.onmessage = (e) => {
            try {
                const data = JSON.parse(e.data);
                if (data.event === 'ORDER_CREATED' || data.event === 'ORDER_UPDATED') {
                    // Instant refresh on any relevant order event
                    fetchOrders();
                }
            } catch (err) {
                console.error("SSE Parse Error:", err);
            }
        };

        const poll = setInterval(fetchOrders, 30000); // Polling reduced to 30s as safety fallback
        const clock = setInterval(() => setCurrentTime(Date.now()), 1000);

        return () => {
            eventSource.close();
            clearInterval(poll);
            clearInterval(clock);
        };
    }, [fetchOrders]);

    const filteredTickets = useMemo(() => {
        return tickets
            .filter(t => t.status === activeTab)
            .sort((a, b) => a.createdAt - b.createdAt);
    }, [tickets, activeTab]);

    if (!mounted) return null;

    if (loading && tickets.length === 0) {
        return (
            <div className="h-full flex items-center justify-center bg-white">
                <div className="w-8 h-8 border-2 border-zinc-100 border-t-[#D43425] rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="h-full bg-white flex flex-col overflow-hidden">

            {/* SUBTLE TAB NAVIGATION */}
            <div className="px-6 py-6 border-b border-zinc-100 shrink-0">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-xl font-bold text-[#111111] tracking-tight">KDS Operations</h1>
                        <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-widest mt-1">Live Order Stream</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {[
                            { id: 'NEW', label: 'Queued' },
                            { id: 'PREPARING', label: 'Preparing' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${activeTab === tab.id ? 'bg-[#111111] text-white' : 'bg-zinc-50 text-zinc-400'}`}
                            >
                                {tab.label}
                                <span className="ml-2 opacity-40">{tickets.filter(t => t.status === tab.id).length}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* TICKETS GRID */}
            <div className="grow overflow-y-auto px-6 py-8 no-scrollbar pb-32">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    <AnimatePresence mode="popLayout">
                        {filteredTickets.map((ticket) => {
                            const diffMins = Math.floor((currentTime - ticket.createdAt) / 60000);
                            const isLate = diffMins >= 10;
                            const isUpdating = updating === ticket.id;

                            return (
                                <motion.div
                                    key={ticket.id}
                                    layout
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`p-5 rounded-2xl border transition-all flex flex-col ${isUpdating ? 'opacity-50' : ''} ${isLate ? 'border-red-100 bg-red-50/20' : 'border-zinc-100 bg-white shadow-sm'}`}
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex flex-col">
                                            <span className="text-2xl font-bold tracking-tighter text-[#111111]">T-{ticket.table}</span>
                                            <span className="text-[8px] font-bold text-zinc-300 uppercase tracking-widest">#{ticket.id}</span>
                                        </div>
                                        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg ${isLate ? 'bg-red-100 text-red-600' : 'bg-zinc-50 text-zinc-400'}`}>
                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                                            <span className="text-[10px] font-bold tabular-nums">{diffMins}m</span>
                                        </div>
                                    </div>

                                    <div className="space-y-4 mb-6 grow">
                                        {ticket.items.map((item, i) => (
                                            <div key={i} className="flex flex-col gap-1 border-b border-dashed border-zinc-100 pb-2 last:border-0">
                                                <div className="flex items-start gap-3">
                                                    <span className="text-xs font-bold text-[#111111] bg-zinc-50 px-1.5 py-0.5 rounded-md shrink-0">{item.qty}</span>
                                                    <span className="text-xs font-bold text-zinc-800 uppercase tracking-tight mt-0.5">{item.name}</span>
                                                </div>

                                                {/* MODIFICATIONS DISPLAY */}
                                                {(item.variant || (item.modifiers && item.modifiers.length > 0) || item.notes) && (
                                                    <div className="pl-9 space-y-1">
                                                        {/* Variant Tag */}
                                                        {item.variant && (
                                                            <div className="inline-block bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider mr-1">
                                                                {item.variant.name}
                                                            </div>
                                                        )}

                                                        {/* Modifiers List */}
                                                        {item.modifiers?.map((mod, idx) => (
                                                            <div key={idx} className="flex items-center gap-1 text-[10px] font-medium text-red-500">
                                                                <span>• {mod.name}</span>
                                                            </div>
                                                        ))}

                                                        {/* Notes */}
                                                        {item.notes && (
                                                            <div className="text-[10px] italic text-zinc-400 bg-yellow-50 p-1.5 rounded border border-yellow-100/50 mt-1">
                                                                "{item.notes}"
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    <div className="pt-4 border-t border-zinc-50 mt-auto">
                                        {activeTab === 'NEW' ? (
                                            <button
                                                onClick={() => moveStatus(ticket, 'PREPARING')}
                                                className="w-full text-center text-[10px] font-bold text-white uppercase tracking-widest py-3 bg-[#111111] rounded-xl hover:bg-black active:scale-95 transition-all shadow-sm"
                                            >
                                                Start Prep
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => moveStatus(ticket, 'READY')}
                                                className="w-full text-center text-[10px] font-bold text-white uppercase tracking-widest py-3 bg-green-600 rounded-xl hover:bg-green-700 active:scale-95 transition-all shadow-green-200 shadow-lg"
                                            >
                                                Complete Items
                                            </button>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>

                    {filteredTickets.length === 0 && (
                        <div className="col-span-full py-24 flex flex-col items-center justify-center opacity-20">
                            <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-400">Station Clear</p>
                        </div>
                    )}
                </div>
            </div>

            {/* TOAST SYSTEM */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, x: '-50%' }}
                        animate={{ opacity: 1, y: 0, x: '-50%' }}
                        exit={{ opacity: 0, y: 50, x: '-50%' }}
                        className={`fixed bottom-10 left-1/2 z-200 px-6 py-3 rounded-2xl shadow-xl border text-sm font-bold uppercase tracking-widest ${toast.type === 'error' ? 'bg-red-500 text-white border-red-400' : 'bg-zinc-900 text-white border-zinc-800'}`}
                    >
                        {toast.message}
                    </motion.div>
                )}
            </AnimatePresence>

            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
}
