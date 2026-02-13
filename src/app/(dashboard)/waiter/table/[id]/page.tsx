'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// Types
// ============================================

interface OrderItem {
    id: string;
    name: string;
    qty: number;
    price: number;
    note?: string;
    status: string;
    time: string;
}

interface TableDetailsData {
    id: string;
    fullId: string;
    tableCode: string;
    status: string;
    version: number;
    guest: string;
    time: string;
    items: OrderItem[];
    subtotal: number;
    gstAmount: number;
    serviceChargeAmount: number;
    grandTotal: number;
}

// ============================================
// Component
// ============================================

export default function TableDetails() {
    const { id } = useParams();
    const router = useRouter();

    const [data, setData] = useState<TableDetailsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [updating, setUpdating] = useState(false);
    const [notification, setNotification] = useState<string | null>(null);

    const fetchTableDetails = useCallback(async () => {
        try {
            const tablesRes = await fetch(`/api/tables`);
            const tablesData = await tablesRes.json();
            const table = tablesData.tables?.find((t: any) => t.id === id);

            if (!table) throw new Error('Table not found');

            const ordersRes = await fetch(`/api/orders?status=NEW,PREPARING,READY,SERVED,BILL_REQUESTED`);
            const ordersData = await ordersRes.json();
            const activeOrder = ordersData.orders?.find((o: any) => o.tableId === id);

            if (!activeOrder) {
                setData({
                    id: id as string, fullId: '', tableCode: table.tableCode,
                    status: 'VACANT', version: 0, guest: 'No guest', time: '--:--',
                    items: [], subtotal: 0, gstAmount: 0, serviceChargeAmount: 0, grandTotal: 0
                });
            } else {
                setData({
                    id: activeOrder.id.slice(0, 8).toUpperCase(),
                    fullId: activeOrder.id,
                    tableCode: table.tableCode,
                    status: activeOrder.status,
                    version: activeOrder.version,
                    guest: activeOrder.customerName || `Guest @ ${table.tableCode}`,
                    time: new Date(activeOrder.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    items: activeOrder.items.map((item: any) => ({
                        id: item.id,
                        name: item.itemName,
                        qty: item.quantity,
                        price: item.price,
                        note: item.notes,
                        status: item.status,
                        time: new Date(item.createdAt || activeOrder.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    })),
                    subtotal: activeOrder.subtotal || 0,
                    gstAmount: activeOrder.gstAmount || 0,
                    serviceChargeAmount: activeOrder.serviceChargeAmount || 0,
                    grandTotal: activeOrder.grandTotal || 0,
                });
            }
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error');
        } finally { setLoading(false); }
    }, [id]);

    useEffect(() => {
        fetchTableDetails();
        const interval = setInterval(fetchTableDetails, 5000);
        return () => clearInterval(interval);
    }, [fetchTableDetails]);

    const markAsServed = async () => {
        if (!data || data.status !== 'READY' || updating) return;
        setUpdating(true);
        try {
            await fetch(`/api/orders/${data.fullId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'SERVED', version: data.version })
            });
            setNotification('Marked as served!');
            await fetchTableDetails();
        } finally { setUpdating(false); }
    };

    const requestBill = async () => {
        if (!data || !data.fullId || updating) return;
        setUpdating(true);
        try {
            await fetch(`/api/orders/${data.fullId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'BILL_REQUESTED', version: data.version })
            });
            setNotification('Bill sent to cashier!');
            await fetchTableDetails();
        } finally { setUpdating(false); }
    };

    // Status badge styling
    const getItemStatusStyle = (status: string) => {
        switch (status) {
            case 'PENDING': return { bg: 'bg-zinc-100', text: 'text-zinc-500', label: 'Queued' };
            case 'PREPARING': return { bg: 'bg-blue-50', text: 'text-blue-500', label: 'Cooking' };
            case 'READY': return { bg: 'bg-green-50', text: 'text-green-600', label: 'Ready' };
            case 'SERVED': return { bg: 'bg-zinc-50', text: 'text-zinc-400', label: 'Served' };
            case 'CANCELLED': return { bg: 'bg-red-50', text: 'text-red-500', label: 'Cancelled' };
            default: return { bg: 'bg-zinc-100', text: 'text-zinc-400', label: status };
        }
    };

    const getOrderStatusColor = (status: string) => {
        switch (status) {
            case 'NEW': return 'bg-blue-500';
            case 'PREPARING': return 'bg-blue-500';
            case 'READY': return 'bg-green-500';
            case 'SERVED': return 'bg-zinc-600';
            case 'BILL_REQUESTED': return 'bg-red-500';
            default: return 'bg-zinc-300';
        }
    };

    // ─────── Loading / Error ───────
    if (loading) return (
        <div className="h-full flex items-center justify-center bg-white">
            <div className="w-8 h-8 border-2 border-zinc-100 border-t-[#111] rounded-full animate-spin" />
        </div>
    );

    if (error || !data) return (
        <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-white">
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">Sync error</p>
            <button onClick={() => router.push('/waiter')} className="px-8 py-3 bg-[#111] text-white rounded-xl text-[10px] font-bold uppercase tracking-widest">Back</button>
        </div>
    );

    const itemTotal = data.items.reduce((sum, i) => sum + i.price * i.qty, 0);
    const displayTotal = data.grandTotal || itemTotal;

    return (
        <div className="h-full flex flex-col md:flex-row bg-white overflow-hidden">

            {/* NOTIFICATION */}
            <AnimatePresence>
                {notification && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                        className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-white px-5 py-2.5 rounded-xl shadow-lg text-xs font-bold uppercase tracking-wider"
                        onAnimationComplete={() => setTimeout(() => setNotification(null), 2000)}
                    >
                        ✓ {notification}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── LEFT / MAIN: Header + Items ─── */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

                {/* HEADER */}
                <div className="px-5 md:px-6 py-4 md:py-5 border-b border-zinc-100 shrink-0">
                    <div className="flex items-center justify-between mb-2">
                        <button onClick={() => router.push('/waiter')} className="p-2 -ml-2 text-zinc-400 hover:text-[#111] active:scale-95 transition-all">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
                        </button>
                        <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider text-white ${getOrderStatusColor(data.status)}`}>
                            {data.status === 'BILL_REQUESTED' ? 'Bill Sent' : data.status}
                        </div>
                    </div>
                    <h1 className="text-xl md:text-2xl font-black tracking-tight text-[#111]">Table {data.tableCode}</h1>
                    <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-widest mt-0.5">
                        {data.guest} · Order #{data.id} · {data.time}
                    </p>
                </div>

                {/* ITEMS LIST */}
                <div className="flex-1 overflow-y-auto px-5 md:px-6 py-5 no-scrollbar pb-44 md:pb-6">
                    {data.items.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center">
                            <span className="text-4xl mb-3 opacity-20">📋</span>
                            <p className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">No items yet</p>
                            <p className="text-[10px] text-zinc-300">Take an order for this table</p>
                            <Link
                                href={`/waiter/table/${id}/menu`}
                                className="mt-4 px-6 py-2.5 bg-[#111] text-white rounded-xl text-[10px] font-bold uppercase tracking-widest active:scale-95 transition-all"
                            >
                                Take Order
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-3 max-w-2xl">
                            {data.items.map((item, idx) => {
                                const statusStyle = getItemStatusStyle(item.status);
                                return (
                                    <motion.div
                                        key={item.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.03 }}
                                        className={`flex items-start gap-4 p-3 rounded-xl border transition-all ${item.status === 'READY' ? 'border-green-200 bg-green-50/50' : 'border-zinc-100 bg-white'}`}
                                    >
                                        {/* Quantity Badge */}
                                        <div className={`w-9 h-9 rounded-lg ${item.status === 'READY' ? 'bg-green-100 border-green-200' : 'bg-zinc-50 border-zinc-100'} border flex items-center justify-center shrink-0`}>
                                            <span className="text-xs font-black text-[#111]">{item.qty}×</span>
                                        </div>

                                        {/* Item Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <h3 className="text-sm font-bold text-[#111] truncate">{item.name}</h3>
                                                <span className="text-xs font-bold text-[#111] shrink-0">₹{item.price * item.qty}</span>
                                            </div>
                                            {item.note && (
                                                <p className="text-[10px] text-amber-600 mt-0.5 italic">📝 {item.note}</p>
                                            )}
                                            <div className="flex items-center gap-2 mt-1.5">
                                                <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${statusStyle.bg} ${statusStyle.text}`}>
                                                    {statusStyle.label}
                                                </span>
                                                <span className="text-[8px] text-zinc-300 font-medium">{item.time}</span>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* ─── RIGHT: Summary Panel (Desktop Only) ─── */}
            {data.items.length > 0 && (
                <aside className="hidden md:flex flex-col w-80 lg:w-96 border-l border-zinc-100 bg-zinc-50/30 shrink-0">
                    {/* Summary Header */}
                    <div className="px-5 py-4 border-b border-zinc-100">
                        <h2 className="text-sm font-black text-[#111] uppercase tracking-wider">Order Summary</h2>
                        <p className="text-[10px] text-zinc-400 font-medium mt-0.5">Table {data.tableCode} · {data.items.length} items</p>
                    </div>

                    {/* Quick Stats */}
                    <div className="px-5 py-4 border-b border-zinc-100">
                        <div className="grid grid-cols-3 gap-3">
                            <div className="text-center p-2 bg-white rounded-xl border border-zinc-100">
                                <p className="text-lg font-black text-[#111]">{data.items.filter(i => i.status === 'READY').length}</p>
                                <p className="text-[8px] font-bold text-green-500 uppercase tracking-widest">Ready</p>
                            </div>
                            <div className="text-center p-2 bg-white rounded-xl border border-zinc-100">
                                <p className="text-lg font-black text-[#111]">{data.items.filter(i => i.status === 'PREPARING' || i.status === 'PENDING').length}</p>
                                <p className="text-[8px] font-bold text-blue-500 uppercase tracking-widest">In Kitchen</p>
                            </div>
                            <div className="text-center p-2 bg-white rounded-xl border border-zinc-100">
                                <p className="text-lg font-black text-[#111]">{data.items.filter(i => i.status === 'SERVED').length}</p>
                                <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">Served</p>
                            </div>
                        </div>
                    </div>

                    {/* Bill Breakdown */}
                    <div className="px-5 py-4 flex-1">
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                                <span className="text-zinc-500">Subtotal</span>
                                <span className="font-bold text-[#111]">₹{(data.subtotal || itemTotal).toLocaleString()}</span>
                            </div>
                            {data.gstAmount > 0 && (
                                <div className="flex justify-between text-xs">
                                    <span className="text-zinc-500">GST</span>
                                    <span className="font-bold text-[#111]">₹{data.gstAmount.toLocaleString()}</span>
                                </div>
                            )}
                            {data.serviceChargeAmount > 0 && (
                                <div className="flex justify-between text-xs">
                                    <span className="text-zinc-500">Service Charge</span>
                                    <span className="font-bold text-[#111]">₹{data.serviceChargeAmount.toLocaleString()}</span>
                                </div>
                            )}
                            <div className="h-px bg-zinc-200 my-2" />
                            <div className="flex justify-between">
                                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Grand Total</span>
                                <span className="text-xl font-black text-[#111]">₹{displayTotal.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Desktop Actions */}
                    <div className="p-5 border-t border-zinc-100 space-y-2">
                        <Link
                            href={`/waiter/table/${id}/menu`}
                            className="flex items-center justify-center gap-2 w-full py-3 bg-[#111] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 active:scale-[0.98] transition-all"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12h14" /></svg>
                            Add More Items
                        </Link>

                        {data.status === 'READY' && (
                            <button
                                onClick={markAsServed}
                                disabled={updating}
                                className="w-full py-3 bg-green-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-green-600 active:scale-[0.98] transition-all disabled:opacity-60"
                            >
                                {updating ? '...' : '✓ Mark Served'}
                            </button>
                        )}

                        {(data.status === 'SERVED' || data.status === 'READY') && (
                            <Link
                                href={`/waiter/table/${id}/bill`}
                                className="w-full py-3 bg-amber-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 active:scale-[0.98] transition-all text-center flex items-center justify-center gap-2"
                            >
                                🧾 Preview & Send Bill
                            </Link>
                        )}
                    </div>
                </aside>
            )}

            {/* ─── MOBILE: FIXED ACTION BAR ─── */}
            {data.items.length > 0 && (
                <div className="md:hidden fixed bottom-24 left-4 right-4 z-40 space-y-2">
                    {/* Bill Summary Mini */}
                    <div className="bg-white border border-zinc-100 rounded-2xl p-3 shadow-sm">
                        <div className="flex justify-between items-baseline">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Total</span>
                            <span className="text-lg font-black text-[#111]">₹{displayTotal.toLocaleString()}</span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                        <Link
                            href={`/waiter/table/${id}/menu`}
                            className="flex-1 h-12 bg-[#111] text-white rounded-xl flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12h14" /></svg>
                            <span className="text-[10px] font-bold uppercase tracking-widest">Add Items</span>
                        </Link>

                        {data.status === 'READY' ? (
                            <button
                                onClick={markAsServed}
                                disabled={updating}
                                className="flex-1 h-12 bg-green-500 text-white rounded-xl flex items-center justify-center shadow-sm active:scale-95 transition-all disabled:opacity-60"
                            >
                                <span className="text-[10px] font-bold uppercase tracking-widest">{updating ? '...' : 'Serve'}</span>
                            </button>
                        ) : data.status === 'SERVED' ? (
                            <Link
                                href={`/waiter/table/${id}/bill`}
                                className="flex-1 h-12 bg-amber-500 text-white rounded-xl flex items-center justify-center shadow-sm active:scale-95 transition-all"
                            >
                                <span className="text-[10px] font-bold uppercase tracking-widest">🧾 Bill</span>
                            </Link>
                        ) : (
                            <div className="flex-1 h-12 bg-zinc-100 text-zinc-400 rounded-xl flex items-center justify-center">
                                <span className="text-[10px] font-bold uppercase tracking-widest">
                                    {data.status === 'BILL_REQUESTED' ? 'Bill Sent' : 'Processing'}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Mobile empty table action */}
            {data.items.length === 0 && data.status === 'VACANT' && (
                <div className="md:hidden fixed bottom-24 left-4 right-4 z-40">
                    <Link
                        href={`/waiter/table/${id}/menu`}
                        className="block w-full py-4 bg-[#111] text-white rounded-2xl text-center text-xs font-black uppercase tracking-widest shadow-sm active:scale-95 transition-all"
                    >
                        Take Order for This Table
                    </Link>
                </div>
            )}

            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
}
