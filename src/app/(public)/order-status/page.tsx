'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function OrderStatus() {
    const [status, setStatus] = useState(0); // 0: Order Logged, 1: Preparing, 2: Quality Check, 3: Served
    const statusLabels = [
        { label: 'Order Logged', description: 'Your selection is secured in our system.' },
        { label: 'Chef Preparing', description: 'Chef is crafting your masterpieces with precision.' },
        { label: 'Quality Check', description: 'Ensuring every detail meets HotelPro standards.' },
        { label: 'Ready for Service', description: 'Your culinary journey is arriving shortly.' }
    ];

    useEffect(() => {
        const timer = setInterval(() => {
            setStatus((prev) => (prev < 3 ? prev + 1 : 3));
        }, 10000); // Advance every 10 seconds for demo purposes
        return () => clearInterval(timer);
    }, []);

    return (
        <main className="min-h-screen bg-[#EFE7D9] text-black font-sans relative flex flex-col items-center justify-center p-6 md:p-12">

            {/* Background Decor */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-5">
                <h1 className="text-[20rem] font-black italic absolute -bottom-20 -left-20">HP</h1>
            </div>

            <header className="absolute top-0 w-full p-8 flex justify-between items-center">
                <div className="text-[#D43425] font-black text-2xl tracking-tighter">HOTELPRO</div>
                <div className="flex items-center gap-4">
                    <Link href="/home" className="text-[10px] font-black uppercase tracking-widest hover:opacity-70">Home</Link>
                    <div className="w-1 h-1 bg-[#D43425] rounded-full" />
                    <Link href="/customer" className="text-[10px] font-black uppercase tracking-widest hover:opacity-70">Concierge</Link>
                </div>
            </header>

            <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">

                {/* Left: Tracker Visual */}
                <div className="space-y-12">
                    <div className="space-y-4 text-center lg:text-left">
                        <h2 className="text-[#D43425] text-xs font-black tracking-[0.6em] uppercase">Live Fulfillment</h2>
                        <h1 className="text-5xl md:text-7xl font-playfair font-black leading-none uppercase">Chef is on<br /><span className="italic text-[#D43425]">Standby</span></h1>
                    </div>

                    <div className="relative pl-12 space-y-12 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-[2px] before:bg-black/5">
                        {statusLabels.map((s, idx) => (
                            <div key={idx} className={`relative transition-all duration-1000 ${idx <= status ? 'opacity-100' : 'opacity-20 translate-x-4'}`}>
                                <div className={`absolute -left-12 w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${idx === status ? 'bg-[#D43425] border-[#D43425] animate-pulse text-white' : idx < status ? 'bg-black border-black text-white' : 'bg-transparent border-black/10'}`}>
                                    {idx < status ? (
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                    ) : (
                                        <span className="text-xs font-black">{idx + 1}</span>
                                    )}
                                </div>
                                <div>
                                    <h3 className={`text-xl font-black uppercase tracking-widest ${idx === status ? 'text-[#D43425]' : 'text-black'}`}>{s.label}</h3>
                                    <p className="text-[11px] font-bold uppercase tracking-wider opacity-40 mt-1">{s.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: Modern Dashboard Card */}
                <div className="bg-white rounded-[4rem] p-12 shadow-2xl space-y-10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#D43425]/5 rounded-bl-[4rem]" />

                    <div className="flex justify-between items-center border-b border-black/5 pb-8">
                        <div className="space-y-1">
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Ticket ID</span>
                            <p className="font-bold text-xl">HP-2026-08A</p>
                        </div>
                        <div className="text-right space-y-1">
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Estimate</span>
                            <p className="font-bold text-xl text-[#D43425]">12 MINS</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-black uppercase tracking-widest italic">Order Items</span>
                            <span className="bg-black text-white text-[9px] px-3 py-1 rounded-full font-black uppercase">Confirmed</span>
                        </div>
                        <div className="space-y-4">
                            <div className="flex justify-between text-sm">
                                <span className="font-bold opacity-60">1x Wagyu Tenderloin</span>
                                <span className="font-bold">₹6,800</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="font-bold opacity-60">1x Black Truffle Risotto</span>
                                <span className="font-bold">₹4,900</span>
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 space-y-4">
                        <button className="w-full py-5 bg-black text-white rounded-full font-black text-xs uppercase tracking-[0.4em] hover:bg-[#D43425] transition-all transform active:scale-95 shadow-xl">
                            Request Waiter
                        </button>
                        <button className="w-full text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity">
                            Change Payment Method
                        </button>
                    </div>

                    <div className="bg-[#EFE7D9]/50 p-6 rounded-[2.5rem] flex items-center gap-4">
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D43425" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                        </div>
                        <p className="text-[9px] font-bold uppercase tracking-wider leading-relaxed">
                            Your "Charge-to-Room" privilege is active via your Elite Identity.
                        </p>
                    </div>
                </div>

            </div>

            <footer className="absolute bottom-8 w-full px-12 flex justify-between items-end opacity-20">
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] max-w-xs leading-relaxed">
                    HotelPro Integrated Hospitality. Redefining the frequency of service.
                </p>
                <div className="font-playfair italic text-lg">Est. 2026</div>
            </footer>
        </main>
    );
}
