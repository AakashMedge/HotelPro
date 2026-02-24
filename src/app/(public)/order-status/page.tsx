'use client';

import { useState, useEffect, useCallback, Suspense, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Utensils,
    XCircle,
    ThumbsDown,
    Clock,
    Search,
    Frown,
    HelpCircle,
    Star,
    CheckCircle2,
    AlertTriangle,
    MessageCircle,
    Plus,
    ArrowLeft,
    HandMetal,
    X,
    Lock,
    CreditCard,
    Smartphone,
    Banknote
} from 'lucide-react';

// ============================================
// Types
// ============================================

interface OrderItem {
    id: string;
    name: string;
    qty: number;
    price: number;
    status: string;
    createdAt: string;
    variant?: { name: string; price: number };
    modifiers?: { name: string; price: number }[];
    notes?: string;
}

interface OrderData {
    id: string;
    status: string;
    version: number;
    items: OrderItem[];
    subtotal: number;
    gstAmount: number;
    serviceChargeAmount: number;
    grandTotal: number;
    createdAt: string;
}

interface ComplaintData {
    id: string;
    type: string;
    status: string;
    description?: string;
    resolvedNote?: string;
    createdAt: string;
}

// ============================================
// Complaint Type Labels
// ============================================

const COMPLAINT_TYPES = [
    { key: 'NOT_RECEIVED', label: 'Missing Food', icon: <Utensils size={18} /> },
    { key: 'WRONG_ITEM', label: 'Wrong Item', icon: <XCircle size={18} /> },
    { key: 'QUALITY_ISSUE', label: 'Quality Issue', icon: <ThumbsDown size={18} /> },
    { key: 'DELAY', label: 'Severe Delay', icon: <Clock size={18} /> },
    { key: 'MISSING_ITEM', label: 'Missing Item', icon: <Search size={18} /> },
    { key: 'RUDE_SERVICE', label: 'Service Issue', icon: <Frown size={18} /> },
    { key: 'OTHER', label: 'Other Issue', icon: <HelpCircle size={18} /> },
];

const COMPLAINT_STATUS_LABELS: Record<string, { label: string; color: string; }> = {
    SUBMITTED: { label: 'Reported', color: 'text-orange-500' },
    ACKNOWLEDGED: { label: 'Seen by Manager', color: 'text-blue-500' },
    IN_PROGRESS: { label: 'Being Resolved', color: 'text-purple-500' },
    RESOLVED: { label: 'Resolved', color: 'text-green-600' },
    DISMISSED: { label: 'Dismissed', color: 'text-zinc-400' },
};

// ============================================
// Component
// ============================================

function OrderStatusContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const orderId = searchParams.get('id');

    const [order, setOrder] = useState<OrderData | null>(null);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);
    const [step, setStep] = useState(0);
    const [isRequesting, setIsRequesting] = useState(false);
    const [rating, setRating] = useState<number>(0);
    const [feedback, setFeedback] = useState('');
    const [feedbackSent, setFeedbackSent] = useState(false);
    const [now, setNow] = useState(Date.now());

    // Complaint system
    const [showComplaintPanel, setShowComplaintPanel] = useState(false);
    const [selectedComplaintType, setSelectedComplaintType] = useState<string | null>(null);
    const [complaintDescription, setComplaintDescription] = useState('');
    const [isSubmittingComplaint, setIsSubmittingComplaint] = useState(false);
    const [activeComplaints, setActiveComplaints] = useState<ComplaintData[]>([]);
    const [complaintSuccess, setComplaintSuccess] = useState(false);

    // Serve confirmation
    const [showServeConfirm, setShowServeConfirm] = useState(false);
    const [serveConfirmDismissed, setServeConfirmDismissed] = useState(false);

    // AI Floating Chat
    const [aiOpen, setAiOpen] = useState(false);
    const [aiInput, setAiInput] = useState('');
    const [aiMessages, setAiMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
    const [aiLoading, setAiLoading] = useState(false);
    const [isStarter, setIsStarter] = useState(false);
    const aiChatEndRef = useRef<HTMLDivElement>(null);

    const GRACE_PERIOD_MS = 120000; // 2 minutes window for cancellation

    const steps = useMemo(() => {
        if (isStarter) {
            return [
                { key: 'NEW', label: 'Ordered', desc: 'Securely received' },
                { key: 'PREPARING', label: 'Preparing', desc: 'Staff is on it' },
                { key: 'SERVED', label: 'Served', desc: 'Enjoy your meal' }
            ];
        }
        return [
            { key: 'NEW', label: 'Ordered', desc: 'Securely received' },
            { key: 'PREPARING', label: 'Preparing', desc: 'In the kitchen' },
            { key: 'READY', label: 'Ready', desc: 'Plated & checking' },
            { key: 'SERVED', label: 'Served', desc: 'Enjoy your meal' }
        ];
    }, [isStarter]);

    // ============================================
    // Data Fetching
    // ============================================

    const fetchOrderStatus = useCallback(async () => {
        if (!orderId) return;
        try {
            const res = await fetch(`/api/orders/${orderId}`);
            const data = await res.json();
            if (!data.success) throw new Error(data.error);

            const o = data.order;
            const prevStatus = order?.status;

            setOrder({
                id: o.id,
                status: o.status,
                version: o.version,
                subtotal: o.subtotal,
                gstAmount: o.gstAmount,
                serviceChargeAmount: o.serviceChargeAmount,
                grandTotal: o.grandTotal,
                createdAt: o.createdAt,
                items: o.items.map((item: any) => ({
                    id: item.id,
                    name: item.itemName || item.name,
                    qty: item.quantity || item.qty,
                    price: item.price,
                    status: item.status,
                    createdAt: item.createdAt || o.createdAt,
                    variant: item.selectedVariant || item.variant,
                    modifiers: item.selectedModifiers || item.modifiers,
                    notes: item.notes
                }))
            });

            const stepIndex = steps.findIndex(s => s.key === o.status);
            const servedIndex = steps.length - 1;
            setStep(stepIndex >= 0 ? stepIndex : (['BILL_REQUESTED', 'CLOSED', 'PAID'].includes(o.status) ? servedIndex : 0));

            // Show serve confirmation when status changes to SERVED
            if (o.status === 'SERVED' && prevStatus && prevStatus !== 'SERVED' && !serveConfirmDismissed) {
                setShowServeConfirm(true);
            }

            if (o.status === 'CLOSED') {
                const keysToClear = [
                    'hp_active_order_id',
                    'hp_session_id',
                    'hp_table_id',
                    'hp_table_code',
                    'hp_party_size',
                    'hp_guest_name',
                    'hp_hotel_id',
                    'hp_hotel_name',
                    'hp_cart'
                ];
                keysToClear.forEach(key => localStorage.removeItem(key));
                setTimeout(() => router.replace('/welcome-guest'), 5000);
            } else if (o.status === 'CANCELLED') {
                localStorage.removeItem('hp_active_order_id');
                localStorage.removeItem('hp_cart');
                setOrder(null);
            }

            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    }, [orderId, router, serveConfirmDismissed]);

    // Fetch active complaints for this order
    const fetchComplaints = useCallback(async () => {
        if (!orderId) return;
        try {
            const res = await fetch(`/api/customer/complaints?orderId=${orderId}`);
            if (res.ok) {
                const data = await res.json();
                if (data.success) setActiveComplaints(data.complaints || []);
            }
        } catch { /* silent */ }
    }, [orderId]);

    // Timer for grace period
    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        setMounted(true);
        setIsStarter(localStorage.getItem('hp_hotel_plan') === 'STARTER');
        if (!orderId) {
            const saved = localStorage.getItem('hp_active_order_id');
            if (saved) router.replace(`/order-status?id=${saved}`);
            else setLoading(false);
            return;
        }

        fetchOrderStatus();

        const es = new EventSource('/api/events');
        es.onmessage = (e) => {
            const data = JSON.parse(e.data);
            if (data.event === 'ORDER_UPDATED' && data.payload.orderId === orderId) {
                fetchOrderStatus();
            }
            if (data.event === 'COMPLAINT_UPDATED' && data.payload.orderId === orderId) {
                fetchComplaints();
            }
        };

        // Fallback polling every 5s (Deployment safe)
        const pollInterval = setInterval(() => {
            fetchOrderStatus();
        }, 5000);

        return () => {
            es.close();
            clearInterval(pollInterval);
        };
    }, [orderId, fetchOrderStatus, fetchComplaints, router]);

    // ============================================
    // Actions
    // ============================================

    const handleBillRequest = async () => {
        if (!order) return;
        setIsRequesting(true);
        const name = localStorage.getItem('hp_guest_name') || 'Value Guest';
        try {
            await fetch(`/api/orders/${order.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'BILL_REQUESTED', customerName: name, version: order.version })
            });
            await fetchOrderStatus();
        } finally {
            setIsRequesting(false);
        }
    };

    const handleCancelOrder = async () => {
        if (!order || !orderId) return;
        if (!confirm("Sir, are you sure you want to cancel the entire order?")) return;

        try {
            const res = await fetch(`/api/orders/${orderId}`, { method: 'DELETE' });
            if (res.ok) {
                router.push('/menu');
            } else {
                const data = await res.json();
                alert(data.error || "Failed to cancel order");
            }
        } catch (err) {
            alert("Error cancelling order");
        }
    };

    const handleCancelItem = async (itemId: string) => {
        if (!orderId) return;
        if (!confirm("Would you like to remove this item from your order, Sir?")) return;

        try {
            const res = await fetch(`/api/orders/${orderId}/items/${itemId}`, { method: 'DELETE' });
            if (res.ok) {
                await fetchOrderStatus();
            } else {
                const data = await res.json();
                alert(data.error || "Failed to cancel item");
            }
        } catch (err) {
            alert("Error cancelling item");
        }
    };

    // ── Real Feedback Submission ──
    const submitFeedback = async () => {
        if (!order || rating === 0) return;
        try {
            const res = await fetch('/api/customer/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId: order.id,
                    rating,
                    comment: feedback || null,
                    guestName: localStorage.getItem('hp_guest_name') || null,
                    tableCode: localStorage.getItem('hp_table_code') || null,
                })
            });
            const data = await res.json();
            if (data.success) {
                setFeedbackSent(true);
            } else {
                // Already submitted
                setFeedbackSent(true);
            }
        } catch {
            setFeedbackSent(true);
        }
    };

    const simulatePayment = async () => {
        setIsRequesting(true);
        try {
            await fetch(`/api/orders/${orderId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'PAID', version: order?.version })
            });
            await fetchOrderStatus();
        } finally {
            setIsRequesting(false);
        }
    };

    // ── Complaint Submission ──
    const submitComplaint = async () => {
        if (!order || !selectedComplaintType) return;
        setIsSubmittingComplaint(true);
        try {
            const res = await fetch('/api/customer/complaints', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId: order.id,
                    type: selectedComplaintType,
                    description: complaintDescription || null,
                    guestName: localStorage.getItem('hp_guest_name') || null,
                    tableCode: localStorage.getItem('hp_table_code') || null,
                })
            });
            const data = await res.json();
            if (data.success) {
                setComplaintSuccess(true);
                setActiveComplaints(prev => [data.complaint, ...prev]);
                setTimeout(() => {
                    setShowComplaintPanel(false);
                    setComplaintSuccess(false);
                    setSelectedComplaintType(null);
                    setComplaintDescription('');
                }, 2000);
            }
        } catch {
            alert("Failed to report issue. Please try again.");
        } finally {
            setIsSubmittingComplaint(false);
        }
    };

    // ── Serve Confirmation ──
    const handleConfirmServed = () => {
        setShowServeConfirm(false);
        setServeConfirmDismissed(true);
    };

    const handleDisputeServed = () => {
        setShowServeConfirm(false);
        setServeConfirmDismissed(true);
        setShowComplaintPanel(true);
        setSelectedComplaintType('NOT_RECEIVED');
    };

    // AI Chat on Order Status Page
    const sendAiMessage = useCallback(async () => {
        if (!aiInput.trim() || aiLoading) return;
        const text = aiInput.trim();
        setAiInput('');
        setAiMessages(prev => [...prev, { role: 'user', content: text }]);
        setAiLoading(true);

        try {
            const guestName = localStorage.getItem('hp_guest_name') || 'Guest';
            const tableCode = localStorage.getItem('hp_table_code') || '';
            const tableId = localStorage.getItem('hp_table_id') || '';
            const cart = JSON.parse(localStorage.getItem('hp_cart') || '[]');

            const res = await fetch('/api/ai/concierge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text,
                    guestName,
                    tableCode,
                    tableId,
                    cart,
                    conversationHistory: aiMessages.slice(-6),
                    activeOrderId: orderId,
                }),
            });

            const data = await res.json();
            if (data.success) {
                setAiMessages(prev => [...prev, { role: 'assistant', content: data.message }]);

                // Handle ADD_TO_EXISTING_ORDER
                if (data.uiCommands) {
                    for (const cmd of data.uiCommands) {
                        if (cmd.type === 'ADD_TO_EXISTING_ORDER' && cmd.data) {
                            try {
                                await fetch(`/api/orders/${orderId}/items`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        items: [{ menuItemId: cmd.data.menuItemId, quantity: cmd.data.quantity }]
                                    }),
                                });
                                fetchOrderStatus();
                            } catch { /* handled */ }
                        } else if (cmd.type === 'UPDATE_CART') {
                            localStorage.setItem('hp_cart', JSON.stringify(cmd.data || []));
                        }
                    }
                }
            }
        } catch {
            setAiMessages(prev => [...prev, { role: 'assistant', content: 'I apologize, please try again.' }]);
        } finally {
            setAiLoading(false);
        }
    }, [aiInput, aiLoading, aiMessages, orderId, fetchOrderStatus]);

    useEffect(() => {
        aiChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [aiMessages]);

    if (!mounted || loading) return (
        <div className="min-h-screen bg-white flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-stone-100 border-t-stone-900 rounded-full animate-spin" />
        </div>
    );

    if (!order) return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center">
            <h1 className="text-2xl font-bold text-[#1A1A1A]">No active order</h1>
            <p className="text-sm text-zinc-400 mt-2">Placed orders will appear here.</p>
            <Link href="/menu" className="mt-8 px-8 py-3 bg-[#1A1A1A] text-white rounded-full text-xs font-semibold uppercase tracking-widest">View Menu</Link>
        </div>
    );

    const isFinished = order.status === 'CLOSED';
    const canReport = ['SERVED', 'READY', 'PREPARING', 'BILL_REQUESTED'].includes(order.status);

    return (
        <div className="min-h-screen bg-[#FAF7F2] text-[#1A1A1A] font-sans pb-32 overflow-x-hidden">

            <div className="px-6 pt-12 pb-8 flex items-center justify-between max-w-lg mx-auto bg-white/50 backdrop-blur-md sticky top-0 z-40 border-b border-[#D43425]/5">
                <div>
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#D43425]/40 italic">Live Journey • {localStorage.getItem('hp_party_size') || '2'} Guests</span>
                    <h1 className="text-2xl font-serif italic font-black tracking-tight mt-1 text-[#1A1A1A]">Order Status</h1>
                </div>
                <div className="flex gap-3">
                    {canReport && (
                        <button
                            onClick={() => setShowComplaintPanel(true)}
                            className="w-10 h-10 rounded-full border border-red-200 flex items-center justify-center text-red-500 active:scale-95 transition-transform bg-red-50 shadow-sm"
                            title="Report an Issue"
                        >
                            <AlertTriangle size={18} strokeWidth={2.5} />
                        </button>
                    )}
                    <Link href="/menu?append=true" className="w-10 h-10 rounded-full border border-zinc-200 flex items-center justify-center text-[#1A1A1A] active:scale-95 transition-transform bg-white shadow-sm">
                        <Plus size={18} strokeWidth={2.5} />
                    </Link>
                </div>
            </div>

            {/* ─── Serve Confirmation Banner ─── */}
            <AnimatePresence>
                {showServeConfirm && (
                    <motion.div
                        initial={{ opacity: 0, y: -20, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -20, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="mx-4 mt-4 max-w-lg bg-linear-to-r from-emerald-500 to-teal-500 rounded-3xl p-5 shadow-xl shadow-emerald-200/50">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-white/20 rounded-2xl text-white">
                                    <Utensils size={24} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[11px] font-black text-white uppercase tracking-wider">Order Status Dispatch</p>
                                    <p className="text-[10px] text-white/70 mt-1">Did you receive your order?</p>
                                </div>
                            </div>
                            <div className="flex gap-2 mt-4">
                                <button
                                    onClick={handleConfirmServed}
                                    className="flex-1 bg-white text-emerald-700 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider active:scale-95 transition-transform flex items-center justify-center gap-2"
                                >
                                    <CheckCircle2 size={14} /> Yes, Received
                                </button>
                                <button
                                    onClick={handleDisputeServed}
                                    className="flex-1 bg-white/20 text-white border border-white/30 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider active:scale-95 transition-transform flex items-center justify-center gap-2"
                                >
                                    <XCircle size={14} /> Not Yet
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── Active Complaints Banner ─── */}
            {activeComplaints.length > 0 && (
                <div className="mt-4 max-w-lg mx-auto space-y-2">
                    {activeComplaints.filter(c => c.status !== 'RESOLVED' && c.status !== 'DISMISSED').map(c => (
                        <motion.div
                            key={c.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white border border-orange-200 rounded-2xl px-4 py-3 flex items-center gap-3"
                        >
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-orange-50 text-orange-600 border border-orange-100">
                                <AlertTriangle size={18} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-black uppercase tracking-wider text-zinc-700">
                                    {COMPLAINT_TYPES.find(t => t.key === c.type)?.label || c.type}
                                </p>
                                <p className={`text-[9px] font-bold uppercase tracking-wider mt-0.5 ${COMPLAINT_STATUS_LABELS[c.status]?.color || 'text-zinc-400'}`}>
                                    {COMPLAINT_STATUS_LABELS[c.status]?.label || c.status}
                                </p>
                            </div>
                            {c.status === 'SUBMITTED' && (
                                <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
                            )}
                        </motion.div>
                    ))}
                </div>
            )}

            <div className="px-6 max-w-lg mx-auto space-y-10 mt-8">
                {/* ─── Tracker (Hidden in Checkout Mode) ─── */}
                {!['BILL_REQUESTED', 'PAID'].includes(order.status) && (
                    <div className="relative bg-white p-8 rounded-[40px] shadow-2xl shadow-[#D43425]/5 border border-white">
                        <div className="absolute left-[39px] top-12 bottom-12 w-px bg-linear-to-b from-[#D43425]/20 via-[#D43425]/5 to-transparent" />
                        <div className="space-y-12">
                            {steps.map((s, idx) => {
                                const isPast = idx < step;
                                const isCurrent = idx === step;
                                return (
                                    <div key={idx} className={`relative flex gap-8 transition-all duration-700 ${idx > step ? 'opacity-20 translate-x-2' : 'opacity-100'}`}>
                                        <div className={`w-6 h-6 rounded-full border-[1.5px] flex items-center justify-center z-10 transition-all duration-500 shrink-0 ${isCurrent ? 'bg-[#D43425] border-[#D43425] text-white shadow-lg shadow-red-500/20' :
                                            isPast ? 'bg-[#1A1A1A] border-[#1A1A1A] text-white' :
                                                'bg-white border-zinc-200 text-zinc-300'
                                            }`}>
                                            {isPast ? (
                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12" /></svg>
                                            ) : (
                                                <div className={isCurrent ? 'w-1.5 h-1.5 bg-white rounded-full animate-pulse' : ''} />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] leading-none ${isCurrent ? 'text-[#D43425]' : 'text-[#1A1A1A]'}`}>{s.label}</h3>
                                            <p className="text-[12px] text-zinc-400 font-serif italic mt-1">{s.desc}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ─── Items List (Hidden in Checkout Mode) ─── */}
                {!['BILL_REQUESTED', 'PAID'].includes(order.status) && (
                    <div className="bg-white rounded-[40px] border border-zinc-100 overflow-hidden shadow-2xl shadow-zinc-200/50">
                        <div className="px-8 py-5 bg-[#FAF9F6] border-b border-zinc-50 flex justify-between items-center">
                            <div>
                                <span className="text-[8px] font-black uppercase tracking-[0.3em] text-zinc-300">Dining Journal</span>
                                <p className="text-[9px] font-bold text-zinc-900 mt-0.5 uppercase tracking-tighter">REF NO: {order.id.slice(0, 8)}</p>
                            </div>
                            <div className="text-right">
                                <span className="text-[8px] font-black uppercase tracking-[0.3em] text-zinc-300">Table</span>
                                <p className="text-[11px] font-black text-[#D43425] leading-none mt-0.5">#{localStorage.getItem('hp_table_code') || 'T-1'}</p>
                            </div>
                        </div>
                        <div className="p-8 space-y-6">
                            {order.items.map((item) => {
                                const itemCreatedAt = new Date(item.createdAt).getTime();
                                const timeLeftMs = Math.max(0, GRACE_PERIOD_MS - (now - itemCreatedAt));
                                const canCancel = item.status === 'PENDING' && timeLeftMs > 0 && order.status === 'NEW';

                                return (
                                    <div key={item.id} className="group">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <p className={`text-[13px] font-bold ${item.status === 'CANCELLED' ? 'text-zinc-300 line-through' : 'text-[#1A1A1A]'}`}>
                                                        {item.qty}× {item.name}
                                                    </p>
                                                    {item.status === 'CANCELLED' && (
                                                        <span className="text-[8px] font-black uppercase tracking-widest text-zinc-300 bg-zinc-50 px-1.5 py-0.5 rounded">Cancelled</span>
                                                    )}
                                                    {item.status === 'READY' && (
                                                        <span className="text-[8px] font-black uppercase tracking-widest text-[#D43425] bg-red-50 px-1.5 py-0.5 rounded animate-pulse">Ready</span>
                                                    )}
                                                    {item.status === 'SERVED' && (
                                                        <span className="text-[8px] font-black uppercase tracking-widest text-green-600 bg-green-50 px-1.5 py-0.5 rounded">Served</span>
                                                    )}
                                                </div>
                                                {item.variant && <span className="text-[10px] text-zinc-400 font-serif italic">{item.variant.name}</span>}
                                            </div>
                                            {item.status !== 'CANCELLED' && (
                                                <span className="text-[13px] font-black tabular-nums tracking-tighter">₹{item.price * item.qty}</span>
                                            )}
                                        </div>
                                        <div className="h-px w-4 bg-zinc-50 mt-4 group-last:hidden" />
                                    </div>
                                );
                            })}

                            <div className="pt-8 border-t border-dashed border-zinc-100 space-y-5">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-[11px] text-zinc-400 font-medium">
                                        <span>Subtotal</span>
                                        <span className="tabular-nums">₹{order.subtotal}</span>
                                    </div>
                                    <div className="flex justify-between text-[11px] text-zinc-400 font-medium">
                                        <span>Taxes & Service</span>
                                        <span className="tabular-nums">₹{order.gstAmount + order.serviceChargeAmount}</span>
                                    </div>
                                </div>

                                <div className="flex justify-between items-baseline">
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 italic">Total Payable</span>
                                    <span className="text-3xl font-black tracking-tighter text-[#D43425]">₹{order.grandTotal}</span>
                                </div>

                                {!isFinished && (['SERVED', 'BILL_REQUESTED'].includes(order.status)) && (
                                    <button
                                        onClick={handleBillRequest}
                                        disabled={isRequesting || order.status === 'BILL_REQUESTED'}
                                        className={`w-full py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.25em] transition-all transform active:scale-95 shadow-xl ${order.status === 'BILL_REQUESTED' ? 'bg-zinc-100 text-zinc-400 cursor-default shadow-none border border-zinc-200' : 'bg-[#1A1A1A] text-white shadow-zinc-200/50'
                                            }`}
                                    >
                                        {isRequesting ? 'Requesting...' : order.status === 'BILL_REQUESTED' ? (isStarter ? '✓ Bill Requested — Wait for Staff' : '✓ Bill Requested — Wait for Cashier') : 'Request Final Bill'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ─── Feedback Section (When Served) ─── */}
                {order.status === 'SERVED' && !feedbackSent && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-[40px] border border-zinc-100 overflow-hidden shadow-2xl shadow-zinc-200/50 p-8"
                    >
                        <div className="text-center mb-6">
                            <span className="text-[8px] font-black uppercase tracking-[0.4em] text-zinc-300">How was your experience?</span>
                            <h3 className="text-lg font-serif italic font-black mt-1 text-[#1A1A1A]">Rate Your Meal</h3>
                        </div>
                        <div className="flex justify-center gap-4 mb-8">
                            {[1, 2, 3, 4, 5].map(star => (
                                <button
                                    key={star}
                                    onClick={() => setRating(star)}
                                    className={`p-2 transition-all transform active:scale-90 ${star <= rating ? 'text-amber-400' : 'text-zinc-100'}`}
                                >
                                    <Star size={36} fill={star <= rating ? 'currentColor' : 'none'} strokeWidth={1.5} />
                                </button>
                            ))}
                        </div>
                        {rating > 0 && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                                <textarea
                                    value={feedback}
                                    onChange={(e) => setFeedback(e.target.value)}
                                    placeholder="Tell us more about your experience... (optional)"
                                    className="w-full bg-zinc-50 rounded-2xl px-5 py-4 text-[12px] border border-zinc-200 resize-none h-20 outline-none focus:border-[#D43425] transition-colors"
                                />
                                <button
                                    onClick={submitFeedback}
                                    className="w-full mt-3 bg-[#1A1A1A] text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.25em] active:scale-95 transition-transform shadow-lg"
                                >
                                    Submit Feedback
                                </button>
                            </motion.div>
                        )}
                    </motion.div>
                )}

                {feedbackSent && order.status === 'SERVED' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center py-8"
                    >
                        <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto text-green-500 mb-4 border border-green-100">
                            <CheckCircle2 size={32} />
                        </div>
                        <p className="text-[11px] font-black text-zinc-600 mt-3 uppercase tracking-wider">Thank you for your feedback!</p>
                    </motion.div>
                )}

                {isFinished && (
                    <div className="text-center py-12 animate-in fade-in slide-in-from-bottom duration-1000">
                        <h2 className="text-4xl font-serif font-black italic text-[#D43425]">Dhanyavad.</h2>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-300 mt-4 animate-pulse">Redirecting to home...</p>
                    </div>
                )}
            </div>

            {/* ─── Digital Invoice (When BILL_REQUESTED or PAID) ─── */}
            {['BILL_REQUESTED', 'PAID'].includes(order.status) && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="px-6 max-w-lg mx-auto mt-8 mb-32"
                >
                    <div className="bg-white rounded-[40px] border border-[#D43425]/10 overflow-hidden shadow-2xl shadow-[#D43425]/10 relative">
                        {order.status === 'PAID' && (
                            <div className="absolute inset-0 z-20 bg-white/60 backdrop-blur-[2px] flex items-center justify-center pointer-events-none">
                                <motion.div
                                    initial={{ scale: 2, opacity: 0, rotate: -15 }}
                                    animate={{ scale: 1, opacity: 1, rotate: -12 }}
                                    className="border-8 border-green-600 text-green-600 px-8 py-4 font-black text-6xl rounded-3xl uppercase tracking-tighter shadow-xl"
                                >
                                    PAID
                                </motion.div>
                            </div>
                        )}
                        <div className="bg-[#1A1A1A] text-white px-8 py-6 flex justify-between items-center">
                            <div>
                                <span className="text-[8px] font-black uppercase tracking-[0.4em] text-[#D43425]">{order.status === 'PAID' ? 'Settled Invoice' : 'Digital Invoice'}</span>
                                <h3 className="text-lg font-serif italic font-black mt-1">Your Bill</h3>
                            </div>
                            <div className="text-right">
                                <span className="text-[8px] font-black uppercase tracking-[0.3em] text-zinc-400">Ref</span>
                                <p className="text-[11px] font-black text-[#D43425] leading-none mt-0.5">#{order.id.slice(0, 8)}</p>
                            </div>
                        </div>

                        <div className="p-8 space-y-4">
                            {/* Consolidated Items Loop */}
                            {Object.values(order.items.filter(i => i.status !== 'CANCELLED').reduce((acc: any, item) => {
                                const key = `${item.name}-${item.variant?.name || 'base'}`;
                                if (!acc[key]) acc[key] = { ...item };
                                else acc[key].qty += item.qty;
                                return acc;
                            }, {})).map((item: any) => (
                                <div key={item.id} className="flex justify-between items-center">
                                    <div className="flex-1">
                                        <p className="text-[13px] font-bold text-[#1A1A1A]">{item.qty}× {item.name}</p>
                                        {item.variant && <span className="text-[10px] text-zinc-400 italic">{item.variant.name}</span>}
                                    </div>
                                    <span className="text-[13px] font-black tabular-nums">₹{item.price * item.qty}</span>
                                </div>
                            ))}

                            <div className="h-px bg-zinc-100 my-4" />

                            <div className="space-y-2">
                                <div className="flex justify-between text-[11px] text-zinc-400">
                                    <span>Subtotal</span><span className="tabular-nums">₹{order.subtotal}</span>
                                </div>
                                <div className="flex justify-between text-[11px] text-zinc-400">
                                    <span>GST</span><span className="tabular-nums">₹{order.gstAmount}</span>
                                </div>
                                <div className="flex justify-between text-[11px] text-zinc-400">
                                    <span>Service Charge</span><span className="tabular-nums">₹{order.serviceChargeAmount}</span>
                                </div>
                            </div>

                            <div className="h-px border border-dashed border-zinc-200 my-4" />

                            <div className="flex justify-between items-baseline">
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Grand Total</span>
                                <span className="text-4xl font-black tracking-tighter text-[#D43425]">₹{order.grandTotal}</span>
                            </div>
                        </div>

                        {order.status !== 'PAID' && (
                            <div className="px-8 pb-8 space-y-3">
                                <button className="w-full py-5 bg-[#1A1A1A] text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.25em] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2">
                                    <Banknote size={14} /> Pay at Counter
                                </button>
                                <button
                                    onClick={simulatePayment}
                                    className="w-full py-5 bg-linear-to-r from-[#D43425] to-[#B22A1E] text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.25em] shadow-xl active:scale-95 transition-all hover:brightness-110 flex items-center justify-center gap-2"
                                >
                                    <Smartphone size={14} /> Pay via Phone
                                </button>
                                <div className="flex items-center justify-center gap-2 text-zinc-400 mt-2">
                                    <Lock size={10} />
                                    <p className="text-[8px] font-medium uppercase tracking-widest">Payments are secured</p>
                                </div>
                            </div>
                        )}

                        {order.status === 'PAID' && (
                            <div className="px-8 pb-8 text-center">
                                <p className="text-[9px] font-bold text-zinc-500 italic mt-4">Thank you for dining with us!</p>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}

            {/* ─── Complaint Modal ─── */}
            <AnimatePresence>
                {showComplaintPanel && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-100 bg-black/50 backdrop-blur-sm flex items-end justify-center"
                        onClick={() => !isSubmittingComplaint && setShowComplaintPanel(false)}
                    >
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="w-full max-w-lg bg-white rounded-t-[40px] shadow-2xl p-8 pb-12"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {complaintSuccess ? (
                                <motion.div
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="text-center py-8"
                                >
                                    <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-500 mb-4 border border-emerald-100">
                                        <CheckCircle2 size={40} />
                                    </div>
                                    <h3 className="text-lg font-serif italic font-black mt-4 text-[#1A1A1A]">Report Sent</h3>
                                    <p className="text-[11px] text-zinc-400 mt-2">The manager has been notified and will address your concern.</p>
                                </motion.div>
                            ) : (
                                <>
                                    {/* Handle bar */}
                                    <div className="w-10 h-1 bg-zinc-200 rounded-full mx-auto mb-6" />

                                    <div className="text-center mb-6">
                                        <span className="text-[8px] font-black uppercase tracking-[0.4em] text-red-400">Report an Issue</span>
                                        <h3 className="text-lg font-serif italic font-black mt-1 text-[#1A1A1A]">How can we help?</h3>
                                    </div>

                                    {/* Issue Type Grid */}
                                    <div className="grid grid-cols-2 gap-3 mb-6">
                                        {COMPLAINT_TYPES.map(type => (
                                            <button
                                                key={type.key}
                                                onClick={() => setSelectedComplaintType(type.key)}
                                                className={`flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all active:scale-95 ${selectedComplaintType === type.key
                                                    ? 'border-red-500 bg-red-50 text-red-600 shadow-lg shadow-red-100'
                                                    : 'border-zinc-100 bg-white text-zinc-600 hover:border-zinc-200'
                                                    }`}
                                            >
                                                <div className={`${selectedComplaintType === type.key ? 'text-red-500' : 'text-zinc-400'}`}>
                                                    {type.icon}
                                                </div>
                                                <span className="text-[11px] font-black uppercase tracking-tight">{type.label}</span>
                                            </button>
                                        ))}
                                    </div>

                                    {/* Description */}
                                    {selectedComplaintType && (
                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                                            <textarea
                                                value={complaintDescription}
                                                onChange={(e) => setComplaintDescription(e.target.value)}
                                                placeholder="Tell us more about the issue... (optional)"
                                                className="w-full bg-zinc-50 rounded-2xl px-5 py-4 text-[12px] border border-zinc-200 resize-none h-20 outline-none focus:border-[#D43425] transition-colors mb-4"
                                            />
                                            <button
                                                onClick={submitComplaint}
                                                disabled={isSubmittingComplaint}
                                                className="w-full bg-[#D43425] text-white py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.25em] shadow-xl shadow-red-200/50 active:scale-95 transition-all disabled:opacity-50"
                                            >
                                                {isSubmittingComplaint ? 'Sending...' : 'Report Issue to Manager'}
                                            </button>
                                        </motion.div>
                                    )}
                                </>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── Bottom CTA + AI Bubble ─── */}
            <div className="fixed bottom-8 left-0 right-0 px-6 z-50 pointer-events-none">
                <div className="max-w-lg mx-auto flex justify-between items-end pointer-events-auto">
                    <Link href="/menu?append=true" className="flex items-center gap-3 px-8 py-4 bg-white/90 backdrop-blur-xl border border-zinc-100 shadow-2xl shadow-[#D43425]/10 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-[#D43425] active:scale-95 transition-all">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12h14" /></svg>
                        Add More
                    </Link>

                    {/* AI Floating Bubble */}
                    {!isStarter && (
                        <button
                            onClick={() => setAiOpen(!aiOpen)}
                            className="w-14 h-14 bg-[#D43425] rounded-full flex items-center justify-center shadow-2xl shadow-red-500/30 active:scale-90 transition-all relative"
                        >
                            {aiOpen ? (
                                <X size={24} strokeWidth={2.5} />
                            ) : (
                                <MessageCircle size={24} strokeWidth={2.5} />
                            )}
                            {aiMessages.length === 0 && !aiOpen && (
                                <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse" />
                            )}
                        </button>
                    )}
                </div>
            </div>

            {/* ─── AI Chat Panel ─── */}
            <AnimatePresence>
                {aiOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 100, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 100, scale: 0.9 }}
                        className="fixed bottom-24 right-4 left-4 z-60 max-w-lg mx-auto"
                    >
                        <div className="bg-white rounded-3xl shadow-2xl border border-[#D43425]/10 overflow-hidden flex flex-col" style={{ maxHeight: '50vh' }}>
                            {/* Header */}
                            <div className="bg-[#FAF7F2] px-5 py-3 border-b border-zinc-100 flex items-center gap-3">
                                <div className="w-10 h-10 bg-[#D43425] rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-red-100">
                                    <HandMetal size={18} className="text-white" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-[#D43425]/60">AI Waiter</p>
                                    <p className="text-[9px] text-zinc-400">Ask me to add items, check status, or request bill</p>
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[120px] max-h-[30vh]">
                                {aiMessages.length === 0 && (
                                    <p className="text-[11px] text-zinc-400 italic text-center py-4">&ldquo;Add 1 more Coke&rdquo; or &ldquo;Where is my food?&rdquo;</p>
                                )}
                                {aiMessages.map((m, i) => (
                                    <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
                                        <span className={`inline-block text-[12px] px-3 py-2 rounded-2xl max-w-[85%] ${m.role === 'user' ? 'bg-zinc-900 text-white rounded-br-md' : 'bg-zinc-100 text-zinc-800 rounded-bl-md font-serif italic'}`}>
                                            {m.content}
                                        </span>
                                    </div>
                                ))}
                                {aiLoading && (
                                    <div className="flex gap-1 items-center">
                                        {[0, 1, 2].map(i => (
                                            <motion.div key={i} animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }} className="w-1.5 h-1.5 rounded-full bg-[#D43425]" />
                                        ))}
                                    </div>
                                )}
                                <div ref={aiChatEndRef} />
                            </div>

                            {/* Input */}
                            <div className="border-t border-zinc-100 px-4 py-3 flex gap-2">
                                <input
                                    value={aiInput}
                                    onChange={(e) => setAiInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && sendAiMessage()}
                                    placeholder="Tell me what you need..."
                                    className="flex-1 text-[12px] bg-zinc-50 rounded-xl px-4 py-2.5 outline-none border border-zinc-200 focus:border-[#D43425] transition-colors"
                                />
                                <button
                                    onClick={sendAiMessage}
                                    disabled={aiLoading || !aiInput.trim()}
                                    className="w-12 h-12 bg-zinc-900 text-white rounded-2xl flex items-center justify-center active:scale-90 transition-all disabled:opacity-40"
                                >
                                    <motion.div animate={aiLoading ? { x: [0, 5, 0] } : {}} transition={{ repeat: Infinity }}>
                                        <Plus size={20} />
                                    </motion.div>
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── Global Styles ─── */}
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap');
                .font-serif { font-family: 'Playfair Display', serif; }
            `}</style>
        </div>
    );
}

export default function OrderStatus() {
    return (
        <Suspense fallback={<div />}>
            <OrderStatusContent />
        </Suspense>
    );
}
