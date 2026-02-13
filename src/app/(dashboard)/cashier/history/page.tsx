'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// Types
// ============================================

interface SettledOrder {
    id: string;
    tableCode: string;
    customerName: string | null;
    customerPhone: string | null;
    status: string;
    items: { id: string; itemName: string; quantity: number; price: number }[];
    subtotal: number;
    gstAmount: number;
    serviceChargeAmount: number;
    grandTotal: number;
    createdAt: string;
    closedAt?: string;
}

// ============================================
// Component
// ============================================

export default function CashierHistory() {
    const [orders, setOrders] = useState<SettledOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const fetchHistory = useCallback(async () => {
        try {
            const res = await fetch('/api/orders?status=CLOSED&limit=100');
            const data = await res.json();

            if (data.success && data.orders) {
                const mapped: SettledOrder[] = data.orders
                    .sort((a: any, b: any) => new Date(b.closedAt || b.createdAt).getTime() - new Date(a.closedAt || a.createdAt).getTime())
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
                        subtotal: o.subtotal || 0,
                        gstAmount: o.gstAmount || 0,
                        serviceChargeAmount: o.serviceChargeAmount || 0,
                        grandTotal: o.grandTotal || o.total || 0,
                        createdAt: o.createdAt,
                        closedAt: o.closedAt,
                    }));
                setOrders(mapped);
            }
        } catch (err) {
            console.error('[CASHIER_HISTORY] Error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    // Stats
    const todayOrders = useMemo(() => {
        const now = new Date();
        return orders.filter(o => {
            const d = new Date(o.closedAt || o.createdAt);
            return d.toDateString() === now.toDateString();
        });
    }, [orders]);

    const totalRevenue = todayOrders.reduce((a, b) => a + b.grandTotal, 0);
    const totalGST = todayOrders.reduce((a, b) => a + b.gstAmount, 0);
    const avgBill = todayOrders.length > 0 ? Math.round(totalRevenue / todayOrders.length) : 0;

    if (loading) return (
        <div className="h-full flex items-center justify-center bg-white">
            <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-zinc-200 border-t-[#111] rounded-full animate-spin" />
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Loading ledger...</span>
            </div>
        </div>
    );

    return (
        <div className="h-full flex flex-col bg-white overflow-hidden">

            {/* Header */}
            <div className="px-4 md:px-6 py-4 border-b border-zinc-100 shrink-0">
                <h1 className="text-lg md:text-xl font-black text-[#111] tracking-tight">Settlement Ledger</h1>
                <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">
                    Today&apos;s Transactions
                </p>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-2 mt-3">
                    <div className="bg-emerald-50 rounded-xl px-3 py-2.5">
                        <p className="text-[7px] font-bold text-emerald-400 uppercase tracking-widest">Revenue</p>
                        <p className="text-base font-black text-emerald-600 tabular-nums">₹{totalRevenue.toLocaleString()}</p>
                    </div>
                    <div className="bg-zinc-50 rounded-xl px-3 py-2.5">
                        <p className="text-[7px] font-bold text-zinc-300 uppercase tracking-widest">Bills</p>
                        <p className="text-base font-black text-[#111] tabular-nums">{todayOrders.length}</p>
                    </div>
                    <div className="bg-zinc-50 rounded-xl px-3 py-2.5">
                        <p className="text-[7px] font-bold text-zinc-300 uppercase tracking-widest">Avg Bill</p>
                        <p className="text-base font-black text-[#111] tabular-nums">₹{avgBill.toLocaleString()}</p>
                    </div>
                    <div className="bg-blue-50 rounded-xl px-3 py-2.5">
                        <p className="text-[7px] font-bold text-blue-400 uppercase tracking-widest">GST</p>
                        <p className="text-base font-black text-blue-600 tabular-nums">₹{totalGST.toLocaleString()}</p>
                    </div>
                </div>
            </div>

            {/* Settled Orders */}
            <div className="flex-1 overflow-y-auto no-scrollbar pb-24 md:pb-4">
                {orders.length === 0 ? (
                    <div className="py-20 text-center">
                        <span className="text-4xl block mb-3 opacity-20">💰</span>
                        <p className="text-xs font-bold text-zinc-300 uppercase tracking-wider">No settlements yet</p>
                        <p className="text-[10px] text-zinc-300 mt-1">Settled bills will appear here</p>
                    </div>
                ) : (
                    <div className="divide-y divide-zinc-50">
                        {orders.map((order, idx) => {
                            const isExpanded = expandedId === order.id;
                            const itemCount = order.items.reduce((a, b) => a + b.quantity, 0);
                            const settledTime = order.closedAt
                                ? new Date(order.closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                : '—';

                            return (
                                <div key={order.id}>
                                    <button
                                        onClick={() => setExpandedId(isExpanded ? null : order.id)}
                                        className="w-full px-4 md:px-6 py-3.5 flex items-center gap-3 hover:bg-zinc-50/50 transition-colors text-left"
                                    >
                                        {/* Serial */}
                                        <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center shrink-0">
                                            <span className="text-[10px] font-black text-emerald-500">#{orders.length - idx}</span>
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className="text-xs font-bold text-[#111] truncate">
                                                    {order.customerName || 'Walk-in Guest'}
                                                </span>
                                                <span className="text-[9px] font-medium text-zinc-400">{order.tableCode}</span>
                                            </div>
                                            <p className="text-[10px] text-zinc-400 font-medium">
                                                {itemCount} items · ⏱ {settledTime}
                                                {order.customerPhone && ` · 📱 ${order.customerPhone}`}
                                            </p>
                                        </div>

                                        {/* Amount */}
                                        <div className="text-right shrink-0">
                                            <p className="text-sm font-black text-emerald-600 tabular-nums">₹{order.grandTotal.toLocaleString()}</p>
                                        </div>

                                        <svg
                                            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                                            className={`text-zinc-300 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                        >
                                            <polyline points="6 9 12 15 18 9" />
                                        </svg>
                                    </button>

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
                                                        {/* Tax Breakdown */}
                                                        <div className="space-y-1 text-[10px]">
                                                            <div className="flex justify-between">
                                                                <span className="text-zinc-400">Subtotal</span>
                                                                <span className="font-bold text-zinc-600 tabular-nums">₹{order.subtotal.toLocaleString()}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-zinc-400">GST</span>
                                                                <span className="font-bold text-zinc-600 tabular-nums">₹{order.gstAmount.toLocaleString()}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-zinc-400">Service</span>
                                                                <span className="font-bold text-zinc-600 tabular-nums">₹{order.serviceChargeAmount.toLocaleString()}</span>
                                                            </div>
                                                            <div className="h-px bg-zinc-200 my-1" />
                                                            <div className="flex justify-between text-xs">
                                                                <span className="font-bold text-[#111]">Grand Total</span>
                                                                <span className="font-black text-[#111] tabular-nums">₹{order.grandTotal.toLocaleString()}</span>
                                                            </div>
                                                        </div>
                                                        {/* Meta */}
                                                        <div className="flex gap-4 mt-3 text-[9px] text-zinc-400 font-medium">
                                                            <span>Order #{order.id.slice(0, 8).toUpperCase()}</span>
                                                            {order.customerPhone && <span>📱 {order.customerPhone}</span>}
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
