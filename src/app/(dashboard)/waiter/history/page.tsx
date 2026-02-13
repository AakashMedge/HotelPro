'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// Types
// ============================================

interface HistoryOrder {
    id: string;
    tableCode: string;
    customerName: string | null;
    customerPhone: string | null;
    status: string;
    items: { id: string; itemName: string; quantity: number; price: number }[];
    total: number;
    grandTotal: number;
    createdAt: string;
    closedAt?: string;
}

type FilterType = 'ALL' | 'CLOSED' | 'BILL_REQUESTED' | 'CANCELLED';

// ============================================
// Helpers
// ============================================

const getTimeAgo = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ${mins % 60}m ago`;
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

const getStatusBadge = (status: string) => {
    switch (status) {
        case 'CLOSED': return { label: 'Settled', color: 'bg-emerald-50 text-emerald-600' };
        case 'BILL_REQUESTED': return { label: 'At Cashier', color: 'bg-amber-50 text-amber-600' };
        case 'CANCELLED': return { label: 'Cancelled', color: 'bg-red-50 text-red-500' };
        default: return { label: status, color: 'bg-zinc-100 text-zinc-500' };
    }
};

// ============================================
// Component
// ============================================

export default function WaiterHistory() {
    const [orders, setOrders] = useState<HistoryOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const fetchHistory = useCallback(async () => {
        try {
            const res = await fetch('/api/orders?status=CLOSED,BILL_REQUESTED,CANCELLED&limit=100');
            const data = await res.json();

            if (data.success && data.orders) {
                const mapped: HistoryOrder[] = data.orders
                    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((o: any) => ({
                        id: o.id,
                        tableCode: o.tableCode,
                        customerName: o.customerName,
                        customerPhone: o.customerPhone || null,
                        status: o.status,
                        items: o.items.map((i: any) => ({
                            id: i.id,
                            itemName: i.itemName,
                            quantity: i.quantity,
                            price: i.price,
                        })),
                        total: o.total,
                        grandTotal: o.grandTotal,
                        createdAt: o.createdAt,
                        closedAt: o.closedAt,
                    }));
                setOrders(mapped);
            }
        } catch (err) {
            console.error('[HISTORY] Error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    const filtered = useMemo(() => {
        if (activeFilter === 'ALL') return orders;
        return orders.filter(o => o.status === activeFilter);
    }, [orders, activeFilter]);

    // Stats
    const todayOrders = orders.filter(o => {
        const d = new Date(o.createdAt);
        const now = new Date();
        return d.toDateString() === now.toDateString();
    });
    const todayRevenue = todayOrders.reduce((a, b) => a + b.grandTotal, 0);
    const todayClosed = todayOrders.filter(o => o.status === 'CLOSED').length;

    if (loading) return (
        <div className="h-full flex items-center justify-center bg-white">
            <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-zinc-200 border-t-[#111] rounded-full animate-spin" />
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Loading history...</span>
            </div>
        </div>
    );

    const filters: { key: FilterType; label: string }[] = [
        { key: 'ALL', label: 'All' },
        { key: 'CLOSED', label: 'Settled' },
        { key: 'BILL_REQUESTED', label: 'Pending' },
    ];

    return (
        <div className="h-full flex flex-col bg-white overflow-hidden">

            {/* Header */}
            <div className="px-4 md:px-6 py-4 border-b border-zinc-100 shrink-0">
                <h1 className="text-lg md:text-xl font-black text-[#111] tracking-tight">Order History</h1>
                <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">
                    Today&apos;s Activity
                </p>

                {/* Stats Row */}
                <div className="flex gap-3 mt-3">
                    <div className="bg-zinc-50 rounded-xl px-3 py-2 flex-1">
                        <p className="text-[8px] font-bold text-zinc-300 uppercase tracking-widest">Orders</p>
                        <p className="text-lg font-black text-[#111] tabular-nums">{todayOrders.length}</p>
                    </div>
                    <div className="bg-emerald-50 rounded-xl px-3 py-2 flex-1">
                        <p className="text-[8px] font-bold text-emerald-400 uppercase tracking-widest">Settled</p>
                        <p className="text-lg font-black text-emerald-600 tabular-nums">{todayClosed}</p>
                    </div>
                    <div className="bg-zinc-50 rounded-xl px-3 py-2 flex-1">
                        <p className="text-[8px] font-bold text-zinc-300 uppercase tracking-widest">Revenue</p>
                        <p className="text-lg font-black text-[#111] tabular-nums">₹{todayRevenue.toLocaleString()}</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex gap-1 mt-3">
                    {filters.map(f => (
                        <button
                            key={f.key}
                            onClick={() => setActiveFilter(f.key)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${activeFilter === f.key
                                    ? 'bg-[#111] text-white'
                                    : 'bg-zinc-100 text-zinc-500'
                                }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Order List */}
            <div className="flex-1 overflow-y-auto no-scrollbar pb-24 md:pb-4">
                {filtered.length === 0 ? (
                    <div className="py-20 text-center">
                        <span className="text-4xl block mb-3 opacity-20">📋</span>
                        <p className="text-xs font-bold text-zinc-300 uppercase tracking-wider">No orders found</p>
                    </div>
                ) : (
                    <div className="divide-y divide-zinc-50">
                        {filtered.map(order => {
                            const badge = getStatusBadge(order.status);
                            const isExpanded = expandedId === order.id;
                            const itemCount = order.items.reduce((a, b) => a + b.quantity, 0);

                            return (
                                <div key={order.id}>
                                    <button
                                        onClick={() => setExpandedId(isExpanded ? null : order.id)}
                                        className="w-full px-4 md:px-6 py-3.5 flex items-center gap-3 hover:bg-zinc-50/50 transition-colors text-left"
                                    >
                                        {/* Table Badge */}
                                        <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center shrink-0">
                                            <span className="text-sm font-black text-zinc-500">{order.tableCode.replace('T-', '')}</span>
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className="text-xs font-bold text-[#111] truncate">
                                                    {order.customerName || 'Walk-in Guest'}
                                                </span>
                                                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-md ${badge.color}`}>
                                                    {badge.label}
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-zinc-400 font-medium">
                                                {itemCount} items · {getTimeAgo(order.createdAt)}
                                                {order.customerPhone && ` · 📱 ${order.customerPhone}`}
                                            </p>
                                        </div>

                                        {/* Amount */}
                                        <div className="text-right shrink-0">
                                            <p className="text-sm font-black text-[#111] tabular-nums">₹{order.grandTotal.toLocaleString()}</p>
                                        </div>

                                        {/* Chevron */}
                                        <svg
                                            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                                            className={`text-zinc-300 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                        >
                                            <polyline points="6 9 12 15 18 9" />
                                        </svg>
                                    </button>

                                    {/* Expanded Detail */}
                                    <AnimatePresence>
                                        {isExpanded && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="px-4 md:px-6 pb-4">
                                                    <div className="bg-zinc-50 rounded-xl p-4">
                                                        {/* Items */}
                                                        <div className="space-y-1.5 mb-3">
                                                            {order.items.map(item => (
                                                                <div key={item.id} className="flex justify-between text-xs">
                                                                    <span className="font-medium text-zinc-600">{item.itemName} × {item.quantity}</span>
                                                                    <span className="font-bold text-[#111] tabular-nums">₹{(item.price * item.quantity).toLocaleString()}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <div className="h-px bg-zinc-200 my-2" />
                                                        <div className="flex justify-between text-xs">
                                                            <span className="font-bold text-zinc-500">Total</span>
                                                            <span className="font-black text-[#111] tabular-nums">₹{order.grandTotal.toLocaleString()}</span>
                                                        </div>
                                                        {/* Meta */}
                                                        <div className="flex gap-4 mt-3 text-[9px] text-zinc-400 font-medium">
                                                            <span>Order #{order.id.slice(0, 8).toUpperCase()}</span>
                                                            {order.closedAt && (
                                                                <span>Settled {getTimeAgo(order.closedAt)}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
}
