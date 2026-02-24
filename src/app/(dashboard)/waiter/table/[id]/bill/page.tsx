'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronLeft,
    Receipt,
    User,
    Percent,
    ShieldCheck,
    Calculator,
    Send,
    AlertCircle,
    Banknote,
    QrCode,
    CheckCircle2,
    Loader2,
} from 'lucide-react';

// ============================================
// Types
// ============================================

interface BillItem {
    id: string;
    name: string;
    qty: number;
    price: number;
    notes?: string;
}

interface BillData {
    orderId: string;
    tableCode: string;
    guest: string;
    orderTime: string;
    status: string;
    version: number;
    items: BillItem[];
    subtotal: number;
    gstAmount: number;
    serviceChargeAmount: number;
    grandTotal: number;
    appliedGstRate: number;
}

type PaymentStep = 'preview' | 'choose' | 'upi_confirm' | 'success';

// ============================================
// Component
// ============================================

export default function BillPreview() {
    const { id: tableId } = useParams();
    const router = useRouter();

    const [bill, setBill] = useState<BillData | null>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [plan, setPlan] = useState<string>(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('hp_hotel_plan') || 'STARTER';
        }
        return 'STARTER';
    });

    // Payment flow state
    const [paymentStep, setPaymentStep] = useState<PaymentStep>('preview');
    const [selectedMethod, setSelectedMethod] = useState<'CASH' | 'UPI' | null>(null);

    // Bill adjustments
    const [gstEnabled, setGstEnabled] = useState(true);
    const [discountPercent, setDiscountPercent] = useState(0);
    const [guestName, setGuestName] = useState('');
    const [guestPhone, setGuestPhone] = useState('');

    // ── Fetch bill data ──
    const fetchBill = useCallback(async () => {
        try {
            const [tablesRes, ordersRes, userRes] = await Promise.all([
                fetch('/api/tables'),
                fetch('/api/orders?status=NEW,PREPARING,READY,SERVED,BILL_REQUESTED'),
                fetch('/api/auth/me'),
            ]);

            const [tablesData, ordersData, userData] = await Promise.all([
                tablesRes.json(),
                ordersRes.json(),
                userRes.json(),
            ]);

            // Extract plan from user data
            console.log('[BILL DEBUG] User data:', userData.success, 'Plan:', userData.user?.plan);
            if (userData.success && userData.user?.plan) {
                setPlan(userData.user.plan);
                localStorage.setItem('hp_hotel_plan', userData.user.plan);
            }

            const table = tablesData.tables?.find((t: any) => t.id === tableId);
            if (!table) throw new Error('Table not found');

            const order = ordersData.orders?.find((o: any) => o.tableId === tableId);
            if (!order) { setBill(null); return; }

            const itemTotal = order.items.reduce(
                (sum: number, item: any) => sum + Number(item.priceSnapshot || item.price) * item.quantity, 0
            );

            setBill({
                orderId: order.id,
                tableCode: table.tableCode,
                guest: order.customerName || `Guest @ ${table.tableCode}`,
                orderTime: new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                status: order.status,
                version: order.version,
                items: order.items.map((item: any) => ({
                    id: item.id,
                    name: item.itemName,
                    qty: item.quantity,
                    price: Number(item.priceSnapshot || item.price),
                    notes: item.notes,
                })),
                subtotal: Number(order.subtotal || itemTotal),
                gstAmount: Number(order.gstAmount || 0),
                serviceChargeAmount: Number(order.serviceChargeAmount || 0),
                grandTotal: Number(order.grandTotal || itemTotal),
                appliedGstRate: Number(order.appliedGstRate || 5),
            });
        } catch (err) {
            console.error('[BILL] Fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, [tableId]);

    useEffect(() => {
        fetchBill();
        const interval = setInterval(fetchBill, 5000);
        return () => clearInterval(interval);
    }, [fetchBill]);

    useEffect(() => {
        if (bill && bill.guest && bill.guest !== `Guest @ ${bill.tableCode}`) {
            setGuestName(bill.guest);
        }
    }, [bill]);

    // ── Totals ──
    const totals = useMemo(() => {
        if (!bill) return null;
        const subtotal = bill.subtotal;
        const discountAmount = subtotal * (discountPercent / 100);
        const netAfterDiscount = subtotal - discountAmount;
        const gstRate = gstEnabled ? (bill.appliedGstRate || 5) : 0;
        const gstAmount = netAfterDiscount * (gstRate / 100);
        const serviceChargeRate = 5;
        const serviceChargeAmount = netAfterDiscount * (serviceChargeRate / 100);
        const grandTotal = netAfterDiscount + gstAmount + serviceChargeAmount;
        return { subtotal, discountAmount, netAfterDiscount, gstAmount, serviceChargeAmount, grandTotal, gstRate };
    }, [bill, gstEnabled, discountPercent]);

    const isStarter = plan === 'STARTER';

    // ── Send to cashier (GROWTH/ELITE) ──
    const sendToCashier = async () => {
        if (!bill || !totals || processing) return;
        setProcessing(true);
        try {
            const res = await fetch(`/api/orders/${bill.orderId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: 'BILL_REQUESTED',
                    version: bill.version,
                    customerName: guestName.trim() || undefined,
                    customerPhone: guestPhone.trim() || undefined,
                    subtotal: totals.subtotal,
                    discountAmount: totals.discountAmount,
                    gstAmount: totals.gstAmount,
                    serviceChargeAmount: totals.serviceChargeAmount,
                    grandTotal: totals.grandTotal,
                    appliedGstRate: totals.gstRate,
                }),
            });
            if (!res.ok) {
                const d = await res.json();
                throw new Error(d.error || 'Failed');
            }
            setNotification({ type: 'success', message: 'Bill dispatched to cashier' });
            setTimeout(() => router.push(`/waiter/table/${tableId}`), 1800);
        } catch (err) {
            setNotification({ type: 'error', message: err instanceof Error ? err.message : 'Error' });
        } finally { setProcessing(false); }
    };

    // ── Collect payment directly (STARTER) ──
    const collectPayment = async (method: 'CASH' | 'UPI') => {
        if (!bill || !totals || processing) return;
        setProcessing(true);

        try {
            let currentVersion = bill.version;

            // If not already bill-requested, patch the order with final amounts first
            if (bill.status !== 'BILL_REQUESTED') {
                const patchRes = await fetch(`/api/orders/${bill.orderId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        status: 'BILL_REQUESTED',
                        version: currentVersion,
                        customerName: guestName.trim() || undefined,
                        customerPhone: guestPhone.trim() || undefined,
                        subtotal: totals.subtotal,
                        discountAmount: totals.discountAmount,
                        gstAmount: totals.gstAmount,
                        serviceChargeAmount: totals.serviceChargeAmount,
                        grandTotal: totals.grandTotal,
                        appliedGstRate: totals.gstRate,
                    }),
                });
                const patchData = await patchRes.json();
                // Use version from patch response to avoid conflict
                currentVersion = patchData.order?.version ?? (currentVersion + 1);
            }

            // Then process payment
            const res = await fetch(`/api/orders/${bill.orderId}/payment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ method, amount: Math.round(totals.grandTotal) }),
            });

            if (!res.ok) {
                const d = await res.json();
                throw new Error(d.error || 'Payment failed');
            }

            setPaymentStep('success');
            setTimeout(() => router.push('/waiter'), 2500);
        } catch (err) {
            setNotification({ type: 'error', message: err instanceof Error ? err.message : 'Payment error' });
            setProcessing(false);
        }
    };

    // ── Guard: Loading ──
    if (loading) return (
        <div className="h-full flex items-center justify-center bg-[#FDFCF9]">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-300" />
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Loading Bill...</span>
            </div>
        </div>
    );

    if (!bill || !totals) return (
        <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-[#FDFCF9]">
            <AlertCircle size={32} className="text-zinc-200 mb-4" />
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-6">No active order</p>
            <button onClick={() => router.push('/waiter')} className="px-8 py-3 bg-zinc-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest">Back to Floor</button>
        </div>
    );

    const alreadyClosed = bill.status === 'CLOSED';

    // ────────────────────────────────────────
    // SUCCESS STATE
    // ────────────────────────────────────────
    if (paymentStep === 'success') return (
        <div className="h-full flex flex-col items-center justify-center bg-[#FDFCF9] p-8">
            <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center gap-6 text-center"
            >
                <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center shadow-xl shadow-emerald-200">
                    <CheckCircle2 size={48} className="text-white" strokeWidth={2} />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-zinc-900 uppercase tracking-tighter">Payment Received!</h2>
                    <p className="text-[11px] text-zinc-400 mt-1 uppercase tracking-widest">Table {bill.tableCode} · ₹{Math.round(totals.grandTotal).toLocaleString()} collected</p>
                </div>
                <p className="text-xs text-zinc-400">Returning to floor...</p>
            </motion.div>
        </div>
    );

    // ────────────────────────────────────────
    // STARTER: UPI CONFIRM STEP
    // ────────────────────────────────────────
    if (isStarter && paymentStep === 'upi_confirm') return (
        <div className="h-full flex flex-col items-center justify-center bg-[#FDFCF9] p-6">
            <AnimatePresence>
                {notification && (
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl shadow-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2 ${notification.type === 'success' ? 'bg-zinc-900 text-white' : 'bg-red-500 text-white'}`}>
                        {notification.message}
                    </motion.div>
                )}
            </AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-sm flex flex-col items-center gap-6"
            >
                <div className="w-16 h-16 bg-violet-100 rounded-3xl flex items-center justify-center">
                    <QrCode size={32} className="text-violet-600" />
                </div>
                <div className="text-center">
                    <h2 className="text-xl font-black text-zinc-900 uppercase tracking-tighter">UPI Payment</h2>
                    <p className="text-[11px] text-zinc-400 mt-1">Show your UPI QR to the customer</p>
                </div>

                {/* Amount to collect */}
                <div className="w-full bg-zinc-900 rounded-3xl p-6 text-center">
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Amount to Collect</p>
                    <p className="text-4xl font-black text-white">₹{Math.round(totals.grandTotal).toLocaleString()}</p>
                    <p className="text-[9px] text-zinc-500 mt-1">Table {bill.tableCode}</p>
                </div>

                <div className="w-full bg-violet-50 border border-violet-200 rounded-2xl p-4 text-center">
                    <p className="text-xs font-bold text-violet-700">📱 Show your hotel's UPI QR code to the customer and wait for confirmation</p>
                </div>

                {/* Confirm button */}
                <button
                    onClick={() => collectPayment('UPI')}
                    disabled={processing}
                    className="w-full py-5 bg-violet-600 text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-violet-200 active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-3"
                >
                    {processing ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                    {processing ? 'Processing...' : 'Payment Received — Confirm'}
                </button>
                <button
                    onClick={() => setPaymentStep('choose')}
                    disabled={processing}
                    className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest hover:text-zinc-700 transition-colors"
                >
                    ← Back
                </button>
            </motion.div>
        </div>
    );

    // ────────────────────────────────────────
    // STARTER: CHOOSE PAYMENT METHOD
    // ────────────────────────────────────────
    if (isStarter && paymentStep === 'choose') return (
        <div className="h-full flex flex-col items-center justify-center bg-[#FDFCF9] p-6">
            <AnimatePresence>
                {notification && (
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl shadow-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2 ${notification.type === 'success' ? 'bg-zinc-900 text-white' : 'bg-red-500 text-white'}`}>
                        {notification.message}
                    </motion.div>
                )}
            </AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-sm flex flex-col gap-6"
            >
                <div className="text-center">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Table {bill.tableCode}</p>
                    <h2 className="text-2xl font-black text-zinc-900 uppercase tracking-tighter">Collect Payment</h2>
                    <p className="text-3xl font-black text-zinc-900 mt-2">₹{Math.round(totals.grandTotal).toLocaleString()}</p>
                </div>

                {/* Item summary */}
                <div className="bg-white border border-zinc-100 rounded-2xl p-4 space-y-2 max-h-40 overflow-y-auto no-scrollbar">
                    {bill.items.map((item, i) => (
                        <div key={i} className="flex justify-between text-xs">
                            <span className="font-medium text-zinc-600">{item.qty}× {item.name}</span>
                            <span className="font-bold text-zinc-900">₹{(item.price * item.qty).toLocaleString()}</span>
                        </div>
                    ))}
                    {totals.discountAmount > 0 && (
                        <div className="flex justify-between text-xs text-green-600">
                            <span>Discount ({discountPercent}%)</span>
                            <span>- ₹{totals.discountAmount.toFixed(0)}</span>
                        </div>
                    )}
                    {gstEnabled && (
                        <div className="flex justify-between text-xs text-zinc-400">
                            <span>GST ({totals.gstRate}%)</span>
                            <span>₹{totals.gstAmount.toFixed(0)}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-xs text-zinc-400">
                        <span>Service Charge (5%)</span>
                        <span>₹{totals.serviceChargeAmount.toFixed(0)}</span>
                    </div>
                </div>

                {/* Payment method buttons */}
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => collectPayment('CASH')}
                        disabled={processing}
                        className="flex flex-col items-center gap-3 p-6 bg-emerald-500 text-white rounded-3xl shadow-xl shadow-emerald-200 active:scale-95 transition-all disabled:opacity-60"
                    >
                        {processing && selectedMethod === 'CASH'
                            ? <Loader2 size={28} className="animate-spin" />
                            : <Banknote size={28} />
                        }
                        <span className="text-sm font-black uppercase tracking-wide">Cash</span>
                    </button>

                    <button
                        onClick={() => { setSelectedMethod('UPI'); setPaymentStep('upi_confirm'); }}
                        disabled={processing}
                        className="flex flex-col items-center gap-3 p-6 bg-violet-600 text-white rounded-3xl shadow-xl shadow-violet-200 active:scale-95 transition-all disabled:opacity-60"
                    >
                        <QrCode size={28} />
                        <span className="text-sm font-black uppercase tracking-wide">UPI / QR</span>
                    </button>
                </div>

                <button
                    onClick={() => setPaymentStep('preview')}
                    className="text-center text-[10px] font-bold text-zinc-400 uppercase tracking-widest hover:text-zinc-700 transition-colors"
                >
                    ← Edit Bill
                </button>
            </motion.div>
            <style>{`.no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}`}</style>
        </div>
    );

    // ────────────────────────────────────────
    // MAIN: BILL PREVIEW (both plans)
    // ────────────────────────────────────────
    return (
        <div className="h-full flex flex-col md:flex-row bg-[#FDFCF9] overflow-hidden relative">

            {/* NOTIFICATION */}
            <AnimatePresence>
                {notification && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                        className={`absolute top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl shadow-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 ${notification.type === 'success' ? 'bg-zinc-900 text-white' : 'bg-red-500 text-white'}`}
                    >
                        {notification.type === 'success' ? <ShieldCheck size={14} /> : <AlertCircle size={14} />}
                        {notification.message}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* LEFT: SETTINGS & ADJUSTMENTS */}
            <div className={`flex-1 flex flex-col min-w-0 overflow-y-auto no-scrollbar p-4 md:p-8 space-y-6 ${alreadyClosed ? 'opacity-50 pointer-events-none' : ''}`}>

                {/* HEADER */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push(`/waiter/table/${tableId}`)}
                        className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-white border border-zinc-100 flex items-center justify-center text-zinc-400 hover:text-zinc-900 transition-all shadow-sm shrink-0"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl md:text-2xl font-black text-zinc-900 tracking-tighter uppercase">Bill Preview</h1>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Table {bill.tableCode} · {bill.orderTime}</p>
                    </div>
                    {isStarter && (
                        <span className="ml-auto text-[9px] font-black text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full uppercase tracking-wider">
                            Starter Plan
                        </span>
                    )}
                </div>

                {/* GUEST INFO */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-5 rounded-3xl border border-zinc-100 shadow-sm space-y-3">
                        <div className="flex items-center gap-2">
                            <User size={13} className="text-zinc-300" />
                            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Guest Info</span>
                        </div>
                        <input
                            type="text" placeholder="Guest Name (optional)"
                            value={guestName} onChange={(e) => setGuestName(e.target.value)}
                            className="w-full bg-zinc-50 border-none px-4 py-3 rounded-xl text-xs font-bold outline-none focus:ring-2 ring-zinc-900/5 transition-all"
                        />
                        <input
                            type="tel" placeholder="Phone (optional)"
                            value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)}
                            className="w-full bg-zinc-50 border-none px-4 py-3 rounded-xl text-xs font-bold outline-none focus:ring-2 ring-zinc-900/5 transition-all"
                        />
                    </div>

                    <div className="bg-white p-5 rounded-3xl border border-zinc-100 shadow-sm space-y-4">
                        <div className="flex items-center gap-2">
                            <Calculator size={13} className="text-zinc-300" />
                            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Adjustments</span>
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-black text-zinc-900 uppercase">Apply GST</p>
                                <p className="text-[9px] font-bold text-zinc-400">{bill.appliedGstRate}% tax</p>
                            </div>
                            <button
                                onClick={() => setGstEnabled(!gstEnabled)}
                                className={`w-11 h-6 rounded-full relative transition-all duration-300 ${gstEnabled ? 'bg-zinc-900' : 'bg-zinc-200'}`}
                            >
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${gstEnabled ? 'left-6' : 'left-1'}`} />
                            </button>
                        </div>

                        <div className="space-y-2">
                            <p className="text-xs font-black text-zinc-900 uppercase">Discount %</p>
                            <div className="relative">
                                <Percent size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-300" />
                                <input
                                    type="number" min="0" max="100" value={discountPercent}
                                    onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, Number(e.target.value))))}
                                    className="w-full bg-zinc-50 border-none pl-9 pr-4 py-2.5 rounded-xl text-xs font-black outline-none focus:ring-2 ring-zinc-900/5"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* ITEM BREAKDOWN */}
                <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm">
                    <h3 className="text-[10px] font-black text-zinc-300 uppercase tracking-widest mb-4">Order Items</h3>
                    <div className="space-y-3">
                        {bill.items.map((item, i) => (
                            <div key={i} className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-black text-zinc-300">×{item.qty}</span>
                                    <span className="text-xs font-bold text-zinc-900">{item.name}</span>
                                    {item.notes && <span className="text-[9px] text-amber-500 italic">📝 {item.notes}</span>}
                                </div>
                                <span className="text-xs font-bold text-zinc-500 tabular-nums">₹{(item.price * item.qty).toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* RIGHT: BILL SUMMARY PANEL */}
            <aside className="w-full md:w-[380px] lg:w-[420px] bg-zinc-900 flex flex-col shadow-2xl z-10 p-6 md:p-8 relative overflow-hidden shrink-0">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />

                <div className="relative flex flex-col h-full gap-6">
                    {/* Icon */}
                    <div className="flex justify-center pt-2">
                        <div className="p-3 bg-zinc-800 rounded-2xl text-white">
                            <Receipt size={28} strokeWidth={1.5} />
                        </div>
                    </div>

                    {/* Title */}
                    <div className="text-center">
                        <h2 className="text-lg font-black text-white uppercase tracking-tight">Live Bill</h2>
                        <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Table {bill.tableCode}</p>
                    </div>

                    {/* Breakdown */}
                    <div className="flex-1 space-y-3">
                        <div className="flex justify-between text-[11px] font-bold text-zinc-400">
                            <span className="uppercase tracking-widest">Subtotal</span>
                            <span className="text-white">₹{totals.subtotal.toLocaleString()}</span>
                        </div>
                        {totals.discountAmount > 0 && (
                            <div className="flex justify-between text-[11px] font-bold text-green-400">
                                <span>Discount ({discountPercent}%)</span>
                                <span>- ₹{totals.discountAmount.toFixed(0)}</span>
                            </div>
                        )}
                        <div className="h-px bg-zinc-800 border-t border-dashed border-zinc-700" />
                        <div className="flex justify-between text-[11px] font-bold text-zinc-400">
                            <span>GST ({totals.gstRate}%)</span>
                            <span className={gstEnabled ? 'text-white' : 'text-zinc-600 line-through'}>
                                ₹{totals.gstAmount.toFixed(0)}
                            </span>
                        </div>
                        <div className="flex justify-between text-[11px] font-bold text-zinc-400">
                            <span>Service (5%)</span>
                            <span className="text-white">₹{totals.serviceChargeAmount.toFixed(0)}</span>
                        </div>

                        {/* Grand Total */}
                        <div className="mt-6 p-6 bg-zinc-800 rounded-3xl border border-white/5">
                            <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-2">Total Payable</p>
                            <div className="flex items-baseline gap-1">
                                <span className="text-zinc-500 font-bold text-base">₹</span>
                                <h3 className="text-4xl md:text-5xl font-black text-white tracking-tighter">
                                    {Math.round(totals.grandTotal).toLocaleString()}
                                </h3>
                            </div>
                        </div>
                    </div>

                    {/* CTA BUTTONS */}
                    <div className="space-y-3">
                        {alreadyClosed ? (
                            <div className="w-full py-5 bg-zinc-800 text-green-400 rounded-3xl text-[11px] font-black uppercase tracking-widest text-center border border-green-400/20">
                                ✓ Order Closed
                            </div>
                        ) : isStarter ? (
                            /* STARTER: Go to payment collection */
                            <button
                                onClick={() => setPaymentStep('choose')}
                                disabled={processing}
                                className="w-full py-5 bg-white text-zinc-900 rounded-3xl text-[11px] font-black uppercase tracking-widest shadow-2xl hover:bg-zinc-100 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-40"
                            >
                                <Banknote size={18} />
                                Collect Payment
                            </button>
                        ) : (
                            /* GROWTH/ELITE: Send to cashier */
                            <button
                                onClick={sendToCashier}
                                disabled={processing || bill.status === 'BILL_REQUESTED'}
                                className="w-full py-5 bg-white text-zinc-900 rounded-3xl text-[11px] font-black uppercase tracking-widest shadow-2xl hover:bg-zinc-100 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-40"
                            >
                                {processing ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                                {bill.status === 'BILL_REQUESTED' ? '✓ Dispatched to Cashier' : processing ? 'Sending...' : 'Dispatch to Cashier'}
                            </button>
                        )}

                        <button
                            className="w-full py-3 text-[9px] font-black text-zinc-500 uppercase tracking-widest hover:text-white transition-colors"
                            onClick={() => window.print()}
                        >
                            🖨 Print Receipt
                        </button>
                    </div>
                </div>
            </aside>

            {/* ── PRINTABLE RECEIPT (Hidden in UI, Visible in Print) ── */}
            <div id="printable-receipt" className="hidden fixed inset-0 bg-white z-[100] p-8 text-black font-sans">
                <div className="max-w-[300px] mx-auto space-y-6">
                    {/* Header */}
                    <div className="text-center space-y-1">
                        <h2 className="text-xl font-black uppercase tracking-tighter">HotelPro Royal</h2>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Fine Dining & Bar</p>
                        <div className="w-full h-px bg-zinc-200 my-4 border-t border-dashed" />
                    </div>

                    {/* Metadata */}
                    <div className="flex justify-between items-end">
                        <div className="space-y-0.5">
                            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Bill For</p>
                            <h3 className="text-sm font-black uppercase tracking-tight">Table {bill.tableCode}</h3>
                        </div>
                        <div className="text-right space-y-0.5">
                            <p className="text-[9px] font-bold text-zinc-400">{new Date().toLocaleDateString()}</p>
                            <p className="text-[9px] font-bold text-zinc-400">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                    </div>

                    <div className="w-full h-px bg-zinc-200 border-t border-dashed" />

                    {/* Items */}
                    <div className="space-y-3">
                        {bill.items.map((item, i) => (
                            <div key={i} className="flex justify-between items-start gap-4">
                                <div className="flex-1">
                                    <p className="text-xs font-bold leading-tight uppercase tracking-tight">{item.name}</p>
                                    <p className="text-[9px] text-zinc-400 font-medium">₹{item.price.toLocaleString()} × {item.qty}</p>
                                </div>
                                <span className="text-xs font-bold tabular-nums">₹{(item.price * item.qty).toLocaleString()}</span>
                            </div>
                        ))}
                    </div>

                    <div className="w-full h-px bg-zinc-200 border-t border-dashed" />

                    {/* Totals */}
                    <div className="space-y-2 pt-2">
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                            <span>Subtotal</span>
                            <span>₹{totals.subtotal.toLocaleString()}</span>
                        </div>
                        {totals.discountAmount > 0 && (
                            <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                                <span>Discount ({discountPercent}%)</span>
                                <span>- ₹{totals.discountAmount.toFixed(0)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                            <span>GST ({totals.gstRate}%)</span>
                            <span>₹{totals.gstAmount.toFixed(0)}</span>
                        </div>
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                            <span>Service Charge (5%)</span>
                            <span>₹{totals.serviceChargeAmount.toFixed(0)}</span>
                        </div>
                        <div className="flex justify-between items-center pt-2">
                            <span className="text-xs font-black uppercase tracking-widest text-zinc-900">Total Amount</span>
                            <span className="text-xl font-black tabular-nums">₹{Math.round(totals.grandTotal).toLocaleString()}</span>
                        </div>
                    </div>

                    <div className="w-full h-px bg-zinc-200 my-4 border-t border-dashed" />

                    {/* Footer */}
                    <div className="text-center space-y-1 py-4">
                        <p className="text-[9px] font-black uppercase tracking-widest italic">Thank You for Visiting!</p>
                        <p className="text-[8px] font-medium text-zinc-400 italic">HotelPro Royal · Powered by HotelPro</p>
                    </div>
                </div>
            </div>

            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
                input[type=number] { -moz-appearance: textfield; }
                @media print {
                    body * { visibility: hidden; }
                    #printable-receipt, #printable-receipt * { visibility: visible !important; }
                    #printable-receipt { display: block !important; position: absolute; left: 0; top: 0; width: 100%; height: auto; }
                    @page { margin: 0; size: auto; }
                }
            `}</style>
        </div>
    );
}
