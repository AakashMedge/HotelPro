
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronLeft,
    Receipt,
    User,
    Phone,
    Percent,
    ShieldCheck,
    Calculator,
    Printer,
    Send,
    AlertCircle
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

export default function BillPreview() {
    const { id: tableId } = useParams();
    const router = useRouter();

    const [bill, setBill] = useState<BillData | null>(null);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // Dynamic Billing State
    const [gstEnabled, setGstEnabled] = useState(true);
    const [discountPercent, setDiscountPercent] = useState(0);
    const [guestName, setGuestName] = useState('');
    const [guestPhone, setGuestPhone] = useState('');

    const fetchBill = useCallback(async () => {
        try {
            const tablesRes = await fetch('/api/tables');
            const tablesData = await tablesRes.json();
            const table = tablesData.tables?.find((t: any) => t.id === tableId);

            if (!table) throw new Error('Table not found');

            const ordersRes = await fetch('/api/orders?status=NEW,PREPARING,READY,SERVED,BILL_REQUESTED');
            const ordersData = await ordersRes.json();
            const order = ordersData.orders?.find((o: any) => o.tableId === tableId);

            if (!order) {
                setBill(null);
                return;
            }

            const itemTotal = order.items.reduce((sum: number, item: any) => sum + Number(item.priceSnapshot || item.price) * item.quantity, 0);

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
                appliedGstRate: Number(order.appliedGstRate || 5)
            });
        } catch (err) {
            console.error('[BILL] Fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, [tableId]);

    useEffect(() => { fetchBill(); }, [fetchBill]);

    useEffect(() => {
        if (bill && bill.guest && bill.guest !== `Guest @ ${bill.tableCode}`) {
            setGuestName(bill.guest);
        }
    }, [bill]);

    // COMPUTED TOTALS
    const totals = useMemo(() => {
        if (!bill) return null;

        const subtotal = bill.subtotal;
        const discountAmount = subtotal * (discountPercent / 100);
        const netAfterDiscount = subtotal - discountAmount;

        const gstRate = gstEnabled ? (bill.appliedGstRate || 5) : 0;
        const gstAmount = netAfterDiscount * (gstRate / 100);

        const serviceChargeRate = 5; // Fixed 5% service charge for now
        const serviceChargeAmount = netAfterDiscount * (serviceChargeRate / 100);

        const grandTotal = netAfterDiscount + gstAmount + serviceChargeAmount;

        return {
            subtotal,
            discountAmount,
            netAfterDiscount,
            gstAmount,
            serviceChargeAmount,
            grandTotal,
            gstRate
        };
    }, [bill, gstEnabled, discountPercent]);

    const sendToCashier = async () => {
        if (!bill || !totals || sending) return;
        setSending(true);

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
                    appliedGstRate: totals.gstRate
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to send bill');
            }

            setShowConfirm(false);
            setNotification({ type: 'success', message: 'Bill dispatched to cashier' });
            setTimeout(() => router.push(`/waiter/table/${tableId}`), 2000);
        } catch (err) {
            setNotification({ type: 'error', message: err instanceof Error ? err.message : 'Something went wrong' });
        } finally {
            setSending(false);
        }
    };

    if (loading) return (
        <div className="h-full flex items-center justify-center bg-[#FDFCF9]">
            <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-2 border-zinc-100 border-t-zinc-900 rounded-full animate-spin" />
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Generating Digital Bill...</span>
            </div>
        </div>
    );

    if (!bill || !totals) return (
        <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-[#FDFCF9]">
            <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center mb-6">
                <AlertCircle size={32} className="text-zinc-200" />
            </div>
            <h2 className="text-sm font-black text-zinc-400 uppercase tracking-[0.3em] mb-2">No Active Context</h2>
            <p className="text-[10px] text-zinc-300 max-w-xs mb-8">This table session is currently empty or has been fully settled.</p>
            <button
                onClick={() => router.push(`/waiter/table/${tableId}`)}
                className="px-8 py-3 bg-zinc-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-zinc-200"
            >
                Back to Floor
            </button>
        </div>
    );

    const alreadySent = bill.status === 'BILL_REQUESTED';

    return (
        <div className="h-full flex flex-col md:flex-row bg-[#FDFCF9] overflow-hidden relative">

            {/* NOTIFICATION */}
            <AnimatePresence>
                {notification && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className={`absolute top-6 left-1/2 -translate-x-1/2 z-100 px-6 py-3 rounded-2xl shadow-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 ${notification.type === 'success' ? 'bg-zinc-900 text-white' : 'bg-red-500 text-white'}`}
                    >
                        {notification.type === 'success' ? <ShieldCheck size={14} /> : <AlertCircle size={14} />}
                        {notification.message}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* LEFT: SETTINGS & ADJUSTMENTS */}
            <div className={`flex-1 flex flex-col min-w-0 overflow-y-auto no-scrollbar p-4 md:p-8 space-y-8 ${alreadySent ? 'opacity-50 pointer-events-none' : ''}`}>

                {/* HEAD */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push(`/waiter/table/${tableId}`)}
                        className="w-12 h-12 rounded-2xl bg-white border border-zinc-100 flex items-center justify-center text-zinc-400 hover:text-zinc-900 transition-all shadow-sm"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-zinc-900 tracking-tighter uppercase">Adjustment Phase</h1>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Refining Bill for Table {bill.tableCode}</p>
                    </div>
                </div>

                {/* GUEST INFO */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <User size={14} className="text-zinc-300" />
                            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Guest Profile</span>
                        </div>
                        <input
                            type="text"
                            placeholder="Guest Name (e.g. John Doe)"
                            value={guestName}
                            onChange={(e) => setGuestName(e.target.value)}
                            className="w-full bg-zinc-50 border-none px-4 py-3 rounded-xl text-xs font-bold outline-none focus:ring-2 ring-zinc-900/5 transition-all"
                        />
                        <input
                            type="tel"
                            placeholder="Phone Number (Optional)"
                            value={guestPhone}
                            onChange={(e) => setGuestPhone(e.target.value)}
                            className="w-full bg-zinc-50 border-none px-4 py-3 rounded-xl text-xs font-bold outline-none focus:ring-2 ring-zinc-900/5 transition-all"
                        />
                    </div>

                    <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm space-y-6">
                        <div className="flex items-center gap-2 mb-2">
                            <Calculator size={14} className="text-zinc-300" />
                            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Financial Overrides</span>
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-black text-zinc-900 uppercase">Apply Tax (GST)</p>
                                <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-tighter">Toggle Govt. Compliance</p>
                            </div>
                            <button
                                onClick={() => setGstEnabled(!gstEnabled)}
                                className={`w-12 h-6 rounded-full relative transition-all duration-300 ${gstEnabled ? 'bg-zinc-900' : 'bg-zinc-200'}`}
                            >
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${gstEnabled ? 'left-7' : 'left-1'}`} />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-black text-zinc-900 uppercase">Discount</p>
                                <span className="text-[10px] font-black text-zinc-400 bg-zinc-50 px-2 py-1 rounded-lg italic">0-100%</span>
                            </div>
                            <div className="relative">
                                <Percent size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300" />
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={discountPercent}
                                    onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, Number(e.target.value))))}
                                    className="w-full bg-zinc-50 border-none pl-12 pr-4 py-3 rounded-xl text-xs font-black outline-none focus:ring-2 ring-zinc-900/5 transition-all"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* ITEM BREAKDOWN (FOR REFERENCE) */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-zinc-100 shadow-sm">
                    <h3 className="text-[10px] font-black text-zinc-300 uppercase tracking-[0.4em] mb-6">Service Line Items</h3>
                    <div className="space-y-5">
                        {bill.items.map((item, i) => (
                            <div key={i} className="flex justify-between items-center group">
                                <div className="flex items-center gap-4">
                                    <span className="text-xs font-black text-zinc-200 group-hover:text-zinc-900 transition-colors">x0{item.qty}</span>
                                    <span className="text-xs font-black text-zinc-900 uppercase tracking-tight">{item.name}</span>
                                </div>
                                <span className="text-xs font-bold text-zinc-400 tabular-nums">₹{(item.price * item.qty).toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* RIGHT: PREMIUM RECEIPT PREVIEW */}
            <aside className="w-full md:w-[400px] h-full bg-zinc-900 flex flex-col shadow-2xl z-10 p-6 md:p-10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl opacity-50" />

                <div className="relative flex flex-col h-full space-y-8">
                    {/* ICON */}
                    <div className="flex justify-center">
                        <div className="p-4 bg-zinc-800 rounded-3xl text-white">
                            <Receipt size={32} strokeWidth={1.5} />
                        </div>
                    </div>

                    <div className="text-center">
                        <h2 className="text-xl font-black text-white uppercase tracking-tighter italic font-playfair mb-1">Live Bill Preview</h2>
                        <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Audited Calculation Engine</p>
                    </div>

                    <div className="flex-1 space-y-4 pt-4">
                        <div className="flex justify-between text-[11px] font-bold text-zinc-400">
                            <span className="uppercase tracking-widest">Gross Subtotal</span>
                            <span className="text-white">₹{totals.subtotal.toLocaleString()}</span>
                        </div>

                        {totals.discountAmount > 0 && (
                            <div className="flex justify-between text-[11px] font-bold text-green-400">
                                <span className="uppercase tracking-widest">Discount ({discountPercent}%)</span>
                                <span>- ₹{totals.discountAmount.toLocaleString()}</span>
                            </div>
                        )}

                        <div className="h-px bg-zinc-800 my-4 border-t border-dashed border-zinc-700" />

                        <div className="flex justify-between text-[11px] font-bold text-zinc-400">
                            <span className="uppercase tracking-widest">Tax (GST {totals.gstRate}%)</span>
                            <span className={`${gstEnabled ? 'text-white' : 'text-zinc-600 line-through'}`}>
                                ₹{totals.gstAmount.toLocaleString()}
                            </span>
                        </div>

                        <div className="flex justify-between text-[11px] font-bold text-zinc-400">
                            <span className="uppercase tracking-widest">Service Charge (5%)</span>
                            <span className="text-white">₹{totals.serviceChargeAmount.toLocaleString()}</span>
                        </div>

                        <div className="mt-12 p-8 bg-zinc-800 rounded-[2.5rem] border border-white/5 space-y-3">
                            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest italic leading-none">Net Payable Amount</p>
                            <div className="flex items-baseline gap-1">
                                <span className="text-zinc-500 font-bold text-lg">₹</span>
                                <h3 className="text-5xl font-black text-white tracking-tighter italic font-playfair leading-none">
                                    {Math.round(totals.grandTotal).toLocaleString()}
                                </h3>
                            </div>
                        </div>
                    </div>

                    {/* ACTIONS */}
                    <div className="space-y-3">
                        {!alreadySent ? (
                            <button
                                onClick={sendToCashier}
                                disabled={sending || !guestName.trim()}
                                className="w-full py-6 bg-white text-zinc-900 rounded-3xl text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl hover:bg-zinc-100 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-30"
                            >
                                <Send size={18} />
                                Dispatch to Counter
                            </button>
                        ) : (
                            <div className="w-full py-6 bg-zinc-800 text-green-400 rounded-3xl text-[11px] font-black uppercase tracking-[0.2em] text-center border border-green-400/20">
                                ✓ Dispatched to Cashier
                            </div>
                        )}
                        <button
                            className="w-full py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest hover:text-white transition-colors"
                            onClick={() => window.print()}
                        >
                            Generate Temp Receipt
                        </button>
                    </div>
                </div>
            </aside>

            <style jsx global>{`
                input::-webkit-outer-spin-button,
                input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
                input[type=number] { -moz-appearance: textfield; }
                @media print {
                    body * { visibility: hidden; }
                    aside { visibility: visible !important; position: absolute; left: 0; top: 0; width: 100%; height: auto; }
                    .no-print { display: none !important; }
                }
            `}</style>
        </div>
    );
}

