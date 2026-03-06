'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ShoppingBag,
    Clock,
    CheckCircle2,
    ChefHat,
    Timer,
    User,
    Hash,
    AlertCircle,
    MoreVertical,
    XCircle,
    Bell,
    ChevronRight,
    Play,
    Check
} from 'lucide-react';

// ============================================
// Types
// ============================================

type OrderItem = {
    id: string;
    itemName: string;
    quantity: number;
    status: string;
    price: number;
    selectedVariant?: any;
    selectedModifiers?: any;
    notes?: string | null;
};

type Order = {
    id: string;
    tableCode: string;
    status: 'NEW' | 'PREPARING' | 'READY' | 'SERVED' | 'BILL_REQUESTED' | 'CLOSED' | 'CANCELLED';
    version: number;
    customerName: string | null;
    items: OrderItem[];
    grandTotal: number;
    estimatedTime: number | null;
    createdAt: string;
};

// ============================================
// Constants
// ============================================

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
    NEW: { label: 'New Order', color: 'text-blue-600', bg: 'bg-blue-50', icon: Bell },
    PREPARING: { label: 'Preparing', color: 'text-amber-600', bg: 'bg-amber-50', icon: ChefHat },
    READY: { label: 'Ready', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle2 },
    SERVED: { label: 'Served', color: 'text-indigo-600', bg: 'bg-indigo-50', icon: User },
    BILL_REQUESTED: { label: 'Bill Requested', color: 'text-rose-600', bg: 'bg-rose-50', icon: Hash },
};

const NOTIFICATION_SOUND = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

// ============================================
// Component
// ============================================

export default function AdminOrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(Date.now());
    const [activeTab, setActiveTab] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [mounted, setMounted] = useState(false);
    const [updating, setUpdating] = useState<string | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // UI State
    const [etaInput, setEtaInput] = useState<Record<string, string>>({});

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const playNotification = useCallback(() => {
        try {
            const audio = new Audio(NOTIFICATION_SOUND);
            audio.play().catch(() => { /* autoplay blocked */ });
        } catch { /* ignore */ }
    }, []);

    const fetchOrders = useCallback(async () => {
        try {
            const res = await fetch('/api/orders?status=NEW,PREPARING,READY,SERVED,BILL_REQUESTED');
            const data = await res.json();
            if (data.success) {
                setOrders(data.orders);
            }
        } catch (err) {
            console.error("[ADMIN ORDERS] Fetch failed:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        setMounted(true);
        fetchOrders();

        // ─── REAL-TIME SSE CONNECTION ───
        const eventSource = new EventSource('/api/events');

        eventSource.onmessage = (e) => {
            try {
                const data = JSON.parse(e.data);
                if (data.event === 'ORDER_CREATED') {
                    playNotification();
                    fetchOrders();
                } else if (data.event === 'ORDER_UPDATED') {
                    fetchOrders();
                }
            } catch (err) {
                console.error("SSE Parse Error:", err);
            }
        };

        const clock = setInterval(() => setCurrentTime(Date.now()), 1000);

        return () => {
            eventSource.close();
            clearInterval(clock);
        };
    }, [fetchOrders, playNotification]);

    const handleUpdateStatus = async (orderId: string, version: number, status: string, estimatedTime?: number) => {
        setUpdating(orderId);
        try {
            const res = await fetch(`/api/orders/${orderId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status,
                    version,
                    ...(estimatedTime !== undefined && { estimatedTime })
                }),
            });

            const data = await res.json();
            if (data.success) {
                showToast(`Order updated to ${status}`);
                fetchOrders();
            } else {
                showToast(data.error || "Failed to update order", "error");
            }
        } catch (err) {
            showToast("Connection error", "error");
        } finally {
            setUpdating(null);
        }
    };

    const filteredOrders = useMemo(() => {
        return orders
            .filter(o => statusFilter === 'ALL' || o.status === statusFilter)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [orders, statusFilter]);

    if (!mounted) return null;

    return (
        <div className="flex flex-col h-full bg-[#F8FAFC]">

            {/* ─── Header Section ─── */}
            <div className="px-6 md:px-10 py-6 bg-white border-b border-slate-200 shrink-0">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Live Orders</h1>
                        <p className="text-xs text-slate-400 font-medium uppercase tracking-[0.2em] mt-1">Real-time Service Monitoring</p>
                    </div>

                    <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                        {[
                            { id: 'ALL', label: 'All Active' },
                            { id: 'NEW', label: 'New' },
                            { id: 'PREPARING', label: 'In Kitchen' },
                            { id: 'READY', label: 'Ready' },
                            { id: 'BILL_REQUESTED', label: 'Billing' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setStatusFilter(tab.id)}
                                className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${statusFilter === tab.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                {tab.label}
                                {statusFilter !== tab.id && (
                                    <span className="ml-1.5 opacity-40">
                                        {tab.id === 'ALL' ? orders.length : orders.filter(o => o.status === tab.id).length}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ─── Orders Grid ─── */}
            <div className="grow overflow-y-auto px-6 md:px-10 py-8 custom-scrollbar pb-32">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-8 h-8 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
                    </div>
                ) : filteredOrders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 opacity-30">
                        <ShoppingBag className="w-16 h-16 text-slate-300 mb-4" />
                        <p className="text-sm font-bold uppercase tracking-widest text-slate-400">Station Clear • No active orders</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                        <AnimatePresence mode="popLayout">
                            {filteredOrders.map((order) => {
                                const waitTime = Math.floor((currentTime - new Date(order.createdAt).getTime()) / 60000);
                                const isStale = waitTime >= 15 && order.status !== 'READY';
                                const config = STATUS_CONFIG[order.status] || { label: order.status, color: 'text-slate-600', bg: 'bg-slate-50', icon: Hash };
                                const StatusIcon = config.icon;

                                return (
                                    <motion.div
                                        key={order.id}
                                        layout
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className={`bg-white rounded-3xl border transition-all flex flex-col overflow-hidden relative ${updating === order.id ? 'opacity-50 pointer-events-none' : ''} ${isStale ? 'border-amber-200 shadow-orange-100 shadow-lg' : 'border-slate-100 shadow-sm'}`}
                                    >
                                        {/* Status Bar */}
                                        <div className={`h-1.5 w-full ${config.bg.replace('bg-', 'bg-').split(' ')[0].replace('50', '500')}`} />

                                        <div className="p-6">
                                            {/* Top Line */}
                                            <div className="flex items-start justify-between mb-6">
                                                <div className="flex gap-3">
                                                    <div className={`w-12 h-12 rounded-2xl ${config.bg} flex items-center justify-center`}>
                                                        <StatusIcon className={`w-6 h-6 ${config.color}`} />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-xl font-black text-slate-900 leading-none">T-{order.tableCode.replace('T-', '')}</h3>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">
                                                            {order.customerName || 'Guest'} • #{order.id.slice(-4)}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 ${isStale ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-400'}`}>
                                                    <Clock size={12} />
                                                    <span className="text-[10px] font-bold tabular-nums">{waitTime}m</span>
                                                </div>
                                            </div>

                                            {/* Items List */}
                                            <div className="space-y-3 mb-6">
                                                {order.items.map((item, idx) => (
                                                    <div key={idx} className="flex items-start justify-between group">
                                                        <div className="flex gap-3 min-w-0">
                                                            <span className="text-xs font-bold text-slate-400 mt-0.5">{item.quantity}x</span>
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-bold text-slate-700 uppercase tracking-tight truncate">{item.itemName}</p>
                                                                {item.selectedVariant && (
                                                                    <span className="text-[9px] font-bold text-slate-400 uppercase mr-2">{item.selectedVariant.name}</span>
                                                                )}
                                                                {item.notes && (
                                                                    <p className="text-[10px] italic text-indigo-500 mt-0.5 leading-snug">"{item.notes}"</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <span className="text-[10px] font-medium text-slate-300 group-hover:text-slate-400 transition-colors">₹{Number(item.price)}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Footer Info */}
                                            <div className="flex items-center justify-between pt-6 border-t border-slate-50 mt-auto">
                                                <div>
                                                    <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Total Bill</span>
                                                    <p className="text-lg font-black text-slate-900 italic">₹{Number(order.grandTotal).toLocaleString('en-IN')}</p>
                                                </div>

                                                <div className="text-right">
                                                    <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest leading-none">ETA</span>
                                                    {order.estimatedTime ? (
                                                        <div className="flex items-center gap-1 text-emerald-600 font-bold justify-end">
                                                            <Timer size={14} />
                                                            <span className="text-sm tabular-nums">{order.estimatedTime}m</span>
                                                        </div>
                                                    ) : (
                                                        <p className="text-xs font-bold text-slate-400 italic">Pending</p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Actions Panel */}
                                            <div className="mt-8 grid grid-cols-2 gap-3">
                                                {order.status === 'NEW' && (
                                                    <>
                                                        <div className="col-span-2 flex gap-2 mb-2">
                                                            <input
                                                                type="number"
                                                                placeholder="ETA (Min)"
                                                                value={etaInput[order.id] || ''}
                                                                onChange={(e) => setEtaInput({ ...etaInput, [order.id]: e.target.value })}
                                                                className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold outline-hidden focus:border-indigo-500 focus:bg-white transition-all text-center"
                                                            />
                                                            <button
                                                                onClick={() => {
                                                                    const time = parseInt(etaInput[order.id]);
                                                                    if (isNaN(time)) { showToast("Enter valid minutes", "error"); return; }
                                                                    handleUpdateStatus(order.id, order.version, 'PREPARING', time);
                                                                }}
                                                                className="flex-[2] bg-indigo-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 hover:bg-zinc-900 active:scale-95 transition-all"
                                                            >
                                                                <Play size={12} fill="currentColor" />
                                                                Start Cooking
                                                            </button>
                                                        </div>
                                                    </>
                                                )}

                                                {order.status === 'PREPARING' && (
                                                    <button
                                                        onClick={() => handleUpdateStatus(order.id, order.version, 'READY')}
                                                        className="col-span-2 bg-emerald-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest py-3.5 shadow-lg shadow-emerald-100 flex items-center justify-center gap-2 hover:bg-emerald-700 active:scale-95 transition-all"
                                                    >
                                                        <Check size={16} />
                                                        Mark as Ready
                                                    </button>
                                                )}

                                                {order.status === 'READY' && (
                                                    <button
                                                        onClick={() => handleUpdateStatus(order.id, order.version, 'SERVED')}
                                                        className="col-span-2 bg-slate-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest py-3.5 shadow-lg shadow-slate-200 flex items-center justify-center gap-2 hover:bg-black active:scale-95 transition-all"
                                                    >
                                                        <Timer size={16} />
                                                        Mark Served
                                                    </button>
                                                )}

                                                {order.status === 'SERVED' && (
                                                    <div className="col-span-2 bg-slate-50 text-slate-400 rounded-xl text-[10px] font-bold uppercase tracking-widest py-3.5 text-center border border-slate-100 italic">
                                                        Service in Progress
                                                    </div>
                                                )}

                                                {order.status === 'BILL_REQUESTED' && (
                                                    <button
                                                        onClick={() => handleUpdateStatus(order.id, order.version, 'CLOSED')}
                                                        className="col-span-2 bg-indigo-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest py-3.5 shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 hover:bg-zinc-900 active:scale-95 transition-all"
                                                    >
                                                        <Hash size={16} />
                                                        Finalize Payment
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            {/* ─── Toast System ─── */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, x: '-50%' }}
                        animate={{ opacity: 1, y: 0, x: '-50%' }}
                        exit={{ opacity: 0, y: 50, x: '-50%' }}
                        className={`fixed bottom-10 left-1/2 z-200 px-6 py-4 rounded-2xl shadow-xl border flex items-center gap-3 min-w-[320px] ${toast.type === 'error' ? 'bg-red-500 text-white border-red-400' : 'bg-slate-900 text-white border-slate-800'}`}
                    >
                        {toast.type === 'error' ? <XCircle size={20} /> : <CheckCircle2 size={20} className="text-emerald-400" />}
                        <span className="text-xs font-bold uppercase tracking-widest">{toast.message}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
            `}</style>
        </div>
    );
}
