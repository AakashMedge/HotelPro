'use client';

import { useState, useEffect, useCallback } from 'react';

// ============================================
// Types
// ============================================

type LineItem = {
    id: string;
    name: string;
    qty: number;
    price: number;
};

type PendingTable = {
    id: string;         // Full Order ID
    shortId: string;    // Short Display ID
    tableCode: string;
    guestName: string;
    items: LineItem[];
    requestedAt: number;
    total: number;
    version: number;
};

interface ApiResponse {
    success: boolean;
    orders?: any[];
    order?: any;
    error?: string;
}

// ============================================
// Component
// ============================================

export default function CashierTerminal() {
    const [mounted, setMounted] = useState(false);
    const [orders, setOrders] = useState<PendingTable[]>([]);
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'CARD' | 'CASH' | null>(null);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isMobileDetailView, setIsMobileDetailView] = useState(false);
    const [committing, setCommitting] = useState(false);

    // ============================================
    // Fetch Data
    // ============================================

    const fetchPendingOrders = useCallback(async () => {
        try {
            const res = await fetch('/api/orders?status=SERVED');
            const data: ApiResponse = await res.json();

            if (!data.success || !data.orders) throw new Error(data.error || 'Failed to fetch orders');

            const pending: PendingTable[] = data.orders.map((o: any) => ({
                id: o.id,
                shortId: o.id.slice(0, 8).toUpperCase(),
                tableCode: o.tableCode,
                guestName: `GUEST @ ${o.tableCode}`,
                requestedAt: new Date(o.updatedAt).getTime(),
                version: o.version,
                total: o.total,
                items: o.items.map((item: any) => ({
                    id: item.id,
                    name: item.itemName,
                    qty: item.quantity,
                    price: item.price
                }))
            }));

            setOrders(pending);

            // Auto-select first if none selected and on desktop
            if (pending.length > 0 && !selectedOrderId && window.innerWidth >= 768) {
                setSelectedOrderId(pending[0].id);
            }
        } catch (err) {
            console.error('[CASHIER] Fetch Error:', err);
        } finally {
            setLoading(false);
        }
    }, [selectedOrderId]);

    useEffect(() => {
        setMounted(true);
        fetchPendingOrders();

        // Poll every 10 seconds
        const interval = setInterval(fetchPendingOrders, 10000);
        return () => clearInterval(interval);
    }, [fetchPendingOrders]);

    // ============================================
    // Settlement
    // ============================================

    const handleSettlement = async () => {
        const order = orders.find(o => o.id === selectedOrderId);
        if (!order || !paymentMethod || committing) return;

        setCommitting(true);
        try {
            const res = await fetch(`/api/orders/${order.id}/payment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    method: paymentMethod,
                    amount: order.total
                })
            });

            const result = await res.json();
            if (!result.success) throw new Error(result.error || 'Payment failed');

            // Refresh list
            setSelectedOrderId(null);
            setShowConfirm(false);
            setPaymentMethod(null);
            setIsMobileDetailView(false);
            await fetchPendingOrders();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Error processing payment');
        } finally {
            setCommitting(false);
        }
    };

    if (!mounted) return null;

    const currentOrder = orders.find(o => o.id === selectedOrderId);

    const calculateBill = (items: LineItem[]) => {
        const subtotal = items.reduce((acc, item) => acc + (item.price * item.qty), 0);
        const tax = subtotal * 0.18; // Logic matching UI (18%)
        return { subtotal, tax, total: subtotal + tax };
    };

    const selectMobileTable = (id: string) => {
        setSelectedOrderId(id);
        setIsMobileDetailView(true);
    };

    if (loading && orders.length === 0) {
        return (
            <div className="flex items-center justify-center h-full w-full bg-[#F8F9FA]">
                <div className="w-8 h-8 border-4 border-zinc-200 border-t-zinc-900 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex h-full w-full bg-[#F8F9FA] overflow-hidden flex-col md:flex-row relative">

            {/* READY TO PAY QUEUE */}
            <aside className={`w-full md:w-80 lg:w-96 bg-white border-r border-zinc-200 flex flex-col shrink-0 transition-transform duration-300 ${isMobileDetailView ? '-translate-x-full md:translate-x-0' : 'translate-x-0'} absolute md:relative inset-0 md:inset-auto z-20`}>
                <div className="h-14 border-b border-zinc-100 flex items-center px-6 bg-zinc-50/50">
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em]">Pending_Settlements</span>
                </div>
                <div className="grow overflow-y-auto p-4 md:p-6 space-y-3 lg:space-y-4 hide-scrollbar pb-32">
                    {orders.map(order => (
                        <button
                            key={order.id}
                            onClick={() => {
                                if (window.innerWidth < 768) selectMobileTable(order.id);
                                else { setSelectedOrderId(order.id); setPaymentMethod(null); }
                            }}
                            className={`flex flex-col p-4 lg:p-6 rounded-2xl border-2 transition-all w-full text-left active:scale-[0.98] ${selectedOrderId === order.id ? 'bg-zinc-900 border-zinc-900 text-white shadow-xl' : 'bg-white border-zinc-100 text-zinc-900 hover:border-zinc-300'}`}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <span className="text-3xl lg:text-4xl font-black tracking-tighter uppercase">{order.tableCode}</span>
                                <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-widest ${selectedOrderId === order.id ? 'bg-red-500 text-white' : 'bg-red-50 text-red-500 border border-red-100'}`}>PAID_PENDING</span>
                            </div>
                            <div className="flex justify-between items-end">
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-bold opacity-40 uppercase tracking-widest leading-none mb-1">Ref</span>
                                    <span className="text-xs font-bold truncate leading-none uppercase">{order.shortId}</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-xl lg:text-2xl font-black tabular-nums tracking-tighter">₹{order.total.toLocaleString()}</span>
                                </div>
                            </div>
                        </button>
                    ))}
                    {orders.length === 0 && (
                        <div className="p-12 text-center text-zinc-300 italic text-sm border-2 border-dashed border-zinc-100 rounded-2xl w-full">
                            All accounts cleared.
                        </div>
                    )}
                </div>
            </aside>

            {/* SETTLEMENT PANEL */}
            <main className={`grow overflow-y-auto flex flex-col bg-white transition-transform duration-300 ${isMobileDetailView ? 'translate-x-0' : 'translate-x-full md:translate-x-0'} absolute md:relative inset-0 md:inset-auto z-30`}>
                {currentOrder ? (
                    <div className="flex flex-col h-full bg-white">
                        <div className="p-4 md:p-8 lg:p-10 border-b border-zinc-100 flex justify-between items-center md:items-end bg-white sticky top-0 md:relative z-10 shadow-sm md:shadow-none">
                            <div className="flex items-center gap-4">
                                <button onClick={() => setIsMobileDetailView(false)} className="md:hidden w-10 h-10 rounded-xl border border-zinc-200 flex items-center justify-center text-zinc-900">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="15 18 9 12 15 6"></polyline></svg>
                                </button>
                                <div className="space-y-0.5 md:space-y-1">
                                    <h2 className="text-2xl md:text-5xl lg:text-7xl font-black tracking-tighter leading-none uppercase">SETTLE_{currentOrder.tableCode}</h2>
                                    <p className="hidden md:block text-[10px] md:text-xs font-bold text-zinc-400 uppercase tracking-widest italic leading-none">ID_{currentOrder.id.slice(0, 12).toUpperCase()}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-[8px] md:text-[10px] font-black text-zinc-300 uppercase tracking-widest leading-none block md:mb-1">Payment Requested</span>
                                <p className="text-sm md:text-xl font-bold uppercase tabular-nums">
                                    {new Date(currentOrder.requestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>

                        <div className="grow grid grid-cols-1 lg:grid-cols-2 overflow-y-auto">
                            {/* ITEMIZATION */}
                            <div className="p-6 md:p-8 lg:p-10 border-b lg:border-b-0 lg:border-r border-zinc-100 bg-white">
                                <span className="text-[10px] font-black text-zinc-300 uppercase tracking-[0.4em] mb-6 md:mb-8 block">Itemized_ledger</span>
                                <div className="space-y-5 md:space-y-6">
                                    {currentOrder.items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-start">
                                            <div className="flex items-start gap-4">
                                                <div className="w-8 h-8 rounded-lg border border-zinc-100 flex items-center justify-center font-black text-xs text-zinc-400 shrink-0">{item.qty}</div>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-base md:text-lg text-zinc-900 leading-tight">{item.name}</span>
                                                    <span className="text-[9px] font-bold text-zinc-300 uppercase tabular-nums tracking-widest">@ ₹{item.price.toLocaleString()}</span>
                                                </div>
                                            </div>
                                            <span className="text-base md:text-lg font-black tabular-nums tracking-tighter text-zinc-900">₹{(item.price * item.qty).toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-10 md:mt-12 pt-8 border-t border-dashed border-zinc-200 space-y-2 md:space-y-3">
                                    <div className="flex justify-between items-baseline pt-4">
                                        <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.3em] text-zinc-400">Net_Settle</span>
                                        <span className="text-4xl md:text-5xl lg:text-6xl font-black tabular-nums tracking-tighter text-[#D43425]">₹{currentOrder.total.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            {/* SETTLEMENT ACTIONS */}
                            <div className="p-6 md:p-8 lg:p-10 bg-zinc-50/50 flex flex-col pb-32 lg:pb-10">
                                <span className="text-[10px] font-black text-zinc-300 uppercase tracking-[0.4em] mb-6 md:mb-8 block italic">Payment_Orchestration</span>

                                <div className="grid grid-cols-1 gap-3 md:gap-4 grow">
                                    {[
                                        { id: 'UPI', label: 'DIGITAL_UPI', icon: 'M5 13l4 4L19 7' },
                                        { id: 'CARD', label: 'FINANCE_CARD', icon: 'M3 10h18M7 15h1m4 0h1m4 0h1M5 5h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z' },
                                        { id: 'CASH', label: 'PHYSICAL_CASH', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z' }
                                    ].map(method => (
                                        <button
                                            key={method.id}
                                            onClick={() => setPaymentMethod(method.id as any)}
                                            className={`flex items-center justify-between p-4 md:p-6 rounded-2xl border-2 transition-all active:scale-[0.98] ${paymentMethod === method.id ? 'bg-white border-zinc-900 shadow-xl' : 'bg-white border-zinc-200 text-zinc-400 hover:border-zinc-400'}`}
                                        >
                                            <div className="flex items-center gap-4 md:gap-6">
                                                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center transition-all ${paymentMethod === method.id ? 'bg-zinc-900 text-white shadow-lg' : 'bg-zinc-100 text-zinc-400'}`}>
                                                    <svg width="20" height="20" className="md:w-[24px] md:h-[24px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d={method.icon} /></svg>
                                                </div>
                                                <span className={`text-xs md:text-sm font-black uppercase tracking-[0.2em] md:tracking-[0.3em] ${paymentMethod === method.id ? 'text-zinc-900' : 'text-zinc-400'}`}>{method.label}</span>
                                            </div>
                                            <div className={`w-5 h-5 md:w-6 md:h-6 rounded-full border-2 flex items-center justify-center transition-all ${paymentMethod === method.id ? 'border-zinc-900 bg-zinc-900 shadow-inner' : 'border-zinc-200'}`}>
                                                {paymentMethod === method.id && <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-white transition-all scale-100" />}
                                            </div>
                                        </button>
                                    ))}
                                </div>

                                <div className="mt-8 md:mt-12 fixed md:relative bottom-4 left-4 right-4 md:bottom-auto md:left-auto md:right-auto z-40">
                                    <button
                                        disabled={!paymentMethod || committing}
                                        onClick={() => setShowConfirm(true)}
                                        className={`w-full h-16 md:h-20 rounded-2xl md:rounded-3xl flex items-center justify-center gap-4 text-xs font-black uppercase tracking-[0.4em] transition-all shadow-xl ${paymentMethod ? 'bg-[#D43425] text-white hover:bg-black active:scale-95 shadow-[#D43425]/20' : 'bg-zinc-200 text-zinc-400 cursor-not-allowed shadow-none'}`}
                                    >
                                        {committing ? 'PROCESSING...' : paymentMethod === 'CASH' ? 'FINALIZE_CASH' : 'COMMIT_PAYMENT'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex items-center justify-center p-10 md:p-20 text-center bg-white">
                        <div className="space-y-6 max-w-sm">
                            <div className="w-16 h-16 md:w-20 md:h-20 bg-zinc-50 rounded-full flex items-center justify-center mx-auto border border-zinc-100">
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#D1D1D1" strokeWidth="2"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"></path></svg>
                            </div>
                            <h3 className="text-lg md:text-xl font-black tracking-tighter uppercase text-zinc-900">Queue_Idle</h3>
                            <p className="text-[10px] md:text-sm font-bold text-zinc-300 leading-relaxed uppercase tracking-widest">Select a table from the settlement ingress to begin orchestration.</p>
                        </div>
                    </div>
                )}
            </main>

            {/* CONFIRMATION OVERLAY */}
            {showConfirm && currentOrder && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
                    <div className="w-full max-w-lg bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-8 md:p-10 space-y-6 md:space-y-8 text-center">
                            <div className="w-16 h-16 md:w-20 md:h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto border border-green-100 shadow-sm">
                                <svg className="w-8 h-8 md:w-10 md:h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            </div>
                            <div className="space-y-2">
                                <h4 className="text-[9px] md:text-[10px] font-black text-zinc-400 uppercase tracking-[0.4em]">Authorization_Needed</h4>
                                <p className="text-2xl md:text-3xl font-black tracking-tighter uppercase">Authorize {currentOrder.tableCode}?</p>
                                <div className="inline-flex items-center gap-2 bg-zinc-50 px-3 py-1.5 rounded-full border border-zinc-100">
                                    <span className="text-[8px] md:text-[10px] font-black text-zinc-900 uppercase tracking-widest">{paymentMethod}</span>
                                    <div className="w-1 h-1 bg-zinc-300 rounded-full" />
                                    <span className="text-[10px] md:text-xs font-black text-[#D43425] tabular-nums">₹{currentOrder.total.toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 md:gap-4 pt-4">
                                <button
                                    onClick={() => setShowConfirm(false)}
                                    className="h-14 md:h-16 rounded-xl border-2 border-zinc-100 text-zinc-900 text-[10px] md:text-xs font-black uppercase tracking-widest active:scale-95 transition-all"
                                >
                                    CANCEL
                                </button>
                                <button
                                    onClick={handleSettlement}
                                    disabled={committing}
                                    className="h-14 md:h-16 rounded-xl bg-black text-white text-[10px] md:text-xs font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-black/10 disabled:opacity-50"
                                >
                                    {committing ? '...' : 'CONFIRM'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style jsx global>{`
                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
}
