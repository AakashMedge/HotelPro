
'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
    id: string;
    shortId: string;
    tableCode: string;
    guestName: string;
    items: LineItem[];
    requestedAt: number;
    subtotal: number;
    gstAmount: number;
    serviceChargeAmount: number;
    grandTotal: number;
    total: number; // For backward compatibility in UI
    version: number;
};

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
    const [showReceipt, setShowReceipt] = useState(false);

    const fetchPendingOrders = useCallback(async () => {
        try {
            const res = await fetch('/api/orders?status=BILL_REQUESTED');
            const data = await res.json();
            if (!data.success) return;

            const pending = data.orders.map((o: any) => ({
                id: o.id,
                shortId: o.id.slice(0, 8).toUpperCase(),
                tableCode: o.tableCode.replace('T-', ''),
                guestName: o.customerName || `Guest @ ${o.tableCode}`,
                requestedAt: new Date(o.updatedAt).getTime(),
                version: o.version,
                subtotal: o.subtotal,
                gstAmount: o.gstAmount,
                serviceChargeAmount: o.serviceChargeAmount,
                grandTotal: o.grandTotal,
                total: o.grandTotal,
                items: o.items.map((item: any) => ({
                    id: item.id, name: item.itemName, qty: item.quantity, price: item.price
                }))
            }));
            setOrders(pending);
            if (pending.length > 0 && !selectedOrderId && window.innerWidth >= 1024) {
                setSelectedOrderId(pending[0].id);
            }
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [selectedOrderId]);

    useEffect(() => {
        setMounted(true);
        fetchPendingOrders();
        const interval = setInterval(fetchPendingOrders, 10000);
        return () => clearInterval(interval);
    }, [fetchPendingOrders]);

    const handleSettlement = async () => {
        const order = orders.find(o => o.id === selectedOrderId);
        if (!order || !paymentMethod || committing) return;
        setCommitting(true);
        try {
            const res = await fetch(`/api/orders/${order.id}/payment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ method: paymentMethod, amount: order.total })
            });
            if (res.ok) {
                setSelectedOrderId(null);
                setShowConfirm(false);
                setPaymentMethod(null);
                setIsMobileDetailView(false);
                setShowReceipt(true); // Show receipt after successful settlement
                await fetchPendingOrders();
            }
        } finally { setCommitting(false); }
    };

    const handlePrint = () => {
        window.print();
    };

    if (!mounted) return null;

    const currentOrder = orders.find(o => o.id === selectedOrderId);

    return (
        <div className="h-full bg-white flex flex-col lg:flex-row overflow-hidden relative font-sans">

            {/* PRINTER FRIENDLY LAYER (Only visible during print) */}
            <div className="hidden print:block fixed inset-0 bg-white z-999 p-10 text-black font-mono">
                {currentOrder && (
                    <div className="max-w-xs mx-auto border border-zinc-200 p-6 space-y-4">
                        <div className="text-center border-b pb-4">
                            <h1 className="text-xl font-bold">HOTELPRO ROYAL</h1>
                            <p className="text-[10px]">Tax Invoice / Guest Bill</p>
                        </div>
                        <div className="flex justify-between text-[10px]">
                            <span>Table: {currentOrder.tableCode}</span>
                            <span>{new Date().toLocaleDateString()}</span>
                        </div>
                        <div className="border-b py-2 space-y-1">
                            {currentOrder.items.map((item, i) => (
                                <div key={i} className="flex justify-between text-xs">
                                    <span>{item.qty} x {item.name}</span>
                                    <span>₹{(item.price * item.qty).toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                        <div className="py-2 border-b space-y-1 text-[10px]">
                            <div className="flex justify-between">
                                <span>Sub-Total</span>
                                <span>₹{currentOrder.subtotal.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>GST</span>
                                <span>₹{currentOrder.gstAmount.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Service Charge</span>
                                <span>₹{currentOrder.serviceChargeAmount.toLocaleString()}</span>
                            </div>
                        </div>
                        <div className="pt-2 flex justify-between font-bold text-sm">
                            <span>TOTAL</span>
                            <span>₹{currentOrder.grandTotal.toLocaleString()}</span>
                        </div>
                        <div className="text-center pt-10 text-[8px] opacity-40 uppercase">
                            Thank you for dining with us
                        </div>
                    </div>
                )}
            </div>

            {/* INGRESS QUEUE */}
            <aside className={`w-full lg:w-96 border-r border-zinc-100 flex flex-col shrink-0 transition-all duration-300 ${isMobileDetailView ? '-translate-x-full lg:translate-x-0' : 'translate-x-0'} absolute lg:relative inset-0 lg:inset-auto z-20 bg-[#FDFCF9]`}>
                <div className="p-8 border-b border-zinc-100 shrink-0 bg-white">
                    <h1 className="text-3xl font-black text-[#111111] tracking-tighter uppercase">Settlements</h1>
                    <div className="flex items-center gap-2 mt-2">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{orders.length} In-Queue</p>
                    </div>
                </div>
                <div className="grow overflow-y-auto p-4 space-y-3 no-scrollbar pb-32">
                    {orders.map(order => (
                        <button
                            key={order.id}
                            onClick={() => {
                                setSelectedOrderId(order.id);
                                if (window.innerWidth < 1024) setIsMobileDetailView(true);
                            }}
                            className={`w-full p-6 rounded-4xl border-2 transition-all text-left flex flex-col ${selectedOrderId === order.id ? 'bg-[#111111] border-[#111111] shadow-xl text-white' : 'bg-white border-zinc-100 hover:border-zinc-300'}`}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <span className={`text-4xl font-black tracking-tighter ${selectedOrderId === order.id ? 'text-white' : 'text-[#111111]'}`}>T-{order.tableCode}</span>
                                <span className="text-[10px] font-bold uppercase opacity-30">{order.shortId}</span>
                            </div>
                            <div className="flex justify-between items-end">
                                <div>
                                    <p className={`text-[10px] font-bold uppercase tracking-widest ${selectedOrderId === order.id ? 'text-white/40' : 'text-zinc-300'}`}>Guest Identity</p>
                                    <p className={`font-black text-sm uppercase truncate max-w-[150px] ${selectedOrderId === order.id ? 'text-white' : 'text-zinc-700'}`}>{order.guestName}</p>
                                </div>
                                <div className="text-right">
                                    <span className={`text-2xl font-black tabular-nums ${selectedOrderId === order.id ? 'text-[#D43425]' : 'text-[#111111]'}`}>₹{order.total}</span>
                                </div>
                            </div>
                        </button>
                    ))}
                    {orders.length === 0 && (
                        <div className="py-24 text-center opacity-10">
                            <p className="text-4xl font-black uppercase tracking-tighter">Vault Clear</p>
                        </div>
                    )}
                </div>
            </aside>

            {/* SETTLEMENT PANEL */}
            <main className={`grow flex flex-col bg-white transition-all duration-300 ${isMobileDetailView ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'} absolute lg:relative inset-0 lg:inset-auto z-30`}>
                {currentOrder ? (
                    <div className="h-full flex flex-col overflow-hidden">
                        <header className="p-8 border-b border-zinc-100 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-6">
                                <button onClick={() => setIsMobileDetailView(false)} className="lg:hidden p-3 bg-zinc-50 rounded-full">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="15 18 9 12 15 6"></polyline></svg>
                                </button>
                                <div>
                                    <h2 className="text-3xl font-black text-[#111111] tracking-tighter uppercase">Settlement Unit: {currentOrder.tableCode}</h2>
                                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-[0.2em] mt-1 italic">Verified session: {currentOrder.id}</p>
                                </div>
                            </div>
                            <button onClick={handlePrint} className="p-4 bg-zinc-50 rounded-2xl hover:bg-zinc-100 transition-all font-black text-[10px] uppercase tracking-widest">Print Ticket</button>
                        </header>

                        <div className="grow overflow-y-auto lg:flex">
                            {/* BILL DETAILS */}
                            <div className="flex-1 p-10 border-b lg:border-b-0 lg:border-r border-zinc-50">
                                <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest block mb-8 underline decoration-zinc-100 underline-offset-8">Consolidated Ledger</span>
                                <div className="space-y-6">
                                    {currentOrder.items.map((item, idx) => (
                                        <div key={idx} className="flex items-center justify-between group">
                                            <div className="flex items-center gap-4">
                                                <div className="w-8 h-8 rounded-lg bg-zinc-50 flex items-center justify-center text-[10px] font-black">{item.qty}</div>
                                                <span className="text-sm font-black text-zinc-700 uppercase tracking-tight">{item.name}</span>
                                            </div>
                                            <span className="text-sm font-black text-[#111111] tabular-nums">₹{(item.price * item.qty).toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-16 pt-8 border-t border-zinc-100 space-y-3">
                                    <div className="flex justify-between text-xs font-bold text-zinc-400 uppercase tracking-widest">
                                        <span>Sub-Total</span>
                                        <span className="text-[#111111] tabular-nums">₹{currentOrder.subtotal.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-xs font-bold text-zinc-400 uppercase tracking-widest">
                                        <span>GST</span>
                                        <span className="text-[#111111] tabular-nums">₹{currentOrder.gstAmount.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-xs font-bold text-zinc-400 uppercase tracking-widest">
                                        <span>Service Charge</span>
                                        <span className="text-[#111111] tabular-nums">₹{currentOrder.serviceChargeAmount.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-baseline pt-4 border-t-2 border-dashed border-zinc-100 mt-4">
                                        <span className="text-xs font-black text-[#D43425] uppercase tracking-widest">Total Valuation</span>
                                        <span className="text-5xl font-black tracking-tighter text-[#111111]">₹{currentOrder.grandTotal.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            {/* PAYMENT INTERFACE */}
                            <div className="flex-1 p-10 bg-zinc-50/50 pb-40 lg:pb-10">
                                <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest block mb-8 underline decoration-zinc-100 underline-offset-8">Authorization Method</span>
                                <div className="grid grid-cols-1 gap-4">
                                    {[
                                        { id: 'UPI', label: 'UPI Quantum Scan', color: 'bg-indigo-600' },
                                        { id: 'CARD', label: 'Card Transact', color: 'bg-zinc-900' },
                                        { id: 'CASH', label: 'Cash Tendered', color: 'bg-green-600' }
                                    ].map(method => (
                                        <button
                                            key={method.id}
                                            onClick={() => setPaymentMethod(method.id as any)}
                                            className={`relative p-6 rounded-4xl border-2 flex items-center gap-6 transition-all ${paymentMethod === method.id ? 'bg-white border-[#111111] shadow-2xl -translate-y-1' : 'bg-white border-zinc-50 text-zinc-300'}`}
                                        >
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white ${paymentMethod === method.id ? method.color : 'bg-zinc-100'}`}>
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                    {method.id === 'UPI' && <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />}
                                                    {method.id === 'CARD' && <rect x="2" y="5" width="20" height="14" rx="2" />}
                                                    {method.id === 'CASH' && <circle cx="12" cy="12" r="10" />}
                                                </svg>
                                            </div>
                                            <div className="text-left">
                                                <span className={`text-[11px] font-black uppercase tracking-widest ${paymentMethod === method.id ? 'text-[#111111]' : 'text-zinc-400'}`}>{method.label}</span>
                                                <p className="text-[9px] font-bold opacity-40 uppercase tracking-widest">Certified & Secure</p>
                                            </div>
                                            {paymentMethod === method.id && (
                                                <div className="ml-auto w-4 h-4 rounded-full bg-[#111111]" />
                                            )}
                                        </button>
                                    ))}
                                </div>

                                <div className="mt-12">
                                    <button
                                        disabled={!paymentMethod || committing}
                                        onClick={() => setShowConfirm(true)}
                                        className={`w-full h-20 rounded-[2.5rem] text-xs font-black uppercase tracking-[0.4em] transition-all ${paymentMethod ? 'bg-[#111111] text-white hover:bg-black shadow-[0_20px_40px_rgba(0,0,0,0.1)]' : 'bg-zinc-100 text-zinc-300'}`}
                                    >
                                        {committing ? 'Processing Quantum...' : 'Finalize Authorization'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center p-20 text-center">
                        <div className="w-24 h-24 bg-zinc-50 rounded-[2.5rem] flex items-center justify-center mb-6 border border-zinc-100">
                            <div className="w-2 h-2 rounded-full bg-zinc-200 animate-pulse" />
                        </div>
                        <h3 className="text-xl font-black text-zinc-300 uppercase tracking-tighter">Quantum Ingress Empty</h3>
                        <p className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest mt-2 max-w-[200px]">Waiting for staff to signal bill requests.</p>
                    </div>
                )}
            </main>

            {/* CONFIRMATION / MOCK PAYMENT OVERLAY */}
            <AnimatePresence>
                {showConfirm && currentOrder && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-zinc-950/90 backdrop-blur-xl z-200 flex items-center justify-center p-6">
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-sm bg-white rounded-[3rem] p-10 shadow-2xl">
                            {/* MOCK PAYMENT SIMULATION */}
                            {committing ? (
                                <div className="text-center py-10 space-y-6">
                                    <div className="w-16 h-16 border-4 border-zinc-100 border-t-[#D43425] rounded-full animate-spin mx-auto" />
                                    <h3 className="text-xl font-black uppercase tracking-tighter">Syncing Gateway...</h3>
                                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Handshaking with Banking System</p>
                                </div>
                            ) : (
                                <>
                                    <div className="text-center mb-8">
                                        <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#111111" strokeWidth="3"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                                        </div>
                                        <h3 className="text-2xl font-black tracking-tighter uppercase mb-2">Authorize Tender?</h3>
                                        <p className="text-[10px] font-black text-[#D43425] uppercase tracking-widest">Table {currentOrder.tableCode} &bull; ₹{currentOrder.total}</p>
                                    </div>
                                    <div className="grid grid-cols-1 gap-3">
                                        <button onClick={handleSettlement} className="h-16 rounded-2xl bg-[#111111] text-white text-[11px] font-black uppercase tracking-[0.3em] shadow-xl">Commit Transaction</button>
                                        <button onClick={() => setShowConfirm(false)} className="h-14 rounded-2xl font-black text-zinc-300 text-[10px] uppercase tracking-widest">Abort</button>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* SETTLEMENT SUCCESS NOTIFICATION */}
            <AnimatePresence>
                {showReceipt && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed top-8 left-1/2 -translate-x-1/2 z-100 flex items-center gap-4 bg-[#111111] text-white px-8 py-4 rounded-full shadow-2xl border border-white/10">
                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Transaction Committed &bull; Session Terminated</span>
                        <button onClick={() => setShowReceipt(false)} className="ml-4 opacity-40 hover:opacity-100 text-[10px] font-bold uppercase tracking-widest">Dismiss</button>
                    </motion.div>
                )}
            </AnimatePresence>

            <style jsx global>{`
                @media print {
                    body * { visibility: hidden; }
                    .print\:block, .print\:block * { visibility: visible; }
                }
            `}</style>
        </div>
    );
}
