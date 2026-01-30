'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';

// ============================================
// Types
// ============================================

interface OrderItem {
    id: string;
    name: string;
    qty: number;
    price: number;
}

interface OrderData {
    id: string;
    status: string;
    total: number;
    items: OrderItem[];
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

    const statusLabels = [
        { label: 'Order Logged', description: 'Your selection is secured in our system.' },
        { label: 'Chef Preparing', description: 'Crafting your masterpieces with precision.' },
        { label: 'Quality Check', description: 'Ensuring every detail meets our standards.' },
        { label: 'Ready for Service', description: 'Your culinary journey is arriving shortly.' }
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

            const o = data.order;
            setOrder({
                id: o.id,
                status: o.status,
                total: o.total,
                items: o.items.map((item: any) => ({
                    id: item.id,
                    name: item.itemName,
                    qty: item.quantity,
                    price: item.price
                }))
            });

            // Status Mapping
            switch (o.status) {
                case 'NEW': setStep(0); break;
                case 'PREPARING': setStep(1); break;
                case 'READY': setStep(2); break;
                case 'SERVED': setStep(3); break;
                default: setStep(0);
            }

            setLoading(false);
        } catch (err) {
            console.error('[ORDER STATUS] Error:', err);
        }
    }, [orderId]);

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

    return (
        <main className="min-h-screen bg-vellum text-black font-sans relative overflow-x-hidden pt-24 pb-32">
            {/* Elegant Header */}
            <header className="fixed top-0 w-full z-50 bg-[#3D2329]/95 backdrop-blur-md px-6 md:px-12 py-4 flex justify-between items-center border-b border-[#D43425]/20 shadow-xl">
                <div className="flex flex-col">
                    <div className="text-[#D43425] font-black text-xl tracking-tighter leading-none">HOTELPRO</div>
                    <p className="text-[#C9A227] text-[8px] uppercase font-bold tracking-[0.3em] mt-1">Order Fulfillment</p>
                </div>

                <div className="flex items-center gap-6">
                    <Link href="/home" className="text-[9px] font-black uppercase tracking-widest text-[#EFE7D9] hover:text-[#D43425] transition-colors">Home</Link>
                    <div className="w-[1px] h-4 bg-[#EFE7D9]/20" />
                    <Link href="/menu" className="text-[9px] font-black uppercase tracking-widest text-[#EFE7D9] hover:text-[#D43425] transition-colors">Return to Ledger</Link>
                </div>
            </header>

            <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 md:gap-20 items-start">
                <div className="space-y-12 py-10">
                    <div className="space-y-4">
                        <span className="inline-block px-3 py-1 bg-[#D43425]/10 text-[#D43425] text-[9px] font-black tracking-[0.4em] uppercase rounded-sm">
                            Status: {statusLabels[step].label}
                        </span>
                        <h1 className="text-4xl md:text-6xl font-playfair font-black text-ink leading-[1.1]">
                            Tracking Your <br />
                            <span className="italic text-[#D43425]">Culinary Quest</span>
                        </h1>
                    </div>

                    <div className="relative space-y-12 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-[2px] before:bg-ink/5">
                        {statusLabels.map((s, idx) => (
                            <div key={idx} className={`relative flex gap-10 transition-all duration-1000 ${idx <= step ? 'opacity-100' : 'opacity-20'}`}>
                                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-700 z-10 ${idx === step ? 'bg-ink border-ink animate-pulse text-white shadow-[0_0_15px_rgba(0,0,0,0.2)]' : idx < step ? 'bg-[#D43425] border-[#D43425] text-white' : 'bg-white/50 border-ink/10 text-ink/30'}`}>
                                    {idx < step ? (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
                                            <polyline points="20 6 9 17 4 12"></polyline>
                                        </svg>
                                    ) : (
                                        <span className="text-xs font-black">{idx + 1}</span>
                                    )}
                                </div>
                                <div className={`space-y-1 ${idx === step ? 'animate-ink-spread' : ''}`}>
                                    <h3 className={`text-xl font-black uppercase tracking-widest font-playfair ${idx === step ? 'text-ink' : 'text-ink/60'}`}>{s.label}</h3>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-ink/40 leading-relaxed italic max-w-xs">{s.description}</p>
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
                                            <div key={item.id} className="flex justify-between text-base">
                                                <span className="font-bold text-ink/70">{item.qty}x {item.name}</span>
                                                <span className="font-black text-ink tabular-nums">₹{(item.price * item.qty).toLocaleString()}</span>
                                            </div>
                                        ))}
                                        <div className="pt-4 border-t border-ink/5 flex justify-between items-baseline">
                                            <span className="text-sm font-black uppercase tracking-widest opacity-30">Total Value</span>
                                            <span className="text-3xl font-black text-[#D43425] tabular-nums">₹{order.total.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-6 space-y-4">
                                    <button
                                        onClick={handleRequestWaiter}
                                        className="w-full py-5 bg-[#3D2329] text-[#EFE7D9] rounded-2xl font-black text-xs uppercase tracking-[0.4em] hover:bg-[#D43425] transition-all transform active:scale-95 shadow-xl group border border-[#D43425]/30"
                                    >
                                        {isRequesting ? "Summoning..." : "Request Waiter"}
                                    </button>

                                    <div className="flex items-center justify-center gap-3 py-4 opacity-30">
                                        <div className="h-px flex-grow bg-ink" />
                                        <span className="text-[8px] font-black uppercase tracking-[0.5em]">Finis</span>
                                        <div className="h-px flex-grow bg-ink" />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-[#EFE7D9] p-6 flex items-center gap-4 border-t border-ink/5">
                                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg border border-[#D43425]/20 animate-float">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D43425" strokeWidth="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                                </div>
                                <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink/70 leading-relaxed italic">
                                    Live order fulfillment tracking. Gratuity and imperial fees included in the ledger.
                                </p>
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
                                src="/images/avatars/master_waiter.png"
                                alt="Service Concierge"
                                fill
                                priority
                                className="object-contain animate-float mix-blend-multiply brightness-110 contrast-125"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Subtle Footer Decor */}
            <footer className="fixed bottom-0 w-full px-12 py-8 flex justify-between items-center pointer-events-none opacity-10">
                <p className="text-[9px] font-bold uppercase tracking-[0.4em]">AUTHENTIC HOSPITALITY INDEX</p>
                <div className="font-playfair italic text-xl">HotelPro Reserve</div>
            </footer>
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
