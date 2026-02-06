'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import MobileNav from '@/components/public/MobileNav';

// ============================================
// Types
// ============================================

interface OrderItem {
    id: string;
    name: string;
    qty: number;
    price: number;
    // Expanded
    variant?: { name: string; price: number };
    modifiers?: { name: string; price: number }[];
    notes?: string;
}

interface OrderData {
    id: string;
    status: string;
    version: number;
    items: OrderItem[];
    // Financial Breakdown
    subtotal: number;
    gstAmount: number;
    serviceChargeAmount: number;
    grandTotal: number;
}

interface ApiResponse {
    success: boolean;
    order?: any;
    error?: string;
}

// ============================================
// Internal Component Logic
// ============================================

function OrderStatusContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const orderId = searchParams.get('id');

    const [order, setOrder] = useState<OrderData | null>(null);
    const [step, setStep] = useState(0); // 0: Logged, 1: Preparing, 2: Quality/Ready, 3: Served
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);
    const [isWaiterPeeking, setIsWaiterPeeking] = useState(true);
    const [isRequesting, setIsRequesting] = useState(false);

    // Identity Modal State
    const [showIdentityModal, setShowIdentityModal] = useState(false);
    const [guestNameInput, setGuestNameInput] = useState('');
    const [submittingIdentity, setSubmittingIdentity] = useState(false);

    const statusLabels = [
        { label: 'Order Logged', description: 'Your selection is secured in our system.' },
        { label: 'Chef Preparing', description: 'Crafting your masterpieces with precision.' },
        { label: 'Quality Check', description: 'Ensuring every detail meets our standards.' },
        { label: 'Ready for Service', description: 'Your culinary journey is arriving shortly.' },
        { label: 'Served', description: 'The masterpiece has arrived. Enjoy your meal.' },
        { label: 'Settled', description: 'Transaction complete. Thank you for visiting us.' }
    ];

    // ============================================
    // Fetch Data
    // ============================================

    const fetchOrderStatus = useCallback(async () => {
        if (!orderId) return;

        try {
            const res = await fetch(`/api/orders/${orderId}`);
            const data: ApiResponse = await res.json();

            if (!data.success || !data.order) throw new Error(data.error || 'Order not found');

            // Relaxed Identity Check: Allow viewing if session matches OR if this is the user's active order
            const savedSessionId = localStorage.getItem('hp_session_id');
            const savedOrderId = localStorage.getItem('hp_active_order_id');
            const sessionMatches = data.order.sessionId && data.order.sessionId === savedSessionId;
            const orderIdMatches = orderId === savedOrderId;

            // Allow access if either condition is true (graceful fallback)
            if (!sessionMatches && !orderIdMatches) {
                console.warn('[ORDER STATUS] Neither session nor order ID matches. Hiding order.');
                setOrder(null);
                setLoading(false);
                return;
            }

            const o = data.order;
            setOrder({
                id: o.id,
                status: o.status,
                version: o.version,
                subtotal: o.subtotal,
                gstAmount: o.gstAmount,
                serviceChargeAmount: o.serviceChargeAmount,
                grandTotal: o.grandTotal,
                items: o.items.map((item: any) => ({
                    id: item.id,
                    name: item.itemName,
                    qty: item.quantity,
                    price: item.price,
                    variant: item.selectedVariant,
                    modifiers: item.selectedModifiers,
                    notes: item.notes
                }))
            });

            // Improved Status Mapping
            switch (o.status) {
                case 'NEW': setStep(0); break;
                case 'PREPARING': setStep(1); break;
                case 'READY': setStep(2); break;
                case 'SERVED': setStep(4); break; // Move to the final 'Served' step
                case 'BILL_REQUESTED': setStep(4); break;
                case 'CLOSED':
                    // NUCLEAR SESSION CLEAR: Remove all hotelpro related data
                    localStorage.removeItem('hp_active_order_id');
                    localStorage.removeItem('hp_session_id');
                    localStorage.removeItem('hp_guest_name');
                    localStorage.removeItem('hp_table_id');
                    localStorage.removeItem('hp_table_code');

                    // Show a quick success signal then redirect
                    setStep(5); // New dummy state for success
                    setTimeout(() => {
                        router.replace('/welcome-guest');
                    }, 3000);
                    break;
                default: setStep(0);
            }

            setLoading(false);
        } catch (err) {
            console.error('[ORDER STATUS] Error:', err);
        }
    }, [orderId, router]);

    useEffect(() => {
        setMounted(true);
        if (!orderId) {
            const savedId = localStorage.getItem('hp_active_order_id');
            if (savedId) {
                router.replace(`/order-status?id=${savedId}`);
            } else {
                setLoading(false);
            }
            return;
        }

        fetchOrderStatus();
        const interval = setInterval(fetchOrderStatus, 5000);
        return () => clearInterval(interval);
    }, [orderId, fetchOrderStatus, router]);

    const handleRequestWaiter = () => {
        setIsRequesting(true);
        setIsWaiterPeeking(true);
        setTimeout(() => setIsRequesting(false), 2000);
    };

    if (!mounted) return null;

    if (!orderId && !loading) {
        return (
            <main className="min-h-screen bg-vellum flex flex-col items-center justify-center p-6 text-center">
                <h1 className="text-4xl font-playfair font-black text-[#D43425] mb-4">No Active Quest.</h1>
                <p className="text-xs font-bold uppercase tracking-widest opacity-40 mb-8">It seems you haven't placed an order yet.</p>
                <Link href="/menu" className="px-8 py-4 bg-black text-white rounded-full font-black text-xs uppercase tracking-widest">Explore Menu</Link>
            </main>
        );
    }

    if (loading) {
        return (
            <main className="min-h-screen bg-vellum flex flex-col items-center justify-center">
                <div className="w-8 h-8 border-4 border-zinc-200 border-t-[#D43425] rounded-full animate-spin" />
            </main>
        );
    }

    if (step === 5) {
        return (
            <main className="min-h-screen bg-[#3D2329] flex flex-col items-center justify-center p-6 text-center text-[#EFE7D9] animate-in fade-in duration-1000">
                <div className="w-32 h-32 mb-8 relative animate-bounce">
                    <Image src="/images/namaste_hands.png" alt="Thank You" fill sizes="128px" className="object-contain" />
                </div>
                <h1 className="text-5xl font-playfair font-black italic mb-4">Dhanyavad.</h1>
                <p className="text-xs font-black uppercase tracking-[0.4em] opacity-60">Payment Confirmed &bull; Journey Finalized</p>
                <div className="mt-12 w-12 h-px bg-[#D43425]" />
                <p className="mt-8 text-[10px] font-bold uppercase tracking-widest opacity-40">Redirecting to Sanctuary...</p>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-vellum text-black font-sans relative overflow-x-hidden pt-24 pb-32">
            {/* Elegant Header */}
            <header className="fixed top-0 w-full z-50 bg-[#3D2329]/95 backdrop-blur-md px-6 md:px-12 py-4 flex justify-between items-center border-b border-[#D43425]/20 shadow-xl">
                <div className="flex flex-col">
                    <div className="text-[#D43425] font-black text-xl tracking-tighter leading-none">HOTELPRO</div>
                    <p className="text-[#C9A227] text-[8px] uppercase font-bold tracking-[0.3em] mt-1">Order Fulfillment</p>
                </div>

                <div className="flex items-center gap-6">
                    <Link href="/menu?append=true" className="text-[9px] font-black uppercase tracking-widest text-[#EFE7D9] bg-[#D43425]/20 px-4 py-2 rounded-full border border-[#D43425]/30 hover:bg-[#D43425] transition-all">Add More Delicacies</Link>
                    <div className="w-px h-4 bg-[#EFE7D9]/20" />
                    <Link href="/home" className="text-[9px] font-black uppercase tracking-widest text-[#EFE7D9] hover:text-[#D43425] transition-colors">Home</Link>
                </div>
            </header>

            <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 md:gap-20 items-start">
                <div className="space-y-8 md:space-y-12 py-6 md:py-10">
                    <div className="space-y-3 md:space-y-4 text-center lg:text-left">
                        <span className="inline-block px-3 py-1 bg-[#D43425]/10 text-[#D43425] text-[8px] sm:text-[9px] font-black tracking-[0.4em] uppercase rounded-sm">
                            Status: {statusLabels[step].label}
                        </span>
                        <h1 className="text-3xl sm:text-4xl md:text-6xl font-playfair font-black text-ink leading-[1.1]">
                            Tracking Your <br />
                            <span className="italic text-[#D43425]">Culinary Quest</span>
                        </h1>
                    </div>

                    <div className="relative space-y-10 md:space-y-12 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-[2px] before:bg-ink/5">
                        {statusLabels.map((s, idx) => (
                            <div key={idx} className={`relative flex gap-6 sm:gap-10 transition-all duration-1000 ${idx <= step ? 'opacity-100' : 'opacity-20'}`}>
                                <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-700 z-10 ${idx === step ? 'bg-ink border-ink animate-pulse text-white shadow-lg' : idx < step ? 'bg-[#D43425] border-[#D43425] text-white' : 'bg-white/50 border-ink/10 text-ink/30'}`}>
                                    {idx < step ? (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
                                            <polyline points="20 6 9 17 4 12"></polyline>
                                        </svg>
                                    ) : (
                                        <span className="text-xs font-black">{idx + 1}</span>
                                    )}
                                </div>
                                <div className={`space-y-1 ${idx === step ? 'animate-ink-spread' : ''}`}>
                                    <h3 className={`text-lg sm:text-xl font-black uppercase tracking-widest font-playfair ${idx === step ? 'text-ink' : 'text-ink/60'}`}>{s.label}</h3>
                                    <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-ink/40 leading-relaxed italic max-w-xs">{s.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {order && (
                    <div className="lg:sticky lg:top-32">
                        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-ink/5 transform transition-all hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)]">
                            <div className="h-4 bg-[#3D2329] w-full" />

                            <div className="p-10 space-y-8">
                                <div className="flex justify-between items-start border-b border-ink/5 pb-8">
                                    <div className="space-y-1">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-ink/30">Confirmation Ticket</span>
                                        <p className="font-playfair font-black text-2xl text-ink uppercase">{order.id.slice(0, 8)}</p>
                                        <p className="text-[10px] uppercase font-bold text-[#C9A227] tracking-widest leading-none">Ref_Ledge_Verified</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="w-16 h-16 bg-[#D43425] rounded-full flex items-center justify-center text-[#EFE7D9] rotate-12 shadow-inner border-4 border-[#3D2329]/10">
                                            <span className="font-playfair italic text-xs font-black">HP</span>
                                        </div>
                                        <p className="text-[10px] font-black uppercase mt-2 opacity-30">Wax Seal</p>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="flex justify-between items-center bg-vellum/50 p-3 rounded-lg">
                                        <span className="text-xs font-black uppercase tracking-[0.2em] italic text-ink/60">Selected Plates</span>
                                        <span className="bg-ink text-[#EFE7D9] text-[9px] px-3 py-1 rounded-full font-black uppercase tracking-widest">{order.status}</span>
                                    </div>

                                    <div className="space-y-4 px-2 font-playfair">
                                        {order.items.map(item => (
                                            <div key={item.id} className="text-base flex flex-col pb-3 border-b border-dashed border-ink/5 last:border-0 last:pb-0">
                                                <div className="flex justify-between">
                                                    <span className="font-bold text-ink/70">{item.qty}x {item.name}</span>
                                                    <span className="font-black text-ink tabular-nums">₹{(item.price * item.qty).toLocaleString()}</span>
                                                </div>
                                                {/* Variants/Modifiers */}
                                                <div className="pl-6 text-[10px] text-ink/40 font-sans font-bold uppercase tracking-wider space-y-0.5 mt-1">
                                                    {item.variant && <div>{item.variant.name}</div>}
                                                    {item.modifiers?.map((m, midx) => (
                                                        <div key={midx}>+ {m.name}</div>
                                                    ))}
                                                    {item.notes && <div className="italic text-ink/30 mt-1 lowercase first-letter:uppercase">"{item.notes}"</div>}
                                                </div>
                                            </div>
                                        ))}

                                        <div className="pt-4 border-t border-ink/5 space-y-2 text-[10px] uppercase font-bold tracking-widest opacity-40">
                                            <div className="flex justify-between">
                                                <span>Sub-Total</span>
                                                <span>₹{order.subtotal.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>GST</span>
                                                <span>₹{order.gstAmount.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Imperial Service</span>
                                                <span>₹{order.serviceChargeAmount.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t-2 border-ink/10 flex justify-between items-baseline">
                                        <span className="text-sm font-black uppercase tracking-widest opacity-30">Total Value</span>
                                        <span className="text-3xl font-black text-[#D43425] tabular-nums">₹{order.grandTotal.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 space-y-4 px-10 pb-10">
                                <div className="grid grid-cols-2 gap-3">
                                    <Link
                                        href="/menu?append=true"
                                        className="flex items-center justify-center py-5 bg-white text-[#111111] rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-zinc-50 transition-all shadow-md border border-zinc-100"
                                    >
                                        + Add Extra
                                    </Link>
                                    <button
                                        onClick={handleRequestWaiter}
                                        className="py-5 bg-[#3D2329] text-[#EFE7D9] rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-[#D43425] transition-all shadow-md border border-[#D43425]/30"
                                    >
                                        {isRequesting ? "Summoning..." : "Call Waiter"}
                                    </button>
                                </div>

                                {['SERVED', 'READY'].includes(order.status) && (
                                    <button
                                        onClick={() => {
                                            const savedName = localStorage.getItem('hp_guest_name');
                                            if (!savedName) {
                                                setShowIdentityModal(true);
                                            } else {
                                                // Proceed directly
                                                setIsRequesting(true);
                                                fetch(`/api/orders/${order.id}`, {
                                                    method: 'PATCH',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ status: 'BILL_REQUESTED', version: order.version })
                                                }).then(res => {
                                                    if (res.ok) fetchOrderStatus();
                                                    setTimeout(() => setIsRequesting(false), 2000);
                                                });
                                            }
                                        }}
                                        className="w-full py-5 bg-[#D43425] text-white rounded-2xl font-black text-xs uppercase tracking-[0.4em] hover:bg-black transition-all transform active:scale-95 shadow-xl border border-white/10"
                                    >
                                        {isRequesting ? "Requesting..." : "Request Final Bill"}
                                    </button>
                                )}

                                <div className="flex items-center justify-center gap-3 py-4 opacity-30">
                                    <div className="h-px grow bg-ink" />
                                    <span className="text-[8px] font-black uppercase tracking-[0.5em]">Finis</span>
                                    <div className="h-px grow bg-ink" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-[#EFE7D9] p-6 flex items-center gap-4 mt-6 rounded-3xl border border-ink/5 shadow-inner">
                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg border border-[#D43425]/20">
                                <div className="text-[#D43425] font-black text-[10px]">
                                    {step < 4 ? "EST" : "✓"}
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink/70 leading-relaxed italic">
                                    {step < 2 ? "Chef is currently hand-crafting your selection." :
                                        step < 4 ? "Final plating and quality inspection in progress." :
                                            "Your journey is complete. We hope you enjoyed it."}
                                </p>
                                {step < 4 && (
                                    <span className="text-[8px] font-black text-[#D43425] uppercase tracking-widest mt-1">
                                        Arrival Prediction: ~{step === 0 ? '15-20' : step === 1 ? '8-12' : '3-5'} Minutes
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* MAGICAL WAITER */}
            <div className={`owl-container-fixed transition-all duration-1000 transform ${mounted ? 'translate-x-0 opacity-100' : 'translate-x-24 opacity-0'}`}>
                <div
                    className={`owl-interactive ${isWaiterPeeking ? 'owl-peek-visible' : 'owl-peek-hidden'} cursor-pointer group pr-1`}
                    onMouseEnter={() => setIsWaiterPeeking(true)}
                    onMouseLeave={() => setIsWaiterPeeking(false)}
                    onClick={() => setIsWaiterPeeking(!isWaiterPeeking)}
                >
                    <div className="relative flex flex-col items-end">
                        <div className={`mb-4 mr-10 bg-[#3D2329] text-[#EFE7D9] px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all duration-300 whitespace-nowrap shadow-2xl border border-[#D43425]/30 ${isWaiterPeeking ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`}>
                            {isRequesting ? "On my way, sir!" :
                                step === 0 ? "Your ticket is in good hands." :
                                    step === 1 ? "Chef is hand-selecting your herbs." :
                                        step === 2 ? "Final quality check incoming." :
                                            "Your journey is complete, enjoy!"}
                        </div>

                        <div className={`relative w-40 h-56 md:w-56 md:h-72 transition-all duration-500 transform origin-right ${isRequesting ? 'animate-owl-hop' : ''}`}>
                            <Image
                                src="/images/waiter.png"
                                alt="Service Concierge"
                                fill
                                priority
                                sizes="(max-width: 768px) 160px, 224px"
                                className="object-contain animate-float mix-blend-multiply brightness-110 contrast-125"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="h-32 md:h-40" />

            {/* Premium Navigation Dock */}
            <MobileNav />

            {/* IDENTITY MODAL FOR BILLING */}
            {showIdentityModal && (
                <div className="fixed inset-0 z-100 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-vellum w-full max-w-sm rounded-4xl p-8 shadow-2xl border border-[#D43425]/20 animate-in zoom-in-05 duration-300">
                        <div className="text-center mb-6">
                            <h2 className="text-3xl font-playfair font-black text-ink italic">The Final Touch</h2>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-[#D43425] mt-2">Who shall we address this bill to?</p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[8px] font-black uppercase tracking-widest opacity-40 mb-2 pl-2">Guest Name</label>
                                <input
                                    autoFocus
                                    type="text"
                                    value={guestNameInput}
                                    onChange={(e) => setGuestNameInput(e.target.value)}
                                    placeholder="Enter your name"
                                    className="w-full bg-white border border-ink/10 rounded-xl px-4 py-4 font-playfair font-bold text-lg outline-none focus:border-[#D43425] transition-colors"
                                />
                            </div>

                            <button
                                onClick={async () => {
                                    if (!guestNameInput.trim() || !order) return;
                                    setSubmittingIdentity(true);
                                    try {
                                        localStorage.setItem('hp_guest_name', guestNameInput);
                                        const res = await fetch(`/api/orders/${order.id}`, {
                                            method: 'PATCH',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                status: 'BILL_REQUESTED',
                                                customerName: guestNameInput,
                                                version: order.version
                                            })
                                        });
                                        if (res.ok) {
                                            setShowIdentityModal(false);
                                            fetchOrderStatus();
                                        }
                                    } catch (e) { console.error(e); }
                                    finally { setSubmittingIdentity(false); }
                                }}
                                disabled={submittingIdentity || !guestNameInput.trim()}
                                className="w-full py-5 bg-[#D43425] text-white rounded-xl font-black text-xs uppercase tracking-[0.3em] hover:bg-black transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {submittingIdentity ? 'Finalizing...' : 'Review Bill'}
                            </button>

                            <button
                                onClick={() => setShowIdentityModal(false)}
                                className="w-full py-3 text-[9px] font-bold uppercase tracking-widest opacity-40 hover:opacity-100"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}

export default function OrderStatus() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-vellum flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-[#D43425]/20 border-t-[#D43425] rounded-full animate-spin" />
            </div>
        }>
            <OrderStatusContent />
        </Suspense>
    );
}
